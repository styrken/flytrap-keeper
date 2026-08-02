import type { CultivarId, PlacementId, SpeciesId } from './types'

export interface StageDef {
  xpThreshold: number
  /** Traps for the flytrap; leaves/pitchers for the other species (visual + wear). */
  trapCount: number
}

export interface SpeciesDef {
  id: SpeciesId
  /** Only the flytrap plays the snap minigame. */
  isSnapper: boolean
  /** Tropical: needs regular misting (humidity stat). */
  needsMisting: boolean
  /** Sticky leaves quietly catch tiny prey on their own. */
  passiveCatch: boolean
  /** Temperate species that must sleep through winter (phase 5). */
  needsDormancy: boolean
  /** Grows on limestone in the wild — the one exception to the tap-water rule. */
  limeTolerant: boolean
  /** Light quality per placement, 0..1+ — multiplies growth. */
  lightLevels: Record<PlacementId, number>
  stages: StageDef[]
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  dionaea: {
    id: 'dionaea',
    isSnapper: true,
    needsMisting: false,
    passiveCatch: false,
    needsDormancy: true,
    limeTolerant: false,
    lightLevels: { 'south-window': 1, 'north-window': 0.55, growlight: 1.05, greenhouse: 1.1 },
    stages: [
      { xpThreshold: 0, trapCount: 1 },
      { xpThreshold: 300, trapCount: 2 },
      { xpThreshold: 900, trapCount: 3 },
      { xpThreshold: 2000, trapCount: 5 },
    ],
  },
  drosera: {
    id: 'drosera',
    isSnapper: false,
    needsMisting: false,
    passiveCatch: true,
    needsDormancy: false,
    limeTolerant: false,
    lightLevels: { 'south-window': 1, 'north-window': 0.7, growlight: 1.05, greenhouse: 1.1 },
    stages: [
      { xpThreshold: 0, trapCount: 3 },
      { xpThreshold: 300, trapCount: 4 },
      { xpThreshold: 900, trapCount: 6 },
      { xpThreshold: 2000, trapCount: 8 },
    ],
  },
  nepenthes: {
    id: 'nepenthes',
    isSnapper: false,
    needsMisting: true,
    passiveCatch: false,
    needsDormancy: false,
    limeTolerant: false,
    lightLevels: { 'south-window': 0.85, 'north-window': 0.6, growlight: 1.05, greenhouse: 1.15 },
    stages: [
      { xpThreshold: 0, trapCount: 1 },
      { xpThreshold: 300, trapCount: 2 },
      { xpThreshold: 900, trapCount: 3 },
      { xpThreshold: 2000, trapCount: 4 },
    ],
  },
  sarracenia: {
    id: 'sarracenia',
    isSnapper: false,
    needsMisting: false,
    passiveCatch: false,
    needsDormancy: true,
    limeTolerant: false,
    lightLevels: { 'south-window': 1, 'north-window': 0.45, growlight: 1, greenhouse: 1.15 },
    stages: [
      { xpThreshold: 0, trapCount: 2 },
      { xpThreshold: 300, trapCount: 3 },
      { xpThreshold: 900, trapCount: 4 },
      { xpThreshold: 2000, trapCount: 6 },
    ],
  },
  pinguicula: {
    id: 'pinguicula',
    isSnapper: false,
    needsMisting: false,
    passiveCatch: true,
    needsDormancy: true,
    limeTolerant: true,
    lightLevels: { 'south-window': 0.9, 'north-window': 0.75, growlight: 1.05, greenhouse: 1.1 },
    stages: [
      { xpThreshold: 0, trapCount: 4 },
      { xpThreshold: 300, trapCount: 5 },
      { xpThreshold: 900, trapCount: 6 },
      { xpThreshold: 2000, trapCount: 8 },
    ],
  },
}

/** Default nickname per species for newly sprouted plants. */
export const DEFAULT_NICKNAMES: Record<SpeciesId, string> = {
  dionaea: 'Venus',
  drosera: 'Dewy',
  nepenthes: 'Pia',
  sarracenia: 'Sara',
  pinguicula: 'Ping',
}

/** All collectable cultivars, in shop order — owning them all is an achievement. */
export const CULTIVARS: CultivarId[] = ['b52', 'red-dragon', 'justina']

/** Cultivar sprouts arrive with a fitting name of their own. */
export const CULTIVAR_NICKNAMES: Record<CultivarId, string> = {
  b52: 'Bertha',
  'red-dragon': 'Draco',
  justina: 'Justina',
}
