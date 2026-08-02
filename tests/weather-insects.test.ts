import { describe, expect, it } from 'vitest'
import {
  SAVE_VERSION,
  SIM,
  activePlant,
  apply,
  createInitialState,
  loadFromString,
  saveToString,
  tick,
  weatherAt,
  weatherPeriodMs,
} from '../src/sim'

const T0 = 1_700_000_000_000
const h = (n: number) => n * 3_600_000
const init = () => createInitialState(T0, 42)

/** Find the start of the first period with the wanted weather at/after `from`. */
function findPeriod(seed: number, from: number, wanted: 'sun' | 'clouds' | 'rain'): number {
  for (let t = from; t < from + h(24 * 30); t += weatherPeriodMs()) {
    if (weatherAt(seed, t) === wanted) return Math.floor(t / weatherPeriodMs()) * weatherPeriodMs()
  }
  throw new Error(`no ${wanted} period found in 30 days`)
}

describe('weather', () => {
  it('is deterministic for a given seed and varies over time', () => {
    const kinds = new Set<string>()
    for (let period = 0; period < 100; period++) {
      const t = T0 + period * weatherPeriodMs()
      expect(weatherAt(42, t)).toBe(weatherAt(42, t))
      kinds.add(weatherAt(42, t))
    }
    expect(kinds.size).toBe(3)
  })

  it('fills the rain barrel while it rains — also during offline catch-up', () => {
    const rainStart = findPeriod(42, T0, 'rain')
    const state = { ...init(), lastTickAt: rainStart, updatedAt: rainStart }
    const drained = { ...state, weather: { rainBarrel: 0 } }
    const after = tick(drained, rainStart + h(2))
    expect(after.weather.rainBarrel).toBeCloseTo(SIM.RAIN_FILL_PER_HOUR * 2, 5)
  })

  it('does not fill the barrel in dry weather', () => {
    const sunStart = findPeriod(42, T0, 'sun')
    const state = { ...init(), lastTickAt: sunStart, updatedAt: sunStart }
    const drained = { ...state, weather: { rainBarrel: 10 } }
    const after = tick(drained, sunStart + h(1))
    expect(after.weather.rainBarrel).toBe(10)
  })
})

describe('catching insects', () => {
  it('a fly feeds the trap and pays dewdrops', () => {
    const next = apply(
      init(),
      { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'fly' },
      T0,
    )
    const p = activePlant(next)!
    expect(p.nutrition).toBe(90)
    expect(p.traps[0].usesLeft).toBe(SIM.TRAP_USES - 1)
    expect(next.inventory.dewdrops).toBe(2 + SIM.ACHIEVEMENT_DEWDROPS) // + first-catch
    expect(next.achievements).toContain('first-catch')
  })

  it('a spider is a big bonus and unlocks its achievement', () => {
    const next = apply(
      init(),
      { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'spider' },
      T0,
    )
    expect(activePlant(next)!.nutrition).toBe(100)
    expect(next.achievements).toContain('spider-snack')
    expect(next.achievements).toContain('first-catch')
  })

  it('snapping at a beetle gives nothing, doubles digestion, and teaches a lesson', () => {
    const next = apply(
      init(),
      { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'beetle' },
      T0,
    )
    const trap = activePlant(next)!.traps[0]
    expect(activePlant(next)!.nutrition).toBe(60)
    expect(trap.usesLeft).toBe(SIM.TRAP_USES - 1)
    expect(trap.digestingUntil).toBe(T0 + h(SIM.DIGEST_HOURS * SIM.BEETLE_DIGEST_FACTOR))
    expect(next.achievements).toContain('beetle-lesson')
    expect(next.achievements).not.toContain('first-catch')
  })

  it('cannot catch with a digesting trap', () => {
    const fed = apply(
      init(),
      { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'fly' },
      T0,
    )
    const again = apply(
      fed,
      { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'fly' },
      T0 + h(1),
    )
    expect(activePlant(again)!.traps[0].usesLeft).toBe(SIM.TRAP_USES - 1)
  })
})

describe('achievements', () => {
  it('care on distinct days earns the green thumb', () => {
    let state = init()
    for (let day = 0; day < SIM.GREEN_THUMB_DAYS; day++) {
      state = apply(state, { type: 'tapWater' }, T0 + h(24 * day) + h(1))
    }
    expect(state.achievements).toContain('green-thumb')
    expect(state.careStreak.days).toBe(SIM.GREEN_THUMB_DAYS)
  })

  it('several care actions on the same day count once', () => {
    let state = init()
    state = apply(state, { type: 'tapWater' }, T0)
    state = apply(state, { type: 'feedTrap', plantId: 'p1', trapId: 't1' }, T0 + h(1))
    expect(state.careStreak.days).toBe(1)
  })

  it('recovering from wilt awards survivor', () => {
    let state = init()
    for (let day = 1; day <= 7; day++) state = tick(state, T0 + h(24 * day))
    expect(activePlant(state)!.wilted).toBe(true)
    let at = T0 + h(24 * 7)
    for (let day = 1; day <= 2; day++) {
      state = apply(state, { type: 'tapWater' }, at)
      at += h(24)
      state = tick(state, at)
    }
    expect(activePlant(state)!.wilted).toBe(false)
    expect(state.achievements).toContain('survivor')
  })

  it('growth milestones award stage achievements', () => {
    const state = init()
    const boosted = { ...state, plants: [{ ...state.plants[0], xp: 2100 }] }
    const next = tick(boosted, T0 + h(1))
    expect(next.achievements).toContain('stage-adult')
    expect(next.achievements).toContain('stage-mature')
  })

  it('achievements pay dewdrops exactly once', () => {
    let state = apply(
      init(),
      { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'fly' },
      T0,
    )
    const dewdrops = state.inventory.dewdrops
    state = tick(state, T0 + h(SIM.DIGEST_HOURS + 1))
    state = apply(
      state,
      { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'fly' },
      T0 + h(6),
    )
    expect(state.achievements.filter((a) => a === 'first-catch')).toHaveLength(1)
    expect(state.inventory.dewdrops).toBe(dewdrops + 2)
  })
})

describe('save migration v1 -> v2', () => {
  it('upgrades an old save with phase-2 defaults and keeps the plant', () => {
    const state = init()
    const v1 = JSON.parse(saveToString(state)) as Record<string, unknown>
    delete v1.weather
    delete v1.settings
    delete v1.careStreak
    v1.saveVersion = 1

    const loaded = loadFromString(JSON.stringify(v1))
    expect(loaded).not.toBeNull()
    expect(loaded!.saveVersion).toBe(SAVE_VERSION)
    expect(loaded!.weather.rainBarrel).toBe(60)
    expect(loaded!.settings.sound).toBe(true)
    expect(loaded!.careStreak).toEqual({ days: 0, lastDay: null })
    expect(loaded!.plants[0].nickname).toBe('Venus')
  })
})
