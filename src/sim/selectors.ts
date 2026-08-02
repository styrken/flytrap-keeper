import { SIM } from './config'
import { SPECIES } from './species'
import type { GameState, PlantState, TrapState } from './types'
import { HOUR_MS } from './util'

export const activePlant = (state: GameState): PlantState | undefined =>
  state.plants.find((plant) => plant.id === state.activePlantId) ?? state.plants[0]

export const speciesOf = (plant: PlantState) => SPECIES[plant.speciesId]

export const isTrapReady = (trap: TrapState, now: number): boolean =>
  trap.witheredAt === null &&
  trap.usesLeft > 0 &&
  (trap.digestingUntil === null || trap.digestingUntil <= now)

export const readyTrapCount = (plant: PlantState, now: number): number =>
  plant.traps.filter((trap) => isTrapReady(trap, now)).length

export const firstReadyTrap = (plant: PlantState, now: number): TrapState | undefined =>
  plant.traps.find((trap) => isTrapReady(trap, now))

export const canRainWater = (state: GameState): boolean => {
  const plant = activePlant(state)
  return !!plant && plant.water < 100 && state.weather.rainBarrel >= SIM.WATER_COST
}

export const canFeedPlant = (plant: PlantState, now: number): boolean =>
  !speciesOf(plant).isSnapper &&
  !plant.wilted &&
  (plant.lastFedAt === null || now - plant.lastFedAt >= SIM.FEED_PLANT_COOLDOWN_HOURS * HOUR_MS)

export interface StageProgress {
  stage: number
  isMax: boolean
  /** 0..1 progress from the current stage threshold to the next. */
  fraction: number
}

export function stageProgress(plant: PlantState): StageProgress {
  const stages = SPECIES[plant.speciesId].stages
  const current = stages[plant.stage].xpThreshold
  const next = stages[plant.stage + 1]?.xpThreshold
  if (next === undefined) return { stage: plant.stage, isMax: true, fraction: 1 }
  return {
    stage: plant.stage,
    isMax: false,
    fraction: Math.min(1, (plant.xp - current) / (next - current)),
  }
}

export const lightLevel = (plant: PlantState): number =>
  SPECIES[plant.speciesId].lightLevels[plant.placement]

export type Mood = 'happy' | 'thirsty' | 'hungry' | 'dry' | 'sleepy' | 'wilted' | 'dead' | 'dormant'

export function mood(plant: PlantState, winter = false): Mood {
  if (plant.dead) return 'dead'
  if (plant.dormant) return 'dormant'
  if (plant.wilted) return 'wilted'
  if (plant.water < 30) return 'thirsty'
  if (speciesOf(plant).needsMisting && plant.humidity < 30) return 'dry'
  if (winter && speciesOf(plant).needsDormancy) return 'sleepy'
  if (plant.nutrition < 25) return 'hungry'
  return 'happy'
}
