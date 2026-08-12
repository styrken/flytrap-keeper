import { describe, expect, it } from 'vitest'
import { SHOP_ITEMS, apply, createInitialState, loadFromString, saveToString } from '../src/sim'
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

describe('the fly pack', () => {
  const cost = SHOP_ITEMS.find((item) => item.id === 'fly-pack')!.cost

  it('is a consumable: each purchase stacks a pack and charges again', () => {
    let state = apply(init(100), { type: 'buy', item: 'fly-pack' }, T0)
    expect(state.inventory.flyPacks).toBe(1)
    expect(state.inventory.dewdrops).toBe(100 - cost)

    state = apply(state, { type: 'buy', item: 'fly-pack' }, T0)
    expect(state.inventory.flyPacks).toBe(2)
    expect(state.inventory.dewdrops).toBe(100 - 2 * cost)
  })

  it('cannot afford, cannot buy', () => {
    const state = apply(init(cost - 1), { type: 'buy', item: 'fly-pack' }, T0)
    expect(state.inventory.flyPacks).toBe(0)
    expect(state.inventory.dewdrops).toBe(cost - 1)
  })

  it('releasing spends exactly one pack and never dips below zero', () => {
    let state = apply(init(100), { type: 'buy', item: 'fly-pack' }, T0)
    state = apply(state, { type: 'releaseFlies' }, T0)
    expect(state.inventory.flyPacks).toBe(0)

    const dewdrops = state.inventory.dewdrops
    const again = apply(state, { type: 'releaseFlies' }, T0)
    expect(again.inventory.flyPacks).toBe(0)
    expect(again.inventory.dewdrops).toBe(dewdrops)
  })

  it('releasing touches nothing but the shelf — flies are the view layer’s story', () => {
    let state = apply(init(100), { type: 'buy', item: 'fly-pack' }, T0)
    const before = state
    state = apply(state, { type: 'releaseFlies' }, T0)
    expect(state.plants).toEqual(before.plants)
    expect(state.inventory.items).toEqual(before.inventory.items)
    expect(state.inventory.dewdrops).toBe(before.inventory.dewdrops)
  })

  it('migrates v14 saves with an empty shelf', () => {
    const v14 = JSON.parse(saveToString(init())) as Record<string, unknown>
    v14.saveVersion = 14
    delete (v14.inventory as Record<string, unknown>).flyPacks

    const loaded = loadFromString(JSON.stringify(v14))
    expect(loaded).not.toBeNull()
    expect(loaded!.inventory.flyPacks).toBe(0)
  })
})
