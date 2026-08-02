import { award } from './achievements'
import { SIM } from './config'
import { INSECTS } from './insects'
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
  if (!plant) return s

  switch (action.type) {
    case 'water': {
      if (plant.dormant || plant.water >= 100) return s
      if (s.weather.rainBarrel < SIM.WATER_COST) return s
      const paid: GameState = {
        ...s,
        weather: { ...s.weather, rainBarrel: s.weather.rainBarrel - SIM.WATER_COST },
      }
      return bumpCareStreak(withPlant(paid, { ...plant, water: 100 }, now), now)
    }
    case 'tapWater': {
      if (plant.dormant || plant.water >= 100) return s
      const health = clamp(plant.health - SIM.TAP_WATER_HEALTH_PENALTY, SIM.HEALTH_MIN, 100)
      return bumpCareStreak(withPlant(s, { ...plant, water: 100, health }, now), now)
    }
    case 'feedTrap': {
      if (plant.dormant) return s
      const trap = plant.traps.find((candidate) => candidate.id === action.trapId)
      if (!trap || !isTrapReady(trap, now)) return s
      const traps = spendTrapUse(plant, trap.id, now, 1)
      const nutrition = clamp(plant.nutrition + SIM.HAND_FEED_NUTRITION, 0, 100)
      return bumpCareStreak(withPlant(s, { ...plant, traps, nutrition }, now), now)
    }
    case 'catchInsect': {
      if (plant.dormant) return s
      const trap = plant.traps.find((candidate) => candidate.id === action.trapId)
      if (!trap || !isTrapReady(trap, now)) return s
      const def = INSECTS[action.insect]
      const digestFactor = action.insect === 'beetle' ? SIM.BEETLE_DIGEST_FACTOR : 1
      const traps = spendTrapUse(plant, trap.id, now, digestFactor)
      const nutrition = clamp(plant.nutrition + def.nutrition, 0, 100)
      let next = withPlant(s, { ...plant, traps, nutrition }, now)
      if (def.dewdrops > 0) {
        next = {
          ...next,
          inventory: { ...next.inventory, dewdrops: next.inventory.dewdrops + def.dewdrops },
        }
      }
      if (action.insect === 'beetle') next = award(next, 'beetle-lesson')
      else next = award(next, 'first-catch')
      if (action.insect === 'spider') next = award(next, 'spider-snack')
      return bumpCareStreak(next, now)
    }
    case 'move': {
      if (plant.placement === action.placement) return s
      return withPlant(s, { ...plant, placement: action.placement }, now)
    }
    case 'rename': {
      const nickname = action.nickname.trim().slice(0, SIM.NICKNAME_MAX_LENGTH)
      if (!nickname || nickname === plant.nickname) return s
      return withPlant(s, { ...plant, nickname }, now)
    }
    case 'setSound': {
      if (s.settings.sound === action.on) return s
      return { ...s, settings: { ...s.settings, sound: action.on }, updatedAt: now }
    }
  }
}

function spendTrapUse(plant: PlantState, trapId: string, now: number, digestFactor: number) {
  return plant.traps.map((trap) =>
    trap.id === trapId
      ? {
          ...trap,
          usesLeft: trap.usesLeft - 1,
          digestingUntil: now + SIM.DIGEST_HOURS * digestFactor * HOUR_MS,
        }
      : trap,
  )
}

function withPlant(state: GameState, plant: PlantState, now: number): GameState {
  return { ...state, plants: [plant, ...state.plants.slice(1)], updatedAt: now }
}

/** UTC day key — deterministic across timezones and offline catch-up. */
const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10)

function bumpCareStreak(state: GameState, now: number): GameState {
  const day = dayKey(now)
  if (state.careStreak.lastDay === day) return state
  const days = state.careStreak.days + 1
  const next: GameState = { ...state, careStreak: { days, lastDay: day } }
  return days >= SIM.GREEN_THUMB_DAYS ? award(next, 'green-thumb') : next
}
