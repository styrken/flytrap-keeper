export type SpeciesId = 'dionaea' | 'drosera' | 'nepenthes' | 'sarracenia' | 'pinguicula'
/** Real Dionaea cultivars — visual rarities of the same species, same care. */
export type CultivarId = 'b52' | 'red-dragon' | 'justina'
/** Pure-silliness plant cosmetics. The googly eyes ride the snapping jaw. */
export type AccessoryId = 'googly-eyes' | 'bow'
export type PlacementId = 'north-window' | 'south-window' | 'growlight' | 'greenhouse'
export type WeatherKind = 'sun' | 'clouds' | 'rain'
export type InsectKind = 'fly' | 'mosquito' | 'spider' | 'beetle' | 'moth'
/** Insects the shop dares to box up — beetles are strictly not for sale. */
export type PackKind = 'fly' | 'mosquito' | 'moth' | 'spider'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type QuestId = 'water2' | 'catch2' | 'weed2' | 'pet2' | 'pour1' | 'mist1'

export interface QuestState {
  id: QuestId
  target: number
  progress: number
}

/** The weekly slate: chunkier goals that reset every (UTC) Monday. */
export type WeeklyQuestId =
  'waterWeek' | 'catchWeek' | 'weedWeek' | 'petWeek' | 'pourWeek' | 'greetWeek'

export interface WeeklyQuestState {
  id: WeeklyQuestId
  target: number
  progress: number
}

export type ShopItemId =
  | 'seed-drosera'
  | 'seed-nepenthes'
  | 'seed-sarracenia'
  | 'seed-b52'
  | 'seed-red-dragon'
  | 'seed-justina'
  | 'seed-pinguicula'
  | 'growlight'
  | 'greenhouse'
  | 'gnome'
  | 'rug'
  | 'poster'
  | 'radio'
  | 'lamp'
  | 'computer'
  | 'pot-blue'
  | 'pot-mint'
  | 'pot-plum'
  | 'googly-eyes'
  | 'bow'
  | 'tadpole-jar'
  | 'bird-feeder'
  | 'fly-pack'
  | 'mosquito-pack'
  | 'moth-pack'
  | 'spider-pack'
  | 'trampoline'

export interface TrapState {
  id: string
  usesLeft: number
  /** Epoch ms until digestion finishes; the trap is closed and unusable meanwhile. */
  digestingUntil: number | null
  /** Epoch ms when the trap withered (all uses spent); a fresh trap regrows later. */
  witheredAt: number | null
}

/** The moments a plant's diary remembers — text lives in the locale files. */
export type JournalKind =
  | 'planted'
  | 'firstPage'
  | 'stage'
  | 'firstCatch'
  | 'stalk'
  | 'bloomed'
  | 'cut'
  | 'wilted'
  | 'recovered'
  | 'sleep'
  | 'wake'
  | 'repot'
  | 'dressed'
  | 'died'

export interface JournalEntry {
  /** Game-clock ms when it happened. */
  at: number
  kind: JournalKind
  /** For 'stage' entries: the stage that was reached. */
  stage?: number
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
  /** Cosmetic rarity of the species (dionaea only for now) — care is identical. */
  cultivar: CultivarId | null
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
  /** One cosmetic at a time — buying another swaps it (like repotting). */
  accessory: AccessoryId | null
  flowering: FloweringState | null
  /** When the last flowering ended (cut, bloomed or slept away) — the stalk rests before returning. */
  lastFloweringEndedAt: number | null
  wilted: boolean
  dormant: boolean
  /** Hard mode only — permanently gone, slot can be cleared. */
  dead: boolean
  /** Hard mode: when health first hit the floor; death after enough hours. */
  criticalSince: number | null
  /** The diary: milestones only, oldest first, capped. */
  journal: JournalEntry[]
}

/**
 * Pets have no needs — the plants are the ones that need you. These flags
 * only remember who has moved in and how the frog's metamorphosis is going.
 */
export interface PetsState {
  /** Game-clock ms when the tadpole jar was bought; the frog grows from here. */
  tadpoleSince: number | null
  /** The rainy-day cat was let in and now sleeps on the bed. */
  cat: boolean
  /** Gentle snail relocations so far — enough of them and it moves in. */
  snailRescues: number
  /** The snail lives in a jar on the desk now (air holes included). */
  snail: boolean
  /** Last rescue, so back-to-back taps can't farm the little reward. */
  lastSnailAt: number | null
  /** The autumn spider accepted a corner tenancy — pays rent in caught bugs. */
  spider: boolean
  /** Last time the web's rent was collected. */
  lastWebLootAt: number | null
  /** Last ladybird greeting — luck comes at its own gentle pace. */
  lastLadybirdAt: number | null
  /** Last robin greeting at the bird feeder. */
  lastRobinAt: number | null
  /** Last butterfly greeting — spring and summer's visitor. */
  lastButterflyAt: number | null
  /** Last hedgehog greeting on the greenhouse lawn. */
  lastHedgehogAt: number | null
}

export interface GameTime {
  /** Game ms per real ms — 1 is real time. */
  scale: number
  /** Real epoch ms when the current scale took effect. */
  realAnchor: number
  /** Game-clock ms at that same moment. */
  gameAnchor: number
}

export interface GameState {
  saveVersion: number
  /** Wall-clock time of the last change — cloud sync compares this, never game time. */
  updatedAt: number
  /** Game-clock time the sim last advanced to; every sim timestamp lives on this clock. */
  lastTickAt: number
  rngSeed: number
  time: GameTime
  plants: PlantState[]
  activePlantId: string
  /** packs: bought-but-unreleased boxes of insects, counted per kind. */
  inventory: { dewdrops: number; items: string[]; packs: Record<PackKind, number> }
  weather: { rainBarrel: number }
  minigames: { lastRaindropAt: number | null; lastWishAt: number | null }
  /** Three daily tasks (redrawn each UTC day) and two weekly ones (Mondays). */
  quests: { day: string; items: QuestState[]; week: string; weekItems: WeeklyQuestState[] }
  pets: PetsState
  /** The desk computer's arcade: best score ever, and today's payout so far. */
  arcade: { best: number; day: string; paidToday: number }
  /** locale '' means no explicit choice — the UI follows the browser language. */
  settings: { sound: boolean; music: boolean; locale: string; hardMode: boolean }
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
  | { type: 'wishOnStar' }
  | { type: 'markFireflies' }
  | { type: 'letCatIn' }
  | { type: 'rescueSnail' }
  | { type: 'adoptSpider' }
  | { type: 'lootWeb' }
  | { type: 'greetLadybird' }
  | { type: 'greetRobin' }
  | { type: 'greetButterfly' }
  | { type: 'greetHedgehog' }
  | { type: 'arcadeScore'; score: number }
  | { type: 'releasePack'; insect: PackKind }
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
  | { type: 'setTimeScale'; scale: number }
  | { type: 'setSound'; on: boolean }
  | { type: 'setMusic'; on: boolean }
  | { type: 'setLocale'; locale: string }
  | { type: 'setHardMode'; on: boolean }
