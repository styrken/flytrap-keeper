import { describe, expect, it } from 'vitest'
import {
  PACK_KINDS,
  SHOP_ITEMS,
  apply,
  createInitialState,
  loadFromString,
  saveToString,
} from '../src/sim'
import type { GameState, ShopItemId } from '../src/sim'

const T0 = 1_700_000_000_000
const init = (dewdrops = 0): GameState => {
  const s = createInitialState(T0, 42)
  return {
    ...s,
    quests: { ...s.quests, items: [] },
    inventory: { ...s.inventory, dewdrops },
  }
}

const packItem = (id: ShopItemId) => SHOP_ITEMS.find((item) => item.id === id)!

describe('the insect packs', () => {
  it('sells one pack per kind, each a consumable with its insect inside', () => {
    for (const kind of PACK_KINDS) {
      const item = SHOP_ITEMS.find((candidate) => candidate.packInsect === kind)
      expect(item, kind).toBeDefined()
      expect(item!.kind).toBe('consumable')
    }
  })

  it('each purchase stacks its own kind and charges again', () => {
    const flyCost = packItem('fly-pack').cost
    const spiderCost = packItem('spider-pack').cost

    let state = apply(init(100), { type: 'buy', item: 'fly-pack' }, T0)
    state = apply(state, { type: 'buy', item: 'fly-pack' }, T0)
    state = apply(state, { type: 'buy', item: 'spider-pack' }, T0)

    expect(state.inventory.packs.fly).toBe(2)
    expect(state.inventory.packs.spider).toBe(1)
    expect(state.inventory.packs.mosquito).toBe(0)
    expect(state.inventory.dewdrops).toBe(100 - 2 * flyCost - spiderCost)
  })

  it('cannot afford, cannot buy', () => {
    const cost = packItem('mosquito-pack').cost
    const state = apply(init(cost - 1), { type: 'buy', item: 'mosquito-pack' }, T0)
    expect(state.inventory.packs.mosquito).toBe(0)
    expect(state.inventory.dewdrops).toBe(cost - 1)
  })

  it('releasing spends exactly one pack of that kind and never dips below zero', () => {
    let state = apply(init(100), { type: 'buy', item: 'moth-pack' }, T0)
    state = apply(state, { type: 'releasePack', insect: 'moth' }, T0)
    expect(state.inventory.packs.moth).toBe(0)

    const dewdrops = state.inventory.dewdrops
    const again = apply(state, { type: 'releasePack', insect: 'moth' }, T0)
    expect(again.inventory.packs.moth).toBe(0)
    expect(again.inventory.dewdrops).toBe(dewdrops)

    // an empty kind is refused even while another kind is stocked
    const stocked = apply(state, { type: 'buy', item: 'fly-pack' }, T0)
    const refused = apply(stocked, { type: 'releasePack', insect: 'spider' }, T0)
    expect(refused.inventory.packs).toEqual(stocked.inventory.packs)
  })

  it('releasing touches nothing but the shelf — the insects are the view layer’s story', () => {
    let state = apply(init(100), { type: 'buy', item: 'fly-pack' }, T0)
    const before = state
    state = apply(state, { type: 'releasePack', insect: 'fly' }, T0)
    expect(state.plants).toEqual(before.plants)
    expect(state.inventory.items).toEqual(before.inventory.items)
    expect(state.inventory.dewdrops).toBe(before.inventory.dewdrops)
  })

  it('migrates v15 saves: the lone flyPacks counter moves onto the shelf', () => {
    const v15 = JSON.parse(saveToString(init())) as Record<string, unknown>
    v15.saveVersion = 15
    const inventory = v15.inventory as Record<string, unknown>
    delete inventory.packs
    inventory.flyPacks = 2

    const loaded = loadFromString(JSON.stringify(v15))
    expect(loaded).not.toBeNull()
    expect(loaded!.inventory.packs).toEqual({ fly: 2, mosquito: 0, moth: 0, spider: 0 })
    expect('flyPacks' in loaded!.inventory).toBe(false)
  })

  it('migrates v14 saves straight to an empty shelf', () => {
    const v14 = JSON.parse(saveToString(init())) as Record<string, unknown>
    v14.saveVersion = 14
    delete (v14.inventory as Record<string, unknown>).packs

    const loaded = loadFromString(JSON.stringify(v14))
    expect(loaded).not.toBeNull()
    expect(loaded!.inventory.packs).toEqual({ fly: 0, mosquito: 0, moth: 0, spider: 0 })
  })
})
