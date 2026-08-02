import { SIM } from './config'
import type { GameState } from './types'

export const ACHIEVEMENTS = [
  'first-catch',
  'spider-snack',
  'beetle-lesson',
  'stage-adult',
  'stage-mature',
  'green-thumb',
  'rain-collector',
  'survivor',
  'in-bloom',
  'night-owl',
  'first-wish',
  'firefly-night',
  'cultivar-collector',
  'pet-frog',
  'pet-cat',
  'pet-snail',
  'pet-spider',
  'ladybird-luck',
  'robin-song',
  'safe-landing',
  'evening-snuffler',
  'full-house',
  'full-collection',
] as const

export type AchievementId = (typeof ACHIEVEMENTS)[number]

/** Idempotent: awarding an already-earned achievement is a no-op. */
export function award(state: GameState, id: AchievementId): GameState {
  if (state.achievements.includes(id)) return state
  return {
    ...state,
    achievements: [...state.achievements, id],
    inventory: {
      ...state.inventory,
      dewdrops: state.inventory.dewdrops + SIM.ACHIEVEMENT_DEWDROPS,
    },
  }
}
