import { SIM } from './config'
import { SAVE_VERSION } from './save'
import { DEFAULT_NICKNAMES, SPECIES } from './species'
import type { GameState, PlantState, SpeciesId, TrapState } from './types'

export const freshTrap = (id: string): TrapState => ({
  id,
  usesLeft: SIM.TRAP_USES,
  digestingUntil: null,
  witheredAt: null,
})

export function createPlant(id: string, speciesId: SpeciesId, now: number): PlantState {
  const trapCount = SPECIES[speciesId].stages[0].trapCount
  return {
    id,
    speciesId,
    nickname: DEFAULT_NICKNAMES[speciesId],
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
    flowering: null,
    wilted: false,
    dormant: false,
    dead: false,
    criticalSince: null,
  }
}

export function createInitialState(now: number, seed: number): GameState {
  const plant = createPlant('p1', 'dionaea', now)
  return {
    saveVersion: SAVE_VERSION,
    updatedAt: now,
    lastTickAt: now,
    rngSeed: seed >>> 0,
    plants: [plant],
    activePlantId: plant.id,
    inventory: { dewdrops: 0, items: [] },
    weather: { rainBarrel: SIM.BARREL_INITIAL },
    minigames: { lastRaindropAt: null },
    settings: { sound: true, locale: 'en', hardMode: false },
    careStreak: { days: 0, lastDay: null },
    achievements: [],
  }
}
