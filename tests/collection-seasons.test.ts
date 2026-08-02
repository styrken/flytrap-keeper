import { describe, expect, it } from 'vitest'
import {
  SIM,
  activePlant,
  apply,
  createInitialState,
  loadFromString,
  saveToString,
  seasonAt,
  tick,
} from '../src/sim'
import type { GameState } from '../src/sim'

const T0 = 1_700_000_000_000 // 2023-11-14, autumn
const WINTER = Date.UTC(2024, 0, 10)
const h = (n: number) => n * 3_600_000

const init = (now = T0) => createInitialState(now, 42)
const rich = (now = T0, dewdrops = 500): GameState => {
  const s = init(now)
  return { ...s, inventory: { ...s.inventory, dewdrops } }
}

describe('shop and collection', () => {
  it('buying a seed sprouts and selects a new plant', () => {
    const next = apply(rich(), { type: 'buy', item: 'seed-drosera' }, T0)
    expect(next.plants).toHaveLength(2)
    const sprout = activePlant(next)!
    expect(sprout.speciesId).toBe('drosera')
    expect(sprout.nickname).toBe('Dewy')
    expect(next.inventory.dewdrops).toBe(450)
  })

  it('caps the windowsill at three pots', () => {
    let state = apply(rich(), { type: 'buy', item: 'seed-drosera' }, T0)
    state = apply(state, { type: 'buy', item: 'seed-nepenthes' }, T0)
    const fourth = apply(state, { type: 'buy', item: 'seed-sarracenia' }, T0)
    expect(fourth).toBe(state)
    expect(state.plants).toHaveLength(3)
  })

  it('rejects purchases the player cannot afford', () => {
    const state = init()
    expect(apply(state, { type: 'buy', item: 'seed-drosera' }, T0)).toBe(state)
  })

  it('the grow light must be bought before moving a plant under it', () => {
    const state = rich()
    expect(apply(state, { type: 'move', placement: 'growlight' }, T0)).toBe(state)
    const owned = apply(state, { type: 'buy', item: 'growlight' }, T0)
    expect(owned.inventory.items).toContain('growlight')
    const moved = apply(owned, { type: 'move', placement: 'growlight' }, T0)
    expect(activePlant(moved)?.placement).toBe('growlight')
  })

  it('a new pot repots the active plant', () => {
    const next = apply(rich(), { type: 'buy', item: 'pot-blue' }, T0)
    expect(activePlant(next)?.potColor).toBe('#5d84ae')
    expect(next.inventory.dewdrops).toBe(480)
  })

  it('actions target the selected plant only', () => {
    let state = apply(rich(), { type: 'buy', item: 'seed-drosera' }, T0)
    state = tick(state, T0 + h(20))
    const before = state.plants.map((p) => p.water)
    state = apply(state, { type: 'water' }, T0 + h(20)) // active = the sundew (p2)
    expect(state.plants[1].water).toBe(100)
    expect(state.plants[0].water).toBeCloseTo(before[0], 5)

    state = apply(state, { type: 'selectPlant', plantId: 'p1' }, T0 + h(20))
    expect(activePlant(state)?.id).toBe('p1')
  })
})

describe('species care profiles', () => {
  const withNepenthes = () => {
    const state = apply(rich(), { type: 'buy', item: 'seed-nepenthes' }, T0)
    return state // active plant is the nepenthes
  }

  it('nepenthes humidity falls over time and misting refills it', () => {
    let state = withNepenthes()
    state = tick(state, T0 + h(10))
    const plant = activePlant(state)!
    expect(plant.humidity).toBeCloseTo(80 - SIM.HUMIDITY_DECAY_PER_HOUR * 10, 5)
    const misted = apply(state, { type: 'mist' }, T0 + h(10))
    expect(activePlant(misted)?.humidity).toBe(100)
  })

  it('misting a non-tropical species is rejected', () => {
    const state = init()
    expect(apply(state, { type: 'mist' }, T0)).toBe(state)
  })

  it('dry air slows nepenthes growth', () => {
    const humid = withNepenthes()
    const dry: GameState = {
      ...humid,
      plants: humid.plants.map((p) => (p.speciesId === 'nepenthes' ? { ...p, humidity: 5 } : p)),
    }
    const humidGrown = activePlant(tick(humid, T0 + h(10)))!
    const dryGrown = activePlant(tick(dry, T0 + h(10)))!
    expect(dryGrown.xp).toBeLessThan(humidGrown.xp)
  })

  it('the sundew quietly catches tiny prey on its own', () => {
    let state = apply(rich(), { type: 'buy', item: 'seed-drosera' }, T0)
    state = {
      ...state,
      plants: state.plants.map((p) => (p.speciesId === 'drosera' ? { ...p, nutrition: 0 } : p)),
    }
    const later = activePlant(tick(state, T0 + h(10)))!
    expect(later.nutrition).toBeGreaterThan(0)
    expect(later.nutrition).toBeLessThanOrEqual(SIM.PASSIVE_CATCH_CAP)
    // the flytrap gets no such service
    const flytrapState = {
      ...init(),
      plants: init().plants.map((p) => ({ ...p, nutrition: 0 })),
    }
    expect(activePlant(tick(flytrapState, T0 + h(10)))!.nutrition).toBe(0)
  })

  it('hand-feeding non-snappers has a cooldown', () => {
    let state = apply(rich(), { type: 'buy', item: 'seed-drosera' }, T0)
    const before = activePlant(state)!.nutrition
    state = apply(state, { type: 'feedPlant' }, T0)
    expect(activePlant(state)!.nutrition).toBe(Math.min(100, before + SIM.FEED_PLANT_NUTRITION))
    const tooSoon = apply(state, { type: 'feedPlant' }, T0 + h(1))
    expect(activePlant(tooSoon)!.lastFedAt).toBe(T0) // rejected: not re-fed
    const later = apply(state, { type: 'feedPlant' }, T0 + h(SIM.FEED_PLANT_COOLDOWN_HOURS + 1))
    expect(activePlant(later)!.lastFedAt).toBe(T0 + h(SIM.FEED_PLANT_COOLDOWN_HOURS + 1))
  })

  it('hand-feed-by-button is for non-snappers; the flytrap uses its traps', () => {
    const state = init()
    expect(apply(state, { type: 'feedPlant' }, T0)).toBe(state)
  })
})

describe('seasons and dormancy', () => {
  it('maps months to seasons', () => {
    expect(seasonAt(Date.UTC(2024, 0, 5))).toBe('winter')
    expect(seasonAt(Date.UTC(2024, 3, 5))).toBe('spring')
    expect(seasonAt(Date.UTC(2024, 6, 5))).toBe('summer')
    expect(seasonAt(Date.UTC(2024, 9, 5))).toBe('autumn')
  })

  it('dormancy can only start in winter, and only for temperate species', () => {
    const autumn = init(T0)
    expect(apply(autumn, { type: 'setDormant', on: true }, T0)).toBe(autumn)

    const winter = init(WINTER)
    const sleeping = apply(winter, { type: 'setDormant', on: true }, WINTER)
    expect(activePlant(sleeping)?.dormant).toBe(true)

    const sundew = apply(rich(WINTER), { type: 'buy', item: 'seed-drosera' }, WINTER)
    const rejected = apply(sundew, { type: 'setDormant', on: true }, WINTER)
    expect(rejected).toBe(sundew)
  })

  it('dormancy is a full pause — vacation mode', () => {
    const sleeping = apply(init(WINTER), { type: 'setDormant', on: true }, WINTER)
    const before = activePlant(sleeping)!
    const later = activePlant(tick(sleeping, WINTER + h(24 * 5)))!
    expect(later.water).toBe(before.water)
    expect(later.health).toBe(before.health)
    expect(later.xp).toBe(before.xp)
  })

  it('skipping dormancy wears the plant down all winter', () => {
    let state = apply(init(WINTER), { type: 'water' }, WINTER)
    state = tick(state, WINTER + h(24))
    state = apply(state, { type: 'water' }, WINTER + h(24))
    state = tick(state, WINTER + h(48))
    const plant = activePlant(state)!
    // no regen, steady decay — even with full water
    expect(plant.health).toBeLessThan(100 - SIM.WINTER_SKIP_HEALTH_DECAY_PER_HOUR * 40)
    expect(plant.health).toBeGreaterThan(70)
  })

  it('the plant wakes by itself when spring arrives', () => {
    const lateWinter = Date.UTC(2024, 1, 27)
    const sleeping = apply(init(lateWinter), { type: 'setDormant', on: true }, lateWinter)
    const spring = tick(sleeping, Date.UTC(2024, 2, 5))
    expect(activePlant(spring)?.dormant).toBe(false)
  })
})

describe('flowering', () => {
  const readyToFlower = (): GameState => {
    const state = init()
    return {
      ...state,
      weather: { rainBarrel: 100 },
      plants: state.plants.map((p) => ({ ...p, xp: 2700, stage: 3, health: 100 })),
    }
  }

  it('a thriving mature flytrap sends up a stalk', () => {
    const next = tick(readyToFlower(), T0 + h(1))
    const flowering = activePlant(next)!.flowering
    expect(flowering).not.toBeNull()
    expect(flowering!.blooming).toBe(false)
  })

  it('cutting the stalk is safe and pays a little', () => {
    const withStalk = tick(readyToFlower(), T0 + h(1))
    const cut = apply(withStalk, { type: 'cutFlower' }, T0 + h(1))
    expect(activePlant(cut)?.flowering).toBeNull()
    expect(cut.inventory.dewdrops).toBe(withStalk.inventory.dewdrops + SIM.CUT_REWARD_DEWDROPS)
  })

  it('letting it bloom costs strength but pays seeds after five days', () => {
    const withStalk = tick(readyToFlower(), T0 + h(1))
    let state = apply(withStalk, { type: 'letBloom' }, T0 + h(1))
    expect(activePlant(state)!.flowering?.blooming).toBe(true)

    let at = T0 + h(1)
    const dewdropsBefore = state.inventory.dewdrops
    for (let i = 0; i < 12 && activePlant(state)!.flowering; i++) {
      at += h(12)
      state = tick(state, at)
      const watered = apply(state, { type: 'water' }, at)
      state = watered !== state ? watered : apply(state, { type: 'tapWater' }, at)
    }
    expect(activePlant(state)!.flowering).toBeNull()
    expect(state.inventory.dewdrops).toBeGreaterThanOrEqual(
      dewdropsBefore + SIM.BLOOM_REWARD_DEWDROPS,
    )
    expect(state.achievements).toContain('in-bloom')
  })
})

describe('hard mode', () => {
  it('death is opt-in, takes days at rock bottom, and frees the slot', () => {
    let state = apply(rich(), { type: 'buy', item: 'seed-drosera' }, T0)
    state = apply(state, { type: 'setHardMode', on: true }, T0)
    // total neglect: both plants dry out, hit the floor, and eventually die
    let at = T0
    for (let day = 1; day <= 12; day++) {
      at = T0 + h(24 * day)
      state = tick(state, at)
    }
    expect(state.plants.every((p) => p.dead)).toBe(true)

    const removed = apply(state, { type: 'removePlant', plantId: 'p1' }, at)
    expect(removed.plants).toHaveLength(1)
    expect(removed.plants.some((p) => p.id === 'p1')).toBe(false)
    // the last plant can never be removed
    const lastId = removed.plants[0].id
    expect(apply(removed, { type: 'removePlant', plantId: lastId }, at)).toBe(removed)
  })

  it('without hard mode the same neglect only wilts', () => {
    let state = init()
    for (let day = 1; day <= 12; day++) state = tick(state, T0 + h(24 * day))
    const plant = activePlant(state)!
    expect(plant.dead).toBe(false)
    expect(plant.wilted).toBe(true)
  })

  it('a dead plant accepts no care', () => {
    const state = init()
    const dead: GameState = {
      ...state,
      plants: state.plants.map((p) => ({ ...p, dead: true })),
    }
    expect(apply(dead, { type: 'water' }, T0)).toBe(dead)
    expect(apply(dead, { type: 'tapWater' }, T0)).toBe(dead)
  })
})

describe('save migration v2 -> v3', () => {
  it('upgrades a phase-2 save with collection defaults', () => {
    const state = init()
    const v2 = JSON.parse(saveToString(state)) as Record<string, unknown>
    delete v2.activePlantId
    v2.settings = { sound: false }
    v2.plants = (v2.plants as Record<string, unknown>[]).map((plant) => {
      const copy = { ...plant }
      delete copy.humidity
      delete copy.lastFedAt
      delete copy.potColor
      delete copy.flowering
      delete copy.dead
      delete copy.criticalSince
      return copy
    })
    v2.saveVersion = 2

    const loaded = loadFromString(JSON.stringify(v2))
    expect(loaded).not.toBeNull()
    expect(loaded!.saveVersion).toBe(3)
    expect(loaded!.activePlantId).toBe('p1')
    expect(loaded!.settings).toEqual({ sound: false, locale: 'en', hardMode: false })
    expect(loaded!.plants[0].humidity).toBe(80)
    expect(loaded!.plants[0].dead).toBe(false)
  })
})
