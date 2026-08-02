import type { InsectKind } from './types'

export interface InsectDef {
  nutrition: number
  dewdrops: number
}

export const INSECTS: Record<InsectKind, InsectDef> = {
  fly: { nutrition: 30, dewdrops: 2 },
  mosquito: { nutrition: 15, dewdrops: 1 },
  spider: { nutrition: 45, dewdrops: 5 },
  beetle: { nutrition: 0, dewdrops: 0 },
}

/** Spawn weights for the visiting-insect choreography (view layer rolls the dice). */
export function insectKindFromRoll(roll: number): InsectKind {
  if (roll < 0.55) return 'fly'
  if (roll < 0.75) return 'mosquito'
  if (roll < 0.85) return 'spider'
  return 'beetle'
}
