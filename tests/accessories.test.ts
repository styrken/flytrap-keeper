import { describe, expect, it } from 'vitest'
import {
  SHOP_ITEMS,
  activePlant,
  apply,
  createInitialState,
  loadFromString,
  saveToString,
} from '../src/sim'
import type { GameState } from '../src/sim'

const T0 = 1_700_000_000_000
const init = (dewdrops = 0): GameState => {
  const s = createInitialState(T0, 42)
  return {
    ...s,
    quests: { ...s.quests, items: [] },
    inventory: { ...s.inventory, dewdrops },
  }
}

describe('plant accessories', () => {
  const eyesCost = SHOP_ITEMS.find((i) => i.id === 'googly-eyes')!.cost
  const bowCost = SHOP_ITEMS.find((i) => i.id === 'bow')!.cost

  it('buying googly eyes dresses the active plant and charges the price', () => {
    const state = apply(init(100), { type: 'buy', item: 'googly-eyes' }, T0)
    expect(activePlant(state)!.accessory).toBe('googly-eyes')
    expect(state.inventory.dewdrops).toBe(100 - eyesCost)
  })

  it('re-buying the same accessory is a no-op; a different one swaps it', () => {
    let state = apply(init(100), { type: 'buy', item: 'googly-eyes' }, T0)
    const afterFirst = state.inventory.dewdrops

    state = apply(state, { type: 'buy', item: 'googly-eyes' }, T0)
    expect(state.inventory.dewdrops).toBe(afterFirst)

    state = apply(state, { type: 'buy', item: 'bow' }, T0)
    expect(activePlant(state)!.accessory).toBe('bow')
    expect(state.inventory.dewdrops).toBe(afterFirst - bowCost)
  })

  it('cannot afford, cannot dress', () => {
    const state = apply(init(5), { type: 'buy', item: 'bow' }, T0)
    expect(activePlant(state)!.accessory).toBeNull()
    expect(state.inventory.dewdrops).toBe(5)
  })

  it('new sprouts arrive undressed', () => {
    expect(init().plants[0].accessory).toBeNull()
  })
})

describe('save migration v11 -> v12 (accessories)', () => {
  it('marks existing plants as undressed', () => {
    const state = init()
    const v11 = JSON.parse(saveToString(state)) as Record<string, unknown>
    v11.saveVersion = 11
    const plants = v11.plants as Record<string, unknown>[]
    delete plants[0].accessory
    delete plants[0].cultivar
    delete (v11.minigames as Record<string, unknown>).lastWishAt

    const loaded = loadFromString(JSON.stringify(v11))
    expect(loaded).not.toBeNull()
    expect(loaded!.plants[0].accessory).toBeNull()
    expect(loaded!.plants[0].cultivar).toBeNull()
    expect(loaded!.minigames.lastWishAt).toBeNull()
  })
})
