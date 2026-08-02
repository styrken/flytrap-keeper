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
import type { GameState } from '../src/sim'

const T0 = 1_700_000_000_000
const h = (n: number) => n * 3_600_000
const init = (): GameState => {
  const s = createInitialState(T0, 42)
  return { ...s, quests: { ...s.quests, items: [] } }
}

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
    // Diary pages carry the replay-window timestamps, so they differ by
    // design; the cap is about the plants' state being identical.
    const stripJournal = (plants: typeof away100.plants) =>
      plants.map((plant) => ({ ...plant, journal: [] }))
    expect(stripJournal(away100.plants)).toEqual(stripJournal(away36.plants))
    expect(away100.plants[0].journal.map((e) => e.kind)).toEqual(
      away36.plants[0].journal.map((e) => e.kind),
    )
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
    const next = apply(init(), { type: 'feedTrap', plantId: 'p1', trapId: 't1' }, T0)
    const p = activePlant(next)!
    expect(p.nutrition).toBe(60 + SIM.HAND_FEED_NUTRITION)
    expect(p.traps[0].usesLeft).toBe(SIM.TRAP_USES - 1)
    expect(p.traps[0].digestingUntil).toBe(T0 + h(SIM.DIGEST_HOURS))
  })

  it('rejects feeding a digesting trap', () => {
    const fed = apply(init(), { type: 'feedTrap', plantId: 'p1', trapId: 't1' }, T0)
    const again = apply(fed, { type: 'feedTrap', plantId: 'p1', trapId: 't1' }, T0 + h(1))
    const p = activePlant(again)!
    expect(p.traps[0].usesLeft).toBe(SIM.TRAP_USES - 1)
  })

  it('reopens after digestion', () => {
    const fed = apply(init(), { type: 'feedTrap', plantId: 'p1', trapId: 't1' }, T0)
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
      state = apply(state, { type: 'feedTrap', plantId: 'p1', trapId }, at)
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

describe('weeds', () => {
  it('sprouts after a while, pays when pulled, and respawns later', async () => {
    const { hasWeed } = await import('../src/sim')
    const state = init()
    expect(hasWeed(activePlant(state)!, T0)).toBe(false)
    const sprouted = T0 + h(SIM.WEED_FIRST_HOURS)
    expect(hasWeed(activePlant(state)!, sprouted)).toBe(true)

    const pulled = apply(state, { type: 'pullWeed', plantId: 'p1' }, sprouted)
    expect(pulled.inventory.dewdrops).toBe(SIM.WEED_DEWDROPS + SIM.DAILY_CARE_DEWDROPS)
    expect(hasWeed(activePlant(pulled)!, sprouted)).toBe(false)
    expect(hasWeed(activePlant(pulled)!, sprouted + h(SIM.WEED_RESPAWN_HOURS))).toBe(true)

    // pulling thin air does nothing
    const early = apply(init(), { type: 'pullWeed', plantId: 'p1' }, T0)
    expect(early.inventory.dewdrops).toBe(0)
  })
})

describe('daily care bonus', () => {
  it('pays once per distinct day of care', () => {
    let state = apply(init(), { type: 'tapWater' }, T0)
    expect(state.inventory.dewdrops).toBe(SIM.DAILY_CARE_DEWDROPS)
    state = tick(state, T0 + h(20))
    state = apply(state, { type: 'tapWater' }, T0 + h(20))
    // T0 is late evening UTC, +20h is the next day: a second bonus. The 20 rainy
    // hours also fill the barrel to the brim (seed 42), awarding rain-collector.
    expect(state.achievements).toContain('rain-collector')
    expect(state.careStreak.days).toBe(2)
    expect(state.inventory.dewdrops).toBe(SIM.DAILY_CARE_DEWDROPS * 2 + SIM.ACHIEVEMENT_DEWDROPS)
  })
})

describe('minigames', () => {
  it('a perfect pour pays a bonus on top of watering', () => {
    const perfect = apply(init(), { type: 'water', perfect: true }, T0)
    expect(activePlant(perfect)?.water).toBe(100)
    expect(perfect.inventory.dewdrops).toBe(SIM.POUR_PERFECT_DEWDROPS + SIM.DAILY_CARE_DEWDROPS)

    const plain = apply(init(), { type: 'water' }, T0)
    expect(plain.inventory.dewdrops).toBe(SIM.DAILY_CARE_DEWDROPS)
  })

  it('golden raindrops only fall in the rain, with a cooldown', async () => {
    const { weatherAt, weatherPeriodMs } = await import('../src/sim')
    const findPeriod = (wanted: string) => {
      for (let t = T0; t < T0 + h(24 * 30); t += weatherPeriodMs()) {
        if (weatherAt(42, t) === wanted) return t
      }
      throw new Error('period not found')
    }

    const sunny = findPeriod('sun')
    const dry = { ...init(), lastTickAt: sunny, updatedAt: sunny }
    expect(apply(dry, { type: 'catchRaindrop' }, sunny)).toBe(dry)

    const rainy = findPeriod('rain')
    const wet = { ...init(), lastTickAt: rainy, updatedAt: rainy }
    const caught = apply(wet, { type: 'catchRaindrop' }, rainy)
    expect(caught.inventory.dewdrops).toBe(SIM.RAINDROP_DEWDROPS)
    expect(caught.minigames.lastRaindropAt).toBe(rainy)

    const tooSoon = apply(caught, { type: 'catchRaindrop' }, rainy + 3000)
    expect(tooSoon.inventory.dewdrops).toBe(SIM.RAINDROP_DEWDROPS)
    const later = apply(caught, { type: 'catchRaindrop' }, rainy + 9000)
    expect(later.inventory.dewdrops).toBe(SIM.RAINDROP_DEWDROPS * 2)
  })
})

describe('petting', () => {
  it('pays a dewdrop at most once per cooldown', () => {
    let state = apply(init(), { type: 'pet' }, T0)
    expect(state.inventory.dewdrops).toBe(SIM.PET_DEWDROPS)
    expect(activePlant(state)!.lastPetAt).toBe(T0)

    const tooSoon = apply(state, { type: 'pet' }, T0 + h(0.5))
    expect(tooSoon.inventory.dewdrops).toBe(SIM.PET_DEWDROPS)
    expect(activePlant(tooSoon)!.lastPetAt).toBe(T0)

    state = apply(state, { type: 'pet' }, T0 + h(SIM.PET_COOLDOWN_HOURS + 0.1))
    expect(state.inventory.dewdrops).toBe(SIM.PET_DEWDROPS * 2)
  })
})

describe('status helpers', () => {
  it('reports when the next digesting trap reopens and estimates growth', async () => {
    const { msToNextStage, nextTrapOpenAt, xpRatePerHour } = await import('../src/sim')
    const fresh = activePlant(init())!
    expect(nextTrapOpenAt(fresh)).toBeNull()
    expect(xpRatePerHour(fresh)).toBeGreaterThan(0)
    expect(msToNextStage(fresh)).toBeGreaterThan(0)

    const fed = apply(init(), { type: 'feedTrap', plantId: 'p1', trapId: 't1' }, T0)
    expect(nextTrapOpenAt(activePlant(fed)!)).toBe(T0 + h(SIM.DIGEST_HOURS))
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
