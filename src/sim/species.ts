import type { PlacementId, SpeciesId } from './types'

export interface StageDef {
  xpThreshold: number
  trapCount: number
}

export interface SpeciesDef {
  id: SpeciesId
  /** Light quality per placement, 0..1 — multiplies growth. */
  lightLevels: Record<PlacementId, number>
  stages: StageDef[]
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  dionaea: {
    id: 'dionaea',
    lightLevels: { 'south-window': 1, 'north-window': 0.55 },
    stages: [
      { xpThreshold: 0, trapCount: 1 },
      { xpThreshold: 300, trapCount: 2 },
      { xpThreshold: 900, trapCount: 3 },
      { xpThreshold: 2000, trapCount: 5 },
    ],
  },
}
