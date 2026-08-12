import { describe, expect, it } from 'vitest'
import {
  SIM,
  activePlant,
  apply,
  createInitialState,
  loadFromString,
  remember,
  saveToString,
  tick,
} from '../src/sim'
import type { GameState, JournalKind } from '../src/sim'

const T0 = 1_700_000_000_000
const h = (n: number) => n * 3_600_000

const init = (dewdrops = 0, items: string[] = []): GameState => {
  const s = createInitialState(T0, 42)
  return {
    ...s,
    quests: { ...s.quests, items: [] },
    inventory: { dewdrops, items, packs: { fly: 0, mosquito: 0, moth: 0, spider: 0 } },
  }
}

const kinds = (state: GameState): JournalKind[] =>
  activePlant(state)!.journal.map((entry) => entry.kind)

describe('the plant diary', () => {
  it('opens with the planting', () => {
    const plant = activePlant(init())!
    expect(plant.journal).toEqual([{ at: T0, kind: 'planted' }])
  })

  it('remembers the first catch exactly once', () => {
    let state = apply(
      init(),
      { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'fly' },
      T0,
    )
    expect(kinds(state)).toContain('firstCatch')

    state = tick(state, T0 + h(SIM.DIGEST_HOURS + 1))
    state = apply(
      state,
      { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'fly' },
      T0 + h(SIM.DIGEST_HOURS + 1),
    )
    expect(kinds(state).filter((k) => k === 'firstCatch')).toHaveLength(1)
  })

  it('notes growth stages as they arrive', () => {
    const boosted: GameState = {
      ...init(),
      plants: [{ ...init().plants[0], xp: 950 }],
    }
    const grown = tick(boosted, T0 + h(1))
    const stages = activePlant(grown)!.journal.filter((e) => e.kind === 'stage')
    expect(stages.length).toBeGreaterThanOrEqual(1)
    expect(stages[stages.length - 1].stage).toBe(2)
  })

  it('tells the whole wilt-and-recovery story', () => {
    let state = init()
    for (let day = 1; day <= 7; day++) state = tick(state, T0 + h(24 * day))
    expect(kinds(state)).toContain('wilted')

    let at = T0 + h(24 * 7)
    for (let day = 1; day <= 2; day++) {
      state = apply(state, { type: 'tapWater' }, at)
      at += h(24)
      state = tick(state, at)
    }
    expect(kinds(state)).toContain('recovered')
  })

  it('records the stalk, the cut, the sleep and the waking', () => {
    // stalk + cut
    let state: GameState = {
      ...init(),
      plants: [
        {
          ...init().plants[0],
          xp: SIM.FLOWER_XP + 100,
          stage: 3,
          health: 100,
          water: 100,
        },
      ],
    }
    state = tick(state, T0 + h(1))
    expect(kinds(state)).toContain('stalk')
    state = apply(state, { type: 'cutFlower' }, T0 + h(2))
    expect(kinds(state)).toContain('cut')

    // sleep + wake (T0 is November — winter is December, so use January)
    const JANUARY = Date.UTC(2024, 0, 10, 12)
    let winter = tick(init(), JANUARY)
    winter = apply(winter, { type: 'setDormant', on: true }, JANUARY)
    expect(kinds(winter)).toContain('sleep')
    winter = apply(winter, { type: 'setDormant', on: false }, JANUARY + h(1))
    expect(kinds(winter)).toContain('wake')
  })

  it('records the bloom when it completes', () => {
    const blooming: GameState = {
      ...init(),
      plants: [
        {
          ...init().plants[0],
          flowering: { startedAt: T0 - SIM.BLOOM_HOURS * h(1) - h(1), blooming: true },
        },
      ],
    }
    const done = tick(blooming, T0 + h(1))
    expect(kinds(done)).toContain('bloomed')
    expect(activePlant(done)!.flowering).toBeNull()
  })

  it('records repotting and dressing up', () => {
    let state = apply(init(100), { type: 'buy', item: 'pot-blue' }, T0)
    expect(kinds(state)).toContain('repot')
    state = apply(state, { type: 'buy', item: 'googly-eyes' }, T0)
    expect(kinds(state)).toContain('dressed')
  })

  it('keeps only the newest pages once the cap is reached', () => {
    let plant = activePlant(init())!
    for (let i = 0; i < SIM.JOURNAL_MAX_ENTRIES + 10; i++) {
      plant = remember(plant, 'repot', T0 + i * 1000)
    }
    expect(plant.journal).toHaveLength(SIM.JOURNAL_MAX_ENTRIES)
    expect(plant.journal[plant.journal.length - 1].at).toBe(
      T0 + (SIM.JOURNAL_MAX_ENTRIES + 9) * 1000,
    )
  })
})

describe('save migration v12 -> v13 (diary)', () => {
  it('starts existing plants on a fresh first page', () => {
    const state = init()
    const v12 = JSON.parse(saveToString(state)) as Record<string, unknown>
    v12.saveVersion = 12
    const plants = v12.plants as Record<string, unknown>[]
    delete plants[0].journal

    const loaded = loadFromString(JSON.stringify(v12))
    expect(loaded).not.toBeNull()
    expect(loaded!.plants[0].journal).toEqual([{ at: loaded!.lastTickAt, kind: 'firstPage' }])
  })
})
