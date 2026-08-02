export type SpeciesId = 'dionaea' | 'drosera' | 'nepenthes' | 'sarracenia'
export type PlacementId = 'north-window' | 'south-window' | 'growlight'
export type WeatherKind = 'sun' | 'clouds' | 'rain'
export type InsectKind = 'fly' | 'mosquito' | 'spider' | 'beetle'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type QuestId = 'water2' | 'catch2' | 'weed2' | 'pet2' | 'pour1' | 'mist1'

export interface QuestState {
  id: QuestId
  target: number
  progress: number
}

export type ShopItemId =
  | 'seed-drosera'
  | 'seed-nepenthes'
  | 'seed-sarracenia'
  | 'growlight'
  | 'gnome'
  | 'rug'
  | 'poster'
  | 'radio'
  | 'lamp'
  | 'computer'
  | 'pot-blue'
  | 'pot-mint'
  | 'pot-plum'

export interface TrapState {
  id: string
  usesLeft: number
  /** Epoch ms until digestion finishes; the trap is closed and unusable meanwhile. */
  digestingUntil: number | null
  /** Epoch ms when the trap withered (all uses spent); a fresh trap regrows later. */
  witheredAt: number | null
}

export interface FloweringState {
  /** When the stalk appeared — or, once blooming, when blooming began. */
  startedAt: number
  /** false: stalk is up, the player must choose. true: blooming until done. */
  blooming: boolean
}

export interface PlantState {
  id: string
  speciesId: SpeciesId
  nickname: string
  water: number
  nutrition: number
  health: number
  /** 0-100; only species with needsMisting care about it. */
  humidity: number
  xp: number
  stage: number
  placement: PlacementId
  traps: TrapState[]
  trapSeq: number
  /** Hand-feeding cooldown for non-snapper species. */
  lastFedAt: number | null
  /** Petting cooldown — affection pays a tiny dewdrop trickle. */
  lastPetAt: number | null
  /** A weed is present in the pot once now >= nextWeedAt; pulling it resets the clock. */
  nextWeedAt: number
  potColor: string | null
  flowering: FloweringState | null
  wilted: boolean
  dormant: boolean
  /** Hard mode only — permanently gone, slot can be cleared. */
  dead: boolean
  /** Hard mode: when health first hit the floor; death after enough hours. */
  criticalSince: number | null
}

export interface GameState {
  saveVersion: number
  updatedAt: number
  lastTickAt: number
  rngSeed: number
  plants: PlantState[]
  activePlantId: string
  inventory: { dewdrops: number; items: string[] }
  weather: { rainBarrel: number }
  minigames: { lastRaindropAt: number | null }
  /** Three daily tasks, redrawn each UTC day. */
  quests: { day: string; items: QuestState[] }
  settings: { sound: boolean; locale: string; hardMode: boolean }
  /** Distinct real-world days with at least one care action. */
  careStreak: { days: number; lastDay: string | null }
  achievements: string[]
}

export type Action =
  | { type: 'water'; perfect?: boolean }
  | { type: 'tapWater' }
  | { type: 'mist' }
  | { type: 'pet' }
  | { type: 'pullWeed'; plantId: string }
  | { type: 'catchRaindrop' }
  | { type: 'feedTrap'; plantId: string; trapId: string }
  | { type: 'feedPlant' }
  | { type: 'catchInsect'; plantId: string; trapId: string; insect: InsectKind }
  | { type: 'move'; placement: PlacementId }
  | { type: 'rename'; nickname: string }
  | { type: 'selectPlant'; plantId: string }
  | { type: 'buy'; item: ShopItemId }
  | { type: 'setDormant'; on: boolean }
  | { type: 'cutFlower' }
  | { type: 'letBloom' }
  | { type: 'removePlant'; plantId: string }
  | { type: 'setSound'; on: boolean }
  | { type: 'setLocale'; locale: string }
  | { type: 'setHardMode'; on: boolean }
