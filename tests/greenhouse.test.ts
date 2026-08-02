import { describe, expect, it } from 'vitest'
import {
  GREENHOUSE_CAPACITY,
  MAX_PLANTS,
  SAVE_VERSION,
  SIM,
  apply,
  canMoveTo,
  createInitialState,
  greenhousePlantCount,
  loadFromString,
  plantCapacity,
  saveToString,
  sillPlantCount,
  tick,
} from '../src/sim'
import type { GameState } from '../src/sim'

const T0 = Date.UTC(2025, 5, 10, 9, 0, 0) // a June morning — no dormancy in play

const rich = (state: GameState, dewdrops = 5000): GameState => ({
  ...state,
  inventory: { ...state.inventory, dewdrops },
})

const buyGreenhouse = (state: GameState, now = T0) =>
  apply(state, { type: 'buy', item: 'greenhouse' }, now)

describe('buying the greenhouse', () => {
  it('is a one-time unlock that raises the plant capacity', () => {
    let state = rich(createInitialState(T0, 42))
    expect(plantCapacity(state)).toBe(MAX_PLANTS)

    state = buyGreenhouse(state)
    expect(state.inventory.items).toContain('greenhouse')
    expect(plantCapacity(state)).toBe(MAX_PLANTS + GREENHOUSE_CAPACITY)

    const again = buyGreenhouse(state)
    expect(again.inventory.dewdrops).toBe(state.inventory.dewdrops)
  })
})

describe('planting with a greenhouse', () => {
  it('fills the sill first, then sends new sprouts to the bench', () => {
    let state = rich(createInitialState(T0, 42))
    state = buyGreenhouse(state)
    state = apply(state, { type: 'buy', item: 'seed-drosera' }, T0)
    state = apply(state, { type: 'buy', item: 'seed-sarracenia' }, T0)
    expect(sillPlantCount(state)).toBe(3)
    expect(greenhousePlantCount(state)).toBe(0)

    state = apply(state, { type: 'buy', item: 'seed-nepenthes' }, T0)
    expect(state.plants).toHaveLength(4)
    expect(state.plants[3].placement).toBe('greenhouse')
  })

  it('holds six plants at most, three without a greenhouse', () => {
    let state = rich(createInitialState(T0, 42))
    state = apply(state, { type: 'buy', item: 'seed-drosera' }, T0)
    state = apply(state, { type: 'buy', item: 'seed-sarracenia' }, T0)
    const blocked = apply(state, { type: 'buy', item: 'seed-nepenthes' }, T0)
    expect(blocked.plants).toHaveLength(3)

    state = buyGreenhouse(state)
    for (const item of ['seed-nepenthes', 'seed-drosera', 'seed-drosera'] as const) {
      state = apply(state, { type: 'buy', item }, T0)
    }
    expect(state.plants).toHaveLength(6)
    const full = apply(state, { type: 'buy', item: 'seed-drosera' }, T0)
    expect(full.plants).toHaveLength(6)
  })
})

describe('moving between rooms', () => {
  it('needs the greenhouse to be owned', () => {
    const state = rich(createInitialState(T0, 42))
    const moved = apply(state, { type: 'move', placement: 'greenhouse' }, T0)
    expect(moved.plants[0].placement).toBe('south-window')

    const owned = buyGreenhouse(state)
    const inGlass = apply(owned, { type: 'move', placement: 'greenhouse' }, T0)
    expect(inGlass.plants[0].placement).toBe('greenhouse')
  })

  it('rejects moving into a full bench or out to a full sill', () => {
    let state = rich(createInitialState(T0, 42))
    state = buyGreenhouse(state)
    state = apply(state, { type: 'buy', item: 'seed-drosera' }, T0)
    state = apply(state, { type: 'buy', item: 'seed-sarracenia' }, T0)
    // Move the two bought plants to the bench, then buy and move one more.
    for (const plantId of [state.plants[1].id, state.plants[2].id]) {
      state = apply(state, { type: 'selectPlant', plantId }, T0)
      state = apply(state, { type: 'move', placement: 'greenhouse' }, T0)
    }
    state = apply(state, { type: 'buy', item: 'seed-nepenthes' }, T0)
    state = apply(state, { type: 'move', placement: 'greenhouse' }, T0) // buying selects it
    expect(greenhousePlantCount(state)).toBe(3)

    // Bench full: the flytrap on the sill cannot squeeze in.
    state = apply(state, { type: 'selectPlant', plantId: state.plants[0].id }, T0)
    expect(canMoveTo(state, state.plants[0], 'greenhouse')).toBe(false)
    const noRoom = apply(state, { type: 'move', placement: 'greenhouse' }, T0)
    expect(noRoom.plants[0].placement).toBe('south-window')

    // Fill the sill back up to three, then no bench plant can leave.
    state = apply(state, { type: 'buy', item: 'seed-drosera' }, T0)
    state = apply(state, { type: 'buy', item: 'seed-drosera' }, T0)
    expect(sillPlantCount(state)).toBe(3)
    const benchPlant = state.plants.find((plant) => plant.placement === 'greenhouse')!
    state = apply(state, { type: 'selectPlant', plantId: benchPlant.id }, T0)
    expect(canMoveTo(state, benchPlant, 'south-window')).toBe(false)
    const stuck = apply(state, { type: 'move', placement: 'south-window' }, T0)
    expect(stuck.plants.find((plant) => plant.id === benchPlant.id)!.placement).toBe('greenhouse')
  })
})

describe('life in the greenhouse', () => {
  it('grows plants under the glass at greenhouse light levels', () => {
    let state = rich(createInitialState(T0, 42))
    state = buyGreenhouse(state)
    state = { ...state, weather: { rainBarrel: 100 } }

    const onSill = tick(state, T0 + 6 * 3_600_000).plants[0]
    const moved = apply(state, { type: 'move', placement: 'greenhouse' }, T0)
    const underGlass = tick(moved, T0 + 6 * 3_600_000).plants[0]
    // dionaea: greenhouse 1.1 vs south window 1.0
    expect(underGlass.xp).toBeGreaterThan(onSill.xp)
  })

  it('keeps the air humid for the tropical pitcher', () => {
    let state = rich(createInitialState(T0, 42))
    state = buyGreenhouse(state)
    state = apply(state, { type: 'buy', item: 'seed-nepenthes' }, T0)
    const pitcherId = state.plants[1].id
    expect(state.plants[1].placement).toBe('south-window')

    const HOURS = 10
    const onSill = tick(state, T0 + HOURS * 3_600_000).plants[1]

    let inGlass = apply(state, { type: 'move', placement: 'greenhouse' }, T0)
    inGlass = tick(inGlass, T0 + HOURS * 3_600_000)
    const pitcher = inGlass.plants.find((plant) => plant.id === pitcherId)!

    const sillDrop = 80 - onSill.humidity
    const glassDrop = 80 - pitcher.humidity
    expect(glassDrop).toBeCloseTo(sillDrop * SIM.GREENHOUSE_HUMIDITY_FACTOR, 5)
  })
})

describe('save compatibility', () => {
  it('migrates a v8 save unchanged and stamps the new version', () => {
    const state = createInitialState(T0, 42)
    const v8 = { ...state, saveVersion: 8 }
    const loaded = loadFromString(JSON.stringify(v8))
    expect(loaded).not.toBeNull()
    expect(loaded!.saveVersion).toBe(SAVE_VERSION)
    expect(loaded!.plants[0].placement).toBe('south-window')
  })

  it('round-trips a greenhouse save', () => {
    let state = rich(createInitialState(T0, 42))
    state = buyGreenhouse(state)
    state = apply(state, { type: 'move', placement: 'greenhouse' }, T0)
    const loaded = loadFromString(saveToString(state))
    expect(loaded!.plants[0].placement).toBe('greenhouse')
  })
})
