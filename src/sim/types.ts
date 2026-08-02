export type SpeciesId = 'dionaea'
export type PlacementId = 'north-window' | 'south-window'
export type WeatherKind = 'sun' | 'clouds' | 'rain'
export type InsectKind = 'fly' | 'mosquito' | 'spider' | 'beetle'

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
  weather: { rainBarrel: number }
  settings: { sound: boolean }
  /** Distinct real-world days with at least one care action. */
  careStreak: { days: number; lastDay: string | null }
  achievements: string[]
}

export type Action =
  | { type: 'water' }
  | { type: 'tapWater' }
  | { type: 'feedTrap'; trapId: string }
  | { type: 'catchInsect'; trapId: string; insect: InsectKind }
  | { type: 'move'; placement: PlacementId }
  | { type: 'rename'; nickname: string }
  | { type: 'setSound'; on: boolean }
