export type SpeciesId = 'dionaea'
export type PlacementId = 'north-window' | 'south-window'

export interface TrapState {
  id: string
  usesLeft: number
  /** Epoch ms until digestion finishes; the trap is closed and unusable meanwhile. */
  digestingUntil: number | null
  /** Epoch ms when the trap withered (all uses spent); a fresh trap regrows later. */
  witheredAt: number | null
}

export interface PlantState {
  id: string
  speciesId: SpeciesId
  nickname: string
  water: number
  nutrition: number
  health: number
  xp: number
  stage: number
  placement: PlacementId
  traps: TrapState[]
  trapSeq: number
  wilted: boolean
  dormant: boolean
}

export interface GameState {
  saveVersion: number
  updatedAt: number
  lastTickAt: number
  rngSeed: number
  plants: PlantState[]
  inventory: { dewdrops: number; items: string[] }
  achievements: string[]
}

export type Action =
  | { type: 'water' }
  | { type: 'feedTrap'; trapId: string }
  | { type: 'move'; placement: PlacementId }
