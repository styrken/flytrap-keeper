import { SIM } from './config'
import { isTrapReady } from './selectors'
import { tick } from './tick'
import type { Action, GameState, PlantState } from './types'
import { clamp, HOUR_MS } from './util'

/**
 * Apply a player action at wall-clock `now`. The world is ticked first so the
 * action validates against fresh state. Invalid actions return the ticked
 * state unchanged — the UI may be slightly stale, the sim never is.
 */
export function apply(state: GameState, action: Action, now: number): GameState {
  const s = tick(state, now)
  const plant = s.plants[0]
  if (!plant || plant.dormant) return s

  switch (action.type) {
    case 'water': {
      if (plant.water >= 100) return s
      return withPlant(s, { ...plant, water: 100 }, now)
    }
    case 'feedTrap': {
      const trap = plant.traps.find((candidate) => candidate.id === action.trapId)
      if (!trap || !isTrapReady(trap, now)) return s
      const traps = plant.traps.map((candidate) =>
        candidate.id === trap.id
          ? {
              ...candidate,
              usesLeft: candidate.usesLeft - 1,
              digestingUntil: now + SIM.DIGEST_HOURS * HOUR_MS,
            }
          : candidate,
      )
      const nutrition = clamp(plant.nutrition + SIM.FEED_NUTRITION, 0, 100)
      return withPlant(s, { ...plant, traps, nutrition }, now)
    }
    case 'move': {
      if (plant.placement === action.placement) return s
      return withPlant(s, { ...plant, placement: action.placement }, now)
    }
  }
}

function withPlant(state: GameState, plant: PlantState, now: number): GameState {
  return { ...state, plants: [plant, ...state.plants.slice(1)], updatedAt: now }
}
