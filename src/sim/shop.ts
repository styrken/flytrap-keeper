import type { ShopItemId, SpeciesId } from './types'

export interface ShopItem {
  id: ShopItemId
  cost: number
  kind: 'seed' | 'unlock' | 'deco' | 'pot'
  speciesId?: SpeciesId
  potColor?: string
}

export const MAX_PLANTS = 3

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'seed-drosera', cost: 50, kind: 'seed', speciesId: 'drosera' },
  { id: 'seed-nepenthes', cost: 120, kind: 'seed', speciesId: 'nepenthes' },
  { id: 'seed-sarracenia', cost: 200, kind: 'seed', speciesId: 'sarracenia' },
  { id: 'growlight', cost: 150, kind: 'unlock' },
  { id: 'gnome', cost: 60, kind: 'deco' },
  { id: 'pot-blue', cost: 20, kind: 'pot', potColor: '#5d84ae' },
  { id: 'pot-mint', cost: 20, kind: 'pot', potColor: '#7fb6a4' },
  { id: 'pot-plum', cost: 20, kind: 'pot', potColor: '#96608f' },
]

export const shopItem = (id: ShopItemId) => SHOP_ITEMS.find((item) => item.id === id)
