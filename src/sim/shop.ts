import type { CultivarId, GameState, PlantState, ShopItemId, SpeciesId } from './types'

export interface ShopItem {
  id: ShopItemId
  cost: number
  kind: 'seed' | 'unlock' | 'deco' | 'pot'
  speciesId?: SpeciesId
  /** Seed of a named rarity — same species, its own look. */
  cultivarId?: CultivarId
  potColor?: string
}

/** Pots on the windowsill. */
export const MAX_PLANTS = 3
/** Extra bench spots once the greenhouse is built. */
export const GREENHOUSE_CAPACITY = 3

export const inGreenhouse = (plant: PlantState) => plant.placement === 'greenhouse'

export const hasGreenhouse = (state: GameState) => state.inventory.items.includes('greenhouse')

export const sillPlantCount = (state: GameState) =>
  state.plants.filter((plant) => !inGreenhouse(plant)).length

export const greenhousePlantCount = (state: GameState) => state.plants.filter(inGreenhouse).length

/** Total pots the collection can hold right now. */
export const plantCapacity = (state: GameState) =>
  MAX_PLANTS + (hasGreenhouse(state) ? GREENHOUSE_CAPACITY : 0)

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'seed-drosera', cost: 50, kind: 'seed', speciesId: 'drosera' },
  { id: 'seed-nepenthes', cost: 120, kind: 'seed', speciesId: 'nepenthes' },
  { id: 'seed-sarracenia', cost: 200, kind: 'seed', speciesId: 'sarracenia' },
  { id: 'seed-justina', cost: 100, kind: 'seed', speciesId: 'dionaea', cultivarId: 'justina' },
  { id: 'seed-b52', cost: 120, kind: 'seed', speciesId: 'dionaea', cultivarId: 'b52' },
  {
    id: 'seed-red-dragon',
    cost: 140,
    kind: 'seed',
    speciesId: 'dionaea',
    cultivarId: 'red-dragon',
  },
  { id: 'growlight', cost: 150, kind: 'unlock' },
  { id: 'greenhouse', cost: 250, kind: 'unlock' },
  { id: 'gnome', cost: 60, kind: 'deco' },
  { id: 'rug', cost: 35, kind: 'deco' },
  { id: 'poster', cost: 30, kind: 'deco' },
  { id: 'radio', cost: 45, kind: 'deco' },
  { id: 'lamp', cost: 55, kind: 'deco' },
  { id: 'computer', cost: 90, kind: 'deco' },
  { id: 'pot-blue', cost: 20, kind: 'pot', potColor: '#5d84ae' },
  { id: 'pot-mint', cost: 20, kind: 'pot', potColor: '#7fb6a4' },
  { id: 'pot-plum', cost: 20, kind: 'pot', potColor: '#96608f' },
]

export const shopItem = (id: ShopItemId) => SHOP_ITEMS.find((item) => item.id === id)
