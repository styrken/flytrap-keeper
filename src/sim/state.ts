import { SIM } from './config'
import { drawQuests } from './quests'
import { SAVE_VERSION } from './save'
import { CULTIVAR_NICKNAMES, DEFAULT_NICKNAMES, SPECIES } from './species'
import type { CultivarId, GameState, PlantState, SpeciesId, TrapState } from './types'

export const freshTrap = (id: string): TrapState => ({
  id,
  usesLeft: SIM.TRAP_USES,
  digestingUntil: null,
  witheredAt: null,
})

export function createPlant(
  id: string,
  speciesId: SpeciesId,
  now: number,
  cultivar: CultivarId | null = null,
): PlantState {
  const trapCount = SPECIES[speciesId].stages[0].trapCount
  return {
    id,
    speciesId,
    cultivar,
    nickname: cultivar ? CULTIVAR_NICKNAMES[cultivar] : DEFAULT_NICKNAMES[speciesId],
    water: 90,
    nutrition: 60,
    health: 100,
    humidity: 80,
    xp: 0,
    stage: 0,
    placement: 'south-window',
    traps: Array.from({ length: trapCount }, (_, i) => freshTrap(`t${i + 1}`)),
    trapSeq: trapCount,
    lastFedAt: null,
    lastPetAt: null,
    nextWeedAt: now + SIM.WEED_FIRST_HOURS * 3_600_000,
    potColor: null,
    accessory: null,
    flowering: null,
    lastFloweringEndedAt: null,
    wilted: false,
    dormant: false,
    dead: false,
    criticalSince: null,
    journal: [{ at: now, kind: 'planted' }],
  }
}

export function createInitialState(now: number, seed: number): GameState {
  const plant = createPlant('p1', 'dionaea', now)
  return {
    saveVersion: SAVE_VERSION,
    updatedAt: now,
    lastTickAt: now,
    rngSeed: seed >>> 0,
    time: { scale: 1, realAnchor: now, gameAnchor: now },
    plants: [plant],
    activePlantId: plant.id,
    inventory: { dewdrops: 0, items: [] },
    weather: { rainBarrel: SIM.BARREL_INITIAL },
    minigames: { lastRaindropAt: null, lastWishAt: null },
    quests: drawQuests(seed >>> 0, now, [plant]),
    arcade: { best: 0, day: '', paidToday: 0 },
    pets: {
      tadpoleSince: null,
      cat: false,
      snailRescues: 0,
      snail: false,
      lastSnailAt: null,
      spider: false,
      lastWebLootAt: null,
      lastLadybirdAt: null,
      lastRobinAt: null,
      lastButterflyAt: null,
      lastHedgehogAt: null,
    },
    settings: { sound: true, music: true, locale: '', hardMode: false },
    careStreak: { days: 0, lastDay: null },
    achievements: [],
  }
}
