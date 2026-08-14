import { describe, expect, it } from 'vitest'
import {
  type GameState,
  SIM,
  apply,
  createInitialState,
  snowmanStage,
  winterKeyAt,
} from '../src/sim'

const WINTER = Date.UTC(2026, 0, 10, 12) // January 2026 — winter 2025
const NEXT_WINTER = Date.UTC(2026, 11, 20, 12) // December 2026 — winter 2026
const SUMMER = Date.UTC(2026, 6, 10, 12)

const init = (at: number): GameState => {
  const s = createInitialState(at, 42)
  return {
    ...s,
    quests: { ...s.quests, items: [], weekItems: [] },
    // The year-long tick between winters rains the barrel full — pre-earn its
    // achievement so the dewdrop arithmetic only sees the snowman.
    achievements: ['rain-collector'],
  }
}

describe('the winter key', () => {
  it('names a winter after the year of its December', () => {
    expect(winterKeyAt(Date.UTC(2026, 11, 5))).toBe(2026)
    expect(winterKeyAt(Date.UTC(2027, 0, 5))).toBe(2026)
    expect(winterKeyAt(Date.UTC(2027, 1, 25))).toBe(2026)
  })
})

describe('the garden snowman', () => {
  it('builds up in three taps and pays once when the head goes on', () => {
    let s = init(WINTER)
    const before = s.inventory.dewdrops

    s = apply(s, { type: 'buildSnowman' }, WINTER)
    expect(snowmanStage(s, WINTER)).toBe(1)
    expect(s.inventory.dewdrops).toBe(before) // nothing yet — keep packing

    s = apply(s, { type: 'buildSnowman' }, WINTER)
    s = apply(s, { type: 'buildSnowman' }, WINTER)
    expect(snowmanStage(s, WINTER)).toBe(SIM.SNOWMAN_STAGES)
    expect(s.achievements).toContain('snowman')
    expect(s.inventory.dewdrops).toBe(before + SIM.SNOWMAN_DEWDROPS + SIM.ACHIEVEMENT_DEWDROPS)

    // A finished snowman is finished — extra taps change nothing.
    expect(apply(s, { type: 'buildSnowman' }, WINTER)).toBe(s)
  })

  it('cannot be built without snow on the lawn', () => {
    const s = init(SUMMER)
    expect(apply(s, { type: 'buildSnowman' }, SUMMER)).toBe(s)
  })

  it('melts with the spring — the selector reports an empty lawn', () => {
    let s = init(WINTER)
    s = apply(s, { type: 'buildSnowman' }, WINTER)
    const spring = Date.UTC(2026, 3, 10)
    expect(snowmanStage(s, spring)).toBe(0)
  })

  it('each winter builds its own snowman; the achievement stays earned', () => {
    let s = init(WINTER)
    s = apply(s, { type: 'buildSnowman' }, WINTER)
    s = apply(s, { type: 'buildSnowman' }, WINTER)
    s = apply(s, { type: 'buildSnowman' }, WINTER)
    const afterFirst = s.inventory.dewdrops

    // Next winter: last year's snowman is gone, and building starts over.
    expect(snowmanStage(s, NEXT_WINTER)).toBe(0)
    s = apply(s, { type: 'buildSnowman' }, NEXT_WINTER)
    expect(snowmanStage(s, NEXT_WINTER)).toBe(1)
    s = apply(s, { type: 'buildSnowman' }, NEXT_WINTER)
    s = apply(s, { type: 'buildSnowman' }, NEXT_WINTER)
    // The completion payout repeats; the achievement bonus does not.
    expect(s.inventory.dewdrops).toBe(afterFirst + SIM.SNOWMAN_DEWDROPS)
    expect(s.achievements.filter((a) => a === 'snowman')).toHaveLength(1)
  })
})
