import { describe, expect, it } from 'vitest'
import { SIM, apply, createInitialState, loadFromString, tick, toGameTime } from '../src/sim'

const T0 = 1_700_000_000_000
const h = (n: number) => n * 3_600_000
const min = (n: number) => n * 60_000

describe('speed mode', () => {
  it('setTimeScale re-anchors without moving the game clock', () => {
    const state = createInitialState(T0, 42)
    const fast = apply(state, { type: 'setTimeScale', scale: 60 }, T0 + min(5))
    expect(fast.time.scale).toBe(60)
    expect(toGameTime(fast.time, T0 + min(5))).toBe(toGameTime(state.time, T0 + min(5)))
  })

  it('rejects scales outside the presets', () => {
    const state = createInitialState(T0, 42)
    expect(apply(state, { type: 'setTimeScale', scale: 3 }, T0).time.scale).toBe(1)
    expect(apply(state, { type: 'setTimeScale', scale: -60 }, T0).time.scale).toBe(1)
  })

  it('one real minute at ×60 simulates exactly one real hour at ×1', () => {
    const base = createInitialState(T0, 42)
    const slow = tick(base, T0 + h(1))
    const fast = tick(apply(base, { type: 'setTimeScale', scale: 60 }, T0), T0 + min(1))
    expect(fast.plants[0]).toEqual(slow.plants[0])
    expect(fast.weather.rainBarrel).toBe(slow.weather.rainBarrel)
    expect(fast.lastTickAt).toBe(slow.lastTickAt)
  })

  it('keeps updatedAt on the wall clock while the sim runs on game time', () => {
    const state = apply(createInitialState(T0, 42), { type: 'setTimeScale', scale: 600 }, T0)
    const later = tick(state, T0 + min(1))
    expect(later.updatedAt).toBe(T0 + min(1))
    expect(later.lastTickAt).toBe(T0 + min(1) * 600)
  })

  it('caps offline catch-up in game hours, same as real time', () => {
    const state = apply(createInitialState(T0, 42), { type: 'setTimeScale', scale: 600 }, T0)
    // Two real hours away = 1200 game hours, but only the cap window simulates.
    const away = tick(state, T0 + h(2))
    expect(away.plants[0].water).toBeCloseTo(
      90 - SIM.WATER_DECAY_PER_HOUR * SIM.OFFLINE_CAP_HOURS,
      5,
    )
  })

  it('returning to real time keeps the head start the fast hours built up', () => {
    let state = apply(createInitialState(T0, 42), { type: 'setTimeScale', scale: 60 }, T0)
    state = tick(state, T0 + min(10))
    state = apply(state, { type: 'setTimeScale', scale: 1 }, T0 + min(10))
    // Ten fast minutes put the clock 10h ahead; real pace resumes from there.
    expect(toGameTime(state.time, T0 + min(20))).toBe(T0 + h(10) + min(10))
  })

  it('cooldowns run on the game clock', () => {
    const base = createInitialState(T0, 42)
    // Quests blanked so a completed pet quest can't sneak into the payout.
    const noQuests = { ...base, quests: { ...base.quests, items: [] } }
    let state = apply(noQuests, { type: 'setTimeScale', scale: 60 }, T0)
    state = apply(state, { type: 'pet' }, T0)
    const dewdropsAfterFirst = state.inventory.dewdrops
    // One real minute later the game clock has passed the 1h pet cooldown.
    const again = apply(state, { type: 'pet' }, T0 + min(1))
    expect(again.inventory.dewdrops).toBe(dewdropsAfterFirst + SIM.PET_DEWDROPS)
  })

  it('migrates v7 saves to a real-time clock anchored at lastTickAt', () => {
    const state = tick(createInitialState(T0, 42), T0 + h(5))
    const v7: Record<string, unknown> = { ...state, saveVersion: 7 }
    delete v7.time
    const loaded = loadFromString(JSON.stringify(v7))
    expect(loaded).not.toBeNull()
    expect(loaded!.time).toEqual({
      scale: 1,
      realAnchor: state.lastTickAt,
      gameAnchor: state.lastTickAt,
    })
  })
})
