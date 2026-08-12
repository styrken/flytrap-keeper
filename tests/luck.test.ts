import { describe, expect, it } from 'vitest'
import {
  SIM,
  apply,
  createInitialState,
  loadFromString,
  luckLeft,
  saveToString,
  tick,
  weatherAt,
  weatherPeriodMs,
} from '../src/sim'
import type { GameState } from '../src/sim'

// 02:00 UTC, so a same-day sequence of greetings never crosses midnight.
const TQ = Date.UTC(2023, 10, 15, 2)
const h = (n: number) => n * 3_600_000

const init = (items: string[] = []): GameState => {
  const s = createInitialState(TQ, 42)
  return {
    ...s,
    quests: { ...s.quests, items: [], weekItems: [] },
    inventory: { ...s.inventory, items },
  }
}

describe('daily luck jars', () => {
  it('a fresh day starts with every jar full', () => {
    const state = init()
    expect(luckLeft(state, 'robin', TQ)).toBe(SIM.DAILY_LUCK.robin)
    expect(luckLeft(state, 'snail', TQ)).toBe(SIM.DAILY_LUCK.snail)
  })

  it('the robin pays until its jar is empty, then keeps singing for free', () => {
    let state = init(['bird-feeder'])
    for (let i = 0; i < SIM.DAILY_LUCK.robin; i++) {
      state = apply(state, { type: 'greetRobin' }, TQ + i * h(1))
    }
    expect(luckLeft(state, 'robin', TQ + h(5))).toBe(0)

    // one more greeting: no pay, but the hello itself still lands
    const before = tick(state, TQ + h(5))
    const extra = apply(before, { type: 'greetRobin' }, TQ + h(5))
    expect(extra.inventory.dewdrops).toBe(before.inventory.dewdrops)
    expect(extra.pets.lastRobinAt).toBe(TQ + h(5))

    // midnight refills the jar
    const nextDay = tick(extra, TQ + h(26))
    const paid = apply(nextDay, { type: 'greetRobin' }, TQ + h(26))
    expect(paid.inventory.dewdrops - nextDay.inventory.dewdrops).toBe(SIM.GUEST_DEWDROPS)
  })

  it('an empty jar still counts hellos toward the weekly greet quest', () => {
    const base = init(['bird-feeder'])
    let state: GameState = {
      ...base,
      quests: {
        ...base.quests,
        weekItems: [{ id: 'greetWeek', target: 10, progress: 0 }],
      },
    }
    const greets = SIM.DAILY_LUCK.robin + 2
    for (let i = 0; i < greets; i++) {
      state = apply(state, { type: 'greetRobin' }, TQ + i * h(1))
    }
    expect(state.quests.weekItems[0].progress).toBe(greets)
  })

  it('snail rescues pay from a five-charge jar', () => {
    let state = init()
    for (let i = 0; i <= SIM.DAILY_LUCK.snail; i++) {
      state = apply(state, { type: 'rescueSnail' }, TQ + i * h(0.5))
    }
    // the first rescue also pays the day's care bonus; the extra rescue pays 0
    expect(state.inventory.dewdrops).toBe(
      SIM.DAILY_CARE_DEWDROPS + SIM.DAILY_LUCK.snail * SIM.SNAIL_RESCUE_DEWDROPS,
    )
  })

  it('golden drops stop paying after the daily jar, and stars after theirs', () => {
    let rainy = TQ
    while (weatherAt(42, rainy) !== 'rain') rainy += weatherPeriodMs()
    let state: GameState = { ...init(), lastTickAt: rainy, updatedAt: rainy }
    const day = new Date(rainy).toISOString().slice(0, 10)
    for (let i = 0; i < SIM.DAILY_LUCK.raindrop + 2; i++) {
      state = apply(state, { type: 'catchRaindrop' }, rainy + i * 8_000)
    }
    // guard: the whole burst stayed inside one rain period and one UTC day
    expect(new Date(rainy + (SIM.DAILY_LUCK.raindrop + 1) * 8_000).toISOString().slice(0, 10)).toBe(
      day,
    )
    expect(state.inventory.dewdrops).toBe(SIM.DAILY_LUCK.raindrop * SIM.RAINDROP_DEWDROPS)

    let night = init()
    for (let i = 0; i < SIM.DAILY_LUCK.star + 2; i++) {
      night = apply(night, { type: 'wishOnStar' }, TQ + i * 15_000)
    }
    expect(night.inventory.dewdrops).toBe(
      SIM.DAILY_LUCK.star * SIM.STAR_WISH_DEWDROPS + SIM.ACHIEVEMENT_DEWDROPS,
    )
  })

  it('luckLeft counts down as the jar pays', () => {
    let state = init()
    expect(luckLeft(state, 'ladybird', TQ)).toBe(SIM.DAILY_LUCK.ladybird)
    state = apply(state, { type: 'greetLadybird' }, TQ)
    expect(luckLeft(state, 'ladybird', TQ)).toBe(SIM.DAILY_LUCK.ladybird - 1)
  })
})

describe('save migration v17 -> v18 (luck jars)', () => {
  it('older saves wake up with every jar full', () => {
    const v17 = JSON.parse(saveToString(init())) as Record<string, unknown>
    v17.saveVersion = 17
    delete v17.luck

    const loaded = loadFromString(JSON.stringify(v17))
    expect(loaded).not.toBeNull()
    expect(loaded!.luck.day).toBe('')
    expect(Object.values(loaded!.luck.paid).every((n) => n === 0)).toBe(true)
    expect(luckLeft(loaded!, 'snail', TQ)).toBe(SIM.DAILY_LUCK.snail)
  })
})
