import { award } from './achievements'
import { SIM } from './config'
import { INSECTS } from './insects'
import { seasonAt } from './season'
import { isTrapReady } from './selectors'
import { MAX_PLANTS, shopItem } from './shop'
import { SPECIES } from './species'
import { createPlant } from './state'
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
  const plant = activeOf(s)
  if (!plant) return s

  switch (action.type) {
    case 'water': {
      if (unavailable(plant) || plant.water >= 100) return s
      if (s.weather.rainBarrel < SIM.WATER_COST) return s
      const paid: GameState = {
        ...s,
        weather: { ...s.weather, rainBarrel: s.weather.rainBarrel - SIM.WATER_COST },
      }
      return bumpCareStreak(withPlant(paid, { ...plant, water: 100 }, now), now)
    }
    case 'tapWater': {
      if (unavailable(plant) || plant.water >= 100) return s
      const health = clamp(plant.health - SIM.TAP_WATER_HEALTH_PENALTY, SIM.HEALTH_MIN, 100)
      return bumpCareStreak(withPlant(s, { ...plant, water: 100, health }, now), now)
    }
    case 'mist': {
      if (unavailable(plant) || !SPECIES[plant.speciesId].needsMisting) return s
      if (plant.humidity >= 100) return s
      return bumpCareStreak(withPlant(s, { ...plant, humidity: 100 }, now), now)
    }
    case 'pet': {
      if (plant.dead || plant.dormant) return s
      if (plant.lastPetAt !== null && now - plant.lastPetAt < SIM.PET_COOLDOWN_HOURS * HOUR_MS) {
        return s
      }
      const petted = withPlant(s, { ...plant, lastPetAt: now }, now)
      return {
        ...petted,
        inventory: {
          ...petted.inventory,
          dewdrops: petted.inventory.dewdrops + SIM.PET_DEWDROPS,
        },
      }
    }
    case 'feedPlant': {
      if (unavailable(plant) || plant.wilted || SPECIES[plant.speciesId].isSnapper) return s
      if (
        plant.lastFedAt !== null &&
        now - plant.lastFedAt < SIM.FEED_PLANT_COOLDOWN_HOURS * HOUR_MS
      ) {
        return s
      }
      const nutrition = clamp(plant.nutrition + SIM.FEED_PLANT_NUTRITION, 0, 100)
      return bumpCareStreak(withPlant(s, { ...plant, nutrition, lastFedAt: now }, now), now)
    }
    case 'feedTrap': {
      const target = s.plants.find((candidate) => candidate.id === action.plantId)
      if (!target || unavailable(target) || target.wilted) return s
      const trap = target.traps.find((candidate) => candidate.id === action.trapId)
      if (!trap || !isTrapReady(trap, now)) return s
      const traps = spendTrapUse(target, trap.id, now, 1)
      const nutrition = clamp(target.nutrition + SIM.HAND_FEED_NUTRITION, 0, 100)
      return bumpCareStreak(withPlant(s, { ...target, traps, nutrition }, now), now)
    }
    case 'catchInsect': {
      const target = s.plants.find((candidate) => candidate.id === action.plantId)
      if (!target || unavailable(target) || target.wilted) return s
      if (!SPECIES[target.speciesId].isSnapper) return s
      const trap = target.traps.find((candidate) => candidate.id === action.trapId)
      if (!trap || !isTrapReady(trap, now)) return s
      const def = INSECTS[action.insect]
      const digestFactor = action.insect === 'beetle' ? SIM.BEETLE_DIGEST_FACTOR : 1
      const traps = spendTrapUse(target, trap.id, now, digestFactor)
      const nutrition = clamp(target.nutrition + def.nutrition, 0, 100)
      let next = withPlant(s, { ...target, traps, nutrition }, now)
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
      if (unavailable(plant) || plant.placement === action.placement) return s
      if (action.placement === 'growlight' && !s.inventory.items.includes('growlight')) return s
      return withPlant(s, { ...plant, placement: action.placement }, now)
    }
    case 'rename': {
      const nickname = action.nickname.trim().slice(0, SIM.NICKNAME_MAX_LENGTH)
      if (!nickname || nickname === plant.nickname) return s
      return withPlant(s, { ...plant, nickname }, now)
    }
    case 'selectPlant': {
      if (s.activePlantId === action.plantId) return s
      if (!s.plants.some((candidate) => candidate.id === action.plantId)) return s
      return { ...s, activePlantId: action.plantId, updatedAt: now }
    }
    case 'buy': {
      const item = shopItem(action.item)
      if (!item || s.inventory.dewdrops < item.cost) return s
      if (item.kind === 'seed') {
        if (s.plants.length >= MAX_PLANTS || !item.speciesId) return s
        const id = `p${s.plants.map((p) => p.id).reduce((max, pid) => Math.max(max, Number(pid.slice(1)) || 0), 0) + 1}`
        const sprout = createPlant(id, item.speciesId)
        return {
          ...s,
          plants: [...s.plants, sprout],
          activePlantId: sprout.id,
          inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops - item.cost },
          updatedAt: now,
        }
      }
      if (item.kind === 'unlock' || item.kind === 'deco') {
        if (s.inventory.items.includes(item.id)) return s
        return {
          ...s,
          inventory: {
            dewdrops: s.inventory.dewdrops - item.cost,
            items: [...s.inventory.items, item.id],
          },
          updatedAt: now,
        }
      }
      // pot: a physical repot of the active plant — repeatable per plant
      if (!item.potColor || plant.potColor === item.potColor) return s
      const repotted = withPlant(s, { ...plant, potColor: item.potColor }, now)
      return {
        ...repotted,
        inventory: { ...repotted.inventory, dewdrops: repotted.inventory.dewdrops - item.cost },
      }
    }
    case 'setDormant': {
      if (plant.dead || !SPECIES[plant.speciesId].needsDormancy) return s
      if (action.on) {
        if (seasonAt(now) !== 'winter' || plant.dormant) return s
        return withPlant(s, { ...plant, dormant: true, flowering: null }, now)
      }
      if (!plant.dormant) return s
      return withPlant(s, { ...plant, dormant: false }, now)
    }
    case 'cutFlower': {
      if (unavailable(plant) || !plant.flowering || plant.flowering.blooming) return s
      const next = withPlant(s, { ...plant, flowering: null }, now)
      return {
        ...next,
        inventory: {
          ...next.inventory,
          dewdrops: next.inventory.dewdrops + SIM.CUT_REWARD_DEWDROPS,
        },
      }
    }
    case 'letBloom': {
      if (unavailable(plant) || !plant.flowering || plant.flowering.blooming) return s
      return withPlant(s, { ...plant, flowering: { startedAt: now, blooming: true } }, now)
    }
    case 'removePlant': {
      const target = s.plants.find((candidate) => candidate.id === action.plantId)
      if (!target || !target.dead || s.plants.length <= 1) return s
      const plants = s.plants.filter((candidate) => candidate.id !== action.plantId)
      const activePlantId = s.activePlantId === action.plantId ? plants[0].id : s.activePlantId
      return { ...s, plants, activePlantId, updatedAt: now }
    }
    case 'setSound': {
      if (s.settings.sound === action.on) return s
      return { ...s, settings: { ...s.settings, sound: action.on }, updatedAt: now }
    }
    case 'setLocale': {
      if (s.settings.locale === action.locale) return s
      return { ...s, settings: { ...s.settings, locale: action.locale }, updatedAt: now }
    }
    case 'setHardMode': {
      if (s.settings.hardMode === action.on) return s
      return { ...s, settings: { ...s.settings, hardMode: action.on }, updatedAt: now }
    }
  }
}

const activeOf = (s: GameState): PlantState | undefined =>
  s.plants.find((plant) => plant.id === s.activePlantId) ?? s.plants[0]

const unavailable = (plant: PlantState) => plant.dead || plant.dormant

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
  return {
    ...state,
    plants: state.plants.map((candidate) => (candidate.id === plant.id ? plant : candidate)),
    updatedAt: now,
  }
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
