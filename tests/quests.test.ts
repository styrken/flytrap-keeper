import { describe, expect, it } from 'vitest'
import {
  QUEST_DEFS,
  SIM,
  apply,
  createInitialState,
  createPlant,
  dayKey,
  drawQuests,
  loadFromString,
  saveToString,
  tick,
} from '../src/sim'
import type { GameState, QuestState } from '../src/sim'

const T0 = 1_700_000_000_000
// Progression tests need headroom before UTC midnight resets the quests.
const TQ = Date.UTC(2023, 10, 15, 2)
const h = (n: number) => n * 3_600_000

const withQuests = (items: QuestState[]): GameState => {
  const s = createInitialState(TQ, 42)
  return { ...s, quests: { day: dayKey(TQ), items } }
}

describe('daily quest draw', () => {
  it('is deterministic, distinct, and three per day', () => {
    const plants = createInitialState(T0, 42).plants
    const a = drawQuests(42, T0, plants)
    const b = drawQuests(42, T0, plants)
    expect(a).toEqual(b)
    expect(a.items).toHaveLength(3)
    expect(new Set(a.items.map((q) => q.id)).size).toBe(3)
    expect(a.day).toBe(dayKey(T0))
  })

  it('only offers misting when a tropical pitcher lives on the sill', () => {
    const flytrapOnly = createInitialState(T0, 42).plants
    for (let day = 0; day < 60; day++) {
      const drawn = drawQuests(42, T0 + h(24 * day), flytrapOnly)
      expect(drawn.items.some((q) => q.id === 'mist1')).toBe(false)
    }
    const withNepenthes = [...flytrapOnly, createPlant('p2', 'nepenthes', T0)]
    const seen = new Set<string>()
    for (let day = 0; day < 60; day++) {
      drawQuests(42, T0 + h(24 * day), withNepenthes).items.forEach((q) => seen.add(q.id))
    }
    expect(seen.has('mist1')).toBe(true)
  })

  it('rolls over to fresh quests on a new day', () => {
    const state = createInitialState(T0, 42)
    expect(state.quests.day).toBe(dayKey(T0))
    const nextDay = tick(state, T0 + h(24))
    expect(nextDay.quests.day).toBe(dayKey(T0 + h(24)))
    expect(nextDay.quests.items.every((q) => q.progress === 0)).toBe(true)
  })
})

describe('quest progression and rewards', () => {
  it('pays per completed quest and a bonus for the full set', () => {
    let state = withQuests([
      { id: 'water2', target: 2, progress: 0 },
      { id: 'pour1', target: 1, progress: 0 },
      { id: 'pet2', target: 2, progress: 0 },
    ])

    // perfect pour: water2 1/2 and pour1 done
    state = apply(state, { type: 'water', perfect: true }, TQ)
    let expected = SIM.DAILY_CARE_DEWDROPS + SIM.POUR_PERFECT_DEWDROPS + SIM.QUEST_DEWDROPS
    expect(state.inventory.dewdrops).toBe(expected)

    // two rewarded pets: pet2 done
    state = apply(state, { type: 'pet' }, TQ)
    state = apply(state, { type: 'pet' }, TQ + h(SIM.PET_COOLDOWN_HOURS + 0.1))
    expected += SIM.PET_DEWDROPS * 2 + SIM.QUEST_DEWDROPS
    expect(state.inventory.dewdrops).toBe(expected)

    // second watering completes water2 -> quest pay + all-done bonus
    state = apply(state, { type: 'tapWater' }, TQ + h(2))
    expected += SIM.QUEST_DEWDROPS + SIM.QUEST_ALL_BONUS
    expect(state.inventory.dewdrops).toBe(expected)
    expect(state.quests.items.every((q) => q.progress >= q.target)).toBe(true)
  })

  it('never pays past the target', () => {
    let state = withQuests([{ id: 'water2', target: 2, progress: 2 }])
    const before = state.inventory.dewdrops
    state = apply(state, { type: 'tapWater' }, TQ)
    expect(state.inventory.dewdrops).toBe(before + SIM.DAILY_CARE_DEWDROPS)
    expect(state.quests.items[0].progress).toBe(2)
  })

  it('catching insects advances the catch quest (beetles do not)', () => {
    let state = withQuests([{ id: 'catch2', target: 2, progress: 0 }])
    state = apply(state, { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'beetle' }, TQ)
    expect(state.quests.items[0].progress).toBe(0)
    state = tick(state, TQ + h(SIM.DIGEST_HOURS * SIM.BEETLE_DIGEST_FACTOR + 1))
    state = apply(
      state,
      { type: 'catchInsect', plantId: 'p1', trapId: state.plants[0].traps[0].id, insect: 'fly' },
      TQ + h(SIM.DIGEST_HOURS * SIM.BEETLE_DIGEST_FACTOR + 1),
    )
    expect(state.quests.items[0].progress).toBe(1)
  })
})

describe('the catch quest fits the garden', () => {
  const drawnCatchQuest = (plants: GameState['plants']) => {
    for (let day = 0; day < 90; day++) {
      const quest = drawQuests(42, T0 + h(24 * day), plants).items.find((q) => q.id === 'catch2')
      if (quest) return quest
    }
    return null
  }

  it('caps the target at the snapper trap count — a one-trap sprout gets "catch 1"', () => {
    const sprout = createInitialState(T0, 42).plants
    expect(sprout[0].traps).toHaveLength(1)
    const quest = drawnCatchQuest(sprout)
    expect(quest).not.toBeNull()
    expect(quest!.target).toBe(1)
  })

  it('asks for the full two once the plant has traps to spare', () => {
    const plant = createPlant('p1', 'dionaea', T0)
    plant.traps = [
      { id: 't1', usesLeft: 3, digestingUntil: null, witheredAt: null },
      { id: 't2', usesLeft: 3, digestingUntil: null, witheredAt: null },
    ]
    const quest = drawnCatchQuest([plant])
    expect(quest).not.toBeNull()
    expect(quest!.target).toBe(QUEST_DEFS.catch2)
  })

  it('never offers catching while every snapper sleeps or is gone', () => {
    const dormant = { ...createPlant('p1', 'dionaea', T0), dormant: true }
    const dead = { ...createPlant('p2', 'dionaea', T0), dead: true }
    for (let day = 0; day < 90; day++) {
      const items = drawQuests(42, T0 + h(24 * day), [dormant, dead]).items
      expect(items.some((q) => q.id === 'catch2')).toBe(false)
    }
  })
})

describe('save migration v6 -> v7', () => {
  it('adds an empty quest slate that the next tick fills', () => {
    const state = createInitialState(T0, 42)
    const v6 = JSON.parse(saveToString(state)) as Record<string, unknown>
    delete v6.quests
    v6.saveVersion = 6

    const loaded = loadFromString(JSON.stringify(v6))
    expect(loaded).not.toBeNull()
    expect(loaded!.quests).toEqual({ day: '', items: [] })
    const ticked = tick(loaded!, T0 + 60_000)
    expect(ticked.quests.items).toHaveLength(3)
    expect(ticked.quests.day).toBe(dayKey(T0))
  })
})
