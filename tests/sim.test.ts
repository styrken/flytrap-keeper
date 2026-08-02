import { describe, expect, it } from 'vitest'
import {
  SIM,
  activePlant,
  apply,
  createInitialState,
  isTrapReady,
  mulberry32,
  tick,
} from '../src/sim'

const T0 = 1_700_000_000_000
const h = (n: number) => n * 3_600_000
const init = () => createInitialState(T0, 42)

const plantAt = (state = init(), at = T0) => {
  const p = activePlant(tick(state, at))
  if (!p) throw new Error('no plant')
  return p
}

describe('seeded rng', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      const value = a()
      expect(value).toBe(b())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('needs decay', () => {
  it('drains water and nutrition at configured hourly rates', () => {
    const p = plantAt(init(), T0 + h(10))
    expect(p.water).toBeCloseTo(90 - SIM.WATER_DECAY_PER_HOUR * 10, 5)
    expect(p.nutrition).toBeCloseTo(60 - SIM.NUTRITION_DECAY_PER_HOUR * 10, 5)
  })

  it('caps offline simulation: 100 hours away equals 36 hours away', () => {
    const away100 = tick(init(), T0 + h(100))
    const away36 = tick(init(), T0 + h(36))
    expect(away100.plants).toEqual(away36.plants)
  })

  it('resyncs without simulating when the clock goes backwards', () => {
    const state = init()
    const back = tick(state, T0 - h(1))
    expect(back.lastTickAt).toBe(T0 - h(1))
    expect(back.plants).toEqual(state.plants)
  })
})

describe('watering', () => {
  it('fills water to 100 and pays from the rain barrel', () => {
    const next = apply(init(), { type: 'water' }, T0)
    expect(activePlant(next)?.water).toBe(100)
    expect(next.weather.rainBarrel).toBe(SIM.BARREL_INITIAL - SIM.WATER_COST)
  })

  it('is a no-op when already full', () => {
    const full = apply(init(), { type: 'water' }, T0)
    expect(apply(full, { type: 'water' }, T0)).toBe(full)
  })

  it('is rejected when the barrel is too low', () => {
    const state = init()
    const dry = { ...state, weather: { ...state.weather, rainBarrel: SIM.WATER_COST - 1 } }
    expect(apply(dry, { type: 'water' }, T0)).toBe(dry)
  })

  it('tap water always works but costs health', () => {
    const state = init()
    const dry = { ...state, weather: { ...state.weather, rainBarrel: 0 } }
    const next = apply(dry, { type: 'tapWater' }, T0)
    const p = activePlant(next)!
    expect(p.water).toBe(100)
    expect(p.health).toBe(100 - SIM.TAP_WATER_HEALTH_PENALTY)
    expect(next.weather.rainBarrel).toBe(0)
  })
})

describe('feeding and trap wear', () => {
  it('feeds a ready trap: nutrition up, one use spent, digestion started', () => {
    const next = apply(init(), { type: 'feedTrap', trapId: 't1' }, T0)
    const p = activePlant(next)!
    expect(p.nutrition).toBe(60 + SIM.HAND_FEED_NUTRITION)
    expect(p.traps[0].usesLeft).toBe(SIM.TRAP_USES - 1)
    expect(p.traps[0].digestingUntil).toBe(T0 + h(SIM.DIGEST_HOURS))
  })

  it('rejects feeding a digesting trap', () => {
    const fed = apply(init(), { type: 'feedTrap', trapId: 't1' }, T0)
    const again = apply(fed, { type: 'feedTrap', trapId: 't1' }, T0 + h(1))
    const p = activePlant(again)!
    expect(p.traps[0].usesLeft).toBe(SIM.TRAP_USES - 1)
  })

  it('reopens after digestion', () => {
    const fed = apply(init(), { type: 'feedTrap', trapId: 't1' }, T0)
    const later = tick(fed, T0 + h(SIM.DIGEST_HOURS + 1))
    const trap = activePlant(later)!.traps[0]
    expect(trap.digestingUntil).toBeNull()
    expect(trap.witheredAt).toBeNull()
    expect(isTrapReady(trap, T0 + h(SIM.DIGEST_HOURS + 1))).toBe(true)
  })

  it('withers after all uses and regrows as a fresh trap', () => {
    let state = init()
    let at = T0
    for (let use = 0; use < SIM.TRAP_USES; use++) {
      const trapId = activePlant(state)!.traps[0].id
      state = apply(state, { type: 'feedTrap', trapId }, at)
      at += h(SIM.DIGEST_HOURS + 1)
      state = apply(state, { type: 'water' }, at)
    }
    const withered = activePlant(state)!.traps[0]
    expect(withered.witheredAt).not.toBeNull()
    expect(isTrapReady(withered, at)).toBe(false)

    at += h(SIM.TRAP_REGROW_HOURS + 1)
    state = tick(state, at)
    const regrown = activePlant(state)!.traps[0]
    expect(regrown.id).not.toBe(withered.id)
    expect(regrown.usesLeft).toBe(SIM.TRAP_USES)
    expect(isTrapReady(regrown, at)).toBe(true)
  })
})

describe('placement and light', () => {
  it('moves the plant and slows growth in the north window', () => {
    const south = tick(init(), T0 + h(10))
    const moved = apply(init(), { type: 'move', placement: 'north-window' }, T0)
    const north = tick(moved, T0 + h(10))
    expect(activePlant(moved)?.placement).toBe('north-window')
    expect(activePlant(north)!.xp).toBeLessThan(activePlant(south)!.xp)
    expect(activePlant(north)!.xp).toBeGreaterThan(0)
  })
})

describe('wilting and recovery', () => {
  const neglect = (days: number) => {
    let state = init()
    for (let day = 1; day <= days; day++) state = tick(state, T0 + h(24 * day))
    return state
  }

  it('a neglected plant wilts but never dies — health floors above zero', () => {
    const state = neglect(7)
    const p = activePlant(state)!
    expect(p.water).toBe(0)
    expect(p.wilted).toBe(true)
    expect(p.health).toBe(SIM.HEALTH_MIN)
  })

  it('stops growing while wilted', () => {
    const wiltedState = neglect(7)
    const xpBefore = activePlant(wiltedState)!.xp
    const later = tick(wiltedState, T0 + h(24 * 7 + 10))
    expect(activePlant(later)!.xp).toBe(xpBefore)
  })

  it('care always brings a wilted plant back', () => {
    let state = neglect(7)
    let at = T0 + h(24 * 7)
    for (let day = 1; day <= 2; day++) {
      state = apply(state, { type: 'water' }, at)
      at += h(24)
      state = tick(state, at)
    }
    const p = activePlant(state)!
    expect(p.wilted).toBe(false)
    expect(p.health).toBeGreaterThan(SIM.RECOVER_AT)
  })
})

describe('renaming', () => {
  it('sets a trimmed nickname', () => {
    const next = apply(init(), { type: 'rename', nickname: '  Audrey II  ' }, T0)
    expect(activePlant(next)?.nickname).toBe('Audrey II')
  })

  it('rejects empty and whitespace-only names', () => {
    const state = init()
    expect(apply(state, { type: 'rename', nickname: '   ' }, T0)).toBe(state)
    expect(apply(state, { type: 'rename', nickname: '' }, T0)).toBe(state)
  })

  it('clamps names to the max length', () => {
    const next = apply(init(), { type: 'rename', nickname: 'A'.repeat(50) }, T0)
    expect(activePlant(next)?.nickname).toHaveLength(SIM.NICKNAME_MAX_LENGTH)
  })

  it('is a no-op when the name is unchanged', () => {
    const state = init()
    expect(apply(state, { type: 'rename', nickname: 'Venus' }, T0)).toBe(state)
  })
})

describe('growth stages', () => {
  it('advancing past a threshold raises the stage and grows new traps', () => {
    const state = init()
    const boosted = {
      ...state,
      plants: [{ ...state.plants[0], xp: 950 }],
    }
    const next = tick(boosted, T0 + h(1))
    const p = activePlant(next)!
    expect(p.stage).toBe(2)
    expect(p.traps.length).toBe(3)
  })
})
