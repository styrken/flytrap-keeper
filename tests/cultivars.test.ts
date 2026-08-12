import { describe, expect, it } from 'vitest'
import {
  CULTIVARS,
  CULTIVAR_NICKNAMES,
  SHOP_ITEMS,
  activePlant,
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

const CULTIVAR_SEEDS: ShopItemId[] = ['seed-b52', 'seed-red-dragon', 'seed-justina']

describe('cultivar seeds', () => {
  it('every cultivar seed is a dionaea seed with its own cultivar id', () => {
    for (const id of CULTIVAR_SEEDS) {
      const item = SHOP_ITEMS.find((i) => i.id === id)!
      expect(item.kind).toBe('seed')
      expect(item.speciesId).toBe('dionaea')
      expect(item.cultivarId).toBeDefined()
    }
    expect(
      new Set(CULTIVAR_SEEDS.map((id) => SHOP_ITEMS.find((i) => i.id === id)!.cultivarId)),
    ).toEqual(new Set(CULTIVARS))
  })

  it('buying one sprouts a named cultivar and charges the price', () => {
    const state = apply(init(500), { type: 'buy', item: 'seed-red-dragon' }, T0)
    const sprout = activePlant(state)!
    expect(sprout.speciesId).toBe('dionaea')
    expect(sprout.cultivar).toBe('red-dragon')
    expect(sprout.nickname).toBe(CULTIVAR_NICKNAMES['red-dragon'])
    const cost = SHOP_ITEMS.find((i) => i.id === 'seed-red-dragon')!.cost
    expect(state.inventory.dewdrops).toBe(500 - cost)
  })

  it('plain seeds stay plain', () => {
    const state = apply(init(500), { type: 'buy', item: 'seed-drosera' }, T0)
    expect(activePlant(state)!.cultivar).toBeNull()
    expect(init().plants[0].cultivar).toBeNull()
  })

  it('growing all three cultivars awards the collector — the greenhouse makes room', () => {
    // sill holds 3; the starter plant + 3 cultivars needs the greenhouse bench
    let state = { ...init(2000), inventory: { dewdrops: 2000, items: ['greenhouse'], flyPacks: 0 } }
    for (const id of CULTIVAR_SEEDS.slice(0, 2)) {
      state = apply(state, { type: 'buy', item: id }, T0)
      expect(state.achievements).not.toContain('cultivar-collector')
    }
    state = apply(state, { type: 'buy', item: CULTIVAR_SEEDS[2] }, T0)
    expect(state.achievements).toContain('cultivar-collector')
    expect(state.plants).toHaveLength(4)
  })
})

describe('save migration v11 -> v12 (cultivars)', () => {
  it('marks existing plants as the plain species', () => {
    const state = init()
    const v11 = JSON.parse(saveToString(state)) as Record<string, unknown>
    v11.saveVersion = 11
    const plants = v11.plants as Record<string, unknown>[]
    delete plants[0].cultivar
    delete (v11.minigames as Record<string, unknown>).lastWishAt

    const loaded = loadFromString(JSON.stringify(v11))
    expect(loaded).not.toBeNull()
    expect(loaded!.plants[0].cultivar).toBeNull()
  })
})
