import { SPECIES } from './species'
import type { GameState, PlantState, TrapState } from './types'

export const activePlant = (state: GameState): PlantState | undefined => state.plants[0]

export const isTrapReady = (trap: TrapState, now: number): boolean =>
  trap.witheredAt === null &&
  trap.usesLeft > 0 &&
  (trap.digestingUntil === null || trap.digestingUntil <= now)

export const readyTrapCount = (plant: PlantState, now: number): number =>
  plant.traps.filter((trap) => isTrapReady(trap, now)).length

export const firstReadyTrap = (plant: PlantState, now: number): TrapState | undefined =>
  plant.traps.find((trap) => isTrapReady(trap, now))

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

export type Mood = 'happy' | 'thirsty' | 'hungry' | 'wilted'

export function mood(plant: PlantState): Mood {
  if (plant.wilted) return 'wilted'
  if (plant.water < 30) return 'thirsty'
  if (plant.nutrition < 25) return 'hungry'
  return 'happy'
}
