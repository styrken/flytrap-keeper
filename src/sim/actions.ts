import { type AchievementId, award } from './achievements'
import { SIM } from './config'
import { INSECTS, isFireflyNight } from './insects'
import { progressQuest } from './quests'
import { seasonAt } from './season'
import { currentWeather } from './weather'
import { catAtWindow, hasFullHouse, spiderAtCorner, webLootReady } from './pets'
import { seasonAt as seasonOf } from './season'
import { canMoveTo, isTrapReady } from './selectors'
import { MAX_PLANTS, hasGreenhouse, plantCapacity, shopItem, sillPlantCount } from './shop'
import { CULTIVARS, SPECIES } from './species'
import { createPlant } from './state'
import { tick } from './tick'
import { TIME_SCALES, toGameTime, withTimeScale } from './time'
import type { Action, GameState, PlantState } from './types'
import { clamp, dayKey, HOUR_MS } from './util'

/**
 * Apply a player action at wall-clock `realNow`. The rules run on the game
 * clock (`now`), which speed mode may run faster than real time. The world is
 * ticked first so the action validates against fresh state. Invalid actions
 * return the ticked state unchanged — the UI may be slightly stale, the sim
 * never is.
 */
export function apply(state: GameState, action: Action, realNow: number): GameState {
  const ticked = tick(state, realNow)
  const next = applyAction(ticked, action, toGameTime(ticked.time, realNow), realNow)
  // Sim timestamps live on the game clock; "last changed" is a wall-clock concern.
  return next === ticked ? ticked : { ...next, updatedAt: realNow }
}

function applyAction(s: GameState, action: Action, now: number, realNow: number): GameState {
  const plant = activeOf(s)
  if (!plant) return s

  switch (action.type) {
    case 'water': {
      if (unavailable(plant) || plant.water >= 100) return s
      if (s.weather.rainBarrel < SIM.WATER_COST) return s
      const paid: GameState = {
        ...s,
        weather: { ...s.weather, rainBarrel: s.weather.rainBarrel - SIM.WATER_COST },
        // A perfectly timed pour earns a little extra.
        inventory: action.perfect
          ? { ...s.inventory, dewdrops: s.inventory.dewdrops + SIM.POUR_PERFECT_DEWDROPS }
          : s.inventory,
      }
      let next = progressQuest(
        bumpCareStreak(withPlant(paid, { ...plant, water: 100 }), now),
        'water2',
      )
      if (action.perfect) next = progressQuest(next, 'pour1')
      return next
    }
    case 'catchRaindrop': {
      if (currentWeather(s, now) !== 'rain') return s
      const last = s.minigames.lastRaindropAt
      if (last !== null && now - last < SIM.RAINDROP_COOLDOWN_SECONDS * 1000) return s
      return {
        ...s,
        minigames: { ...s.minigames, lastRaindropAt: now },
        inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + SIM.RAINDROP_DEWDROPS },
      }
    }
    case 'wishOnStar': {
      // The sky decides when a star streaks by; the sim just bounds the pace.
      const last = s.minigames.lastWishAt
      if (last !== null && now - last < SIM.STAR_WISH_COOLDOWN_SECONDS * 1000) return s
      const wished: GameState = {
        ...s,
        minigames: { ...s.minigames, lastWishAt: now },
        inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + SIM.STAR_WISH_DEWDROPS },
      }
      return award(wished, 'first-wish')
    }
    case 'markFireflies': {
      // View says "the player is watching fireflies" — verify the calendar agrees.
      if (!isFireflyNight(s.rngSeed, now)) return s
      return award(s, 'firefly-night')
    }
    case 'letCatIn': {
      // Only works while the soaked cat actually sits at the window.
      if (!catAtWindow(s, now)) return s
      let next: GameState = { ...s, pets: { ...s.pets, cat: true } }
      next = award(next, 'pet-cat')
      if (hasFullHouse(next, now)) next = award(next, 'full-house')
      return next
    }
    case 'adoptSpider': {
      // Only while the trial web hangs in the corner.
      if (!spiderAtCorner(s, now)) return s
      let next: GameState = { ...s, pets: { ...s.pets, spider: true } }
      next = award(next, 'pet-spider')
      if (hasFullHouse(next, now)) next = award(next, 'full-house')
      return next
    }
    case 'lootWeb': {
      // The spider's rent: a wrapped bug now and then, never a chore.
      if (!webLootReady(s, now)) return s
      return {
        ...s,
        pets: { ...s.pets, lastWebLootAt: now },
        inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + SIM.WEB_LOOT_DEWDROPS },
      }
    }
    case 'greetLadybird': {
      // Ladybirds hibernate through winter — and luck keeps a gentle pace.
      if (seasonOf(now) === 'winter') return s
      const last = s.pets.lastLadybirdAt
      if (last !== null && now - last < SIM.LADYBIRD_COOLDOWN_HOURS * HOUR_MS) return s
      const greeted: GameState = {
        ...s,
        pets: { ...s.pets, lastLadybirdAt: now },
        inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + SIM.LADYBIRD_DEWDROPS },
      }
      return award(greeted, 'ladybird-luck')
    }
    case 'greetRobin': {
      // No feeder, no robin — it has standards.
      if (!s.inventory.items.includes('bird-feeder')) return s
      return greetGuest(s, now, 'lastRobinAt', 'robin-song')
    }
    case 'greetButterfly': {
      const season = seasonOf(now)
      if (season !== 'spring' && season !== 'summer') return s
      return greetGuest(s, now, 'lastButterflyAt', 'safe-landing')
    }
    case 'greetHedgehog': {
      // Hedgehogs sleep the winter away, curled up somewhere dry.
      if (seasonOf(now) === 'winter') return s
      return greetGuest(s, now, 'lastHedgehogAt', 'evening-snuffler')
    }
    case 'rescueSnail': {
      if (s.pets.snail) return s
      const last = s.pets.lastSnailAt
      if (last !== null && now - last < SIM.SNAIL_RESCUE_COOLDOWN_HOURS * HOUR_MS) return s
      const snailRescues = s.pets.snailRescues + 1
      // The third gentle relocation earns its trust — it moves into a jar.
      const keep = snailRescues >= SIM.SNAIL_KEEP_AT
      let next: GameState = bumpCareStreak(
        {
          ...s,
          pets: { ...s.pets, snailRescues, lastSnailAt: now, snail: keep },
          inventory: {
            ...s.inventory,
            dewdrops: s.inventory.dewdrops + SIM.SNAIL_RESCUE_DEWDROPS,
          },
        },
        now,
      )
      if (keep) {
        next = award(next, 'pet-snail')
        if (hasFullHouse(next, now)) next = award(next, 'full-house')
      }
      return next
    }
    case 'tapWater': {
      if (unavailable(plant) || plant.water >= 100) return s
      // Butterworts grow on limestone in the wild — tap water is fine by them.
      const penalty = SPECIES[plant.speciesId].limeTolerant ? 0 : SIM.TAP_WATER_HEALTH_PENALTY
      const health = clamp(plant.health - penalty, SIM.HEALTH_MIN, 100)
      return progressQuest(
        bumpCareStreak(withPlant(s, { ...plant, water: 100, health }), now),
        'water2',
      )
    }
    case 'mist': {
      if (unavailable(plant) || !SPECIES[plant.speciesId].needsMisting) return s
      if (plant.humidity >= 100) return s
      return progressQuest(bumpCareStreak(withPlant(s, { ...plant, humidity: 100 }), now), 'mist1')
    }
    case 'pet': {
      if (plant.dead || plant.dormant) return s
      if (plant.lastPetAt !== null && now - plant.lastPetAt < SIM.PET_COOLDOWN_HOURS * HOUR_MS) {
        return s
      }
      const petted = withPlant(s, { ...plant, lastPetAt: now })
      return progressQuest(
        {
          ...petted,
          inventory: {
            ...petted.inventory,
            dewdrops: petted.inventory.dewdrops + SIM.PET_DEWDROPS,
          },
        },
        'pet2',
      )
    }
    case 'pullWeed': {
      const target = s.plants.find((candidate) => candidate.id === action.plantId)
      if (!target || target.dead || target.dormant) return s
      if (now < target.nextWeedAt) return s
      const weeded = withPlant(s, { ...target, nextWeedAt: now + SIM.WEED_RESPAWN_HOURS * HOUR_MS })
      return progressQuest(
        bumpCareStreak(
          {
            ...weeded,
            inventory: {
              ...weeded.inventory,
              dewdrops: weeded.inventory.dewdrops + SIM.WEED_DEWDROPS,
            },
          },
          now,
        ),
        'weed2',
      )
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
      return bumpCareStreak(withPlant(s, { ...plant, nutrition, lastFedAt: now }), now)
    }
    case 'feedTrap': {
      const target = s.plants.find((candidate) => candidate.id === action.plantId)
      if (!target || unavailable(target) || target.wilted) return s
      const trap = target.traps.find((candidate) => candidate.id === action.trapId)
      if (!trap || !isTrapReady(trap, now)) return s
      const traps = spendTrapUse(target, trap.id, now, 1)
      const nutrition = clamp(target.nutrition + SIM.HAND_FEED_NUTRITION, 0, 100)
      return bumpCareStreak(withPlant(s, { ...target, traps, nutrition }), now)
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
      let next = withPlant(s, { ...target, traps, nutrition })
      if (def.dewdrops > 0) {
        next = {
          ...next,
          inventory: { ...next.inventory, dewdrops: next.inventory.dewdrops + def.dewdrops },
        }
      }
      if (action.insect === 'beetle') next = award(next, 'beetle-lesson')
      else {
        next = award(next, 'first-catch')
        next = progressQuest(next, 'catch2')
      }
      if (action.insect === 'spider') next = award(next, 'spider-snack')
      if (action.insect === 'moth') next = award(next, 'night-owl')
      return bumpCareStreak(next, now)
    }
    case 'move': {
      if (unavailable(plant) || plant.placement === action.placement) return s
      if (!canMoveTo(s, plant, action.placement)) return s
      return withPlant(s, { ...plant, placement: action.placement })
    }
    case 'rename': {
      const nickname = action.nickname.trim().slice(0, SIM.NICKNAME_MAX_LENGTH)
      if (!nickname || nickname === plant.nickname) return s
      return withPlant(s, { ...plant, nickname })
    }
    case 'selectPlant': {
      if (s.activePlantId === action.plantId) return s
      if (!s.plants.some((candidate) => candidate.id === action.plantId)) return s
      return { ...s, activePlantId: action.plantId }
    }
    case 'buy': {
      const item = shopItem(action.item)
      if (!item || s.inventory.dewdrops < item.cost) return s
      if (item.kind === 'seed') {
        if (s.plants.length >= plantCapacity(s) || !item.speciesId) return s
        const id = `p${s.plants.map((p) => p.id).reduce((max, pid) => Math.max(max, Number(pid.slice(1)) || 0), 0) + 1}`
        const sprout = createPlant(id, item.speciesId, now, item.cultivarId ?? null)
        // A full sill sends the new sprout straight to the greenhouse bench.
        if (sillPlantCount(s) >= MAX_PLANTS) sprout.placement = 'greenhouse'
        let next: GameState = {
          ...s,
          plants: [...s.plants, sprout],
          activePlantId: sprout.id,
          inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops - item.cost },
        }
        const grown = new Set(next.plants.map((p) => p.cultivar))
        if (CULTIVARS.every((c) => grown.has(c))) next = award(next, 'cultivar-collector')
        const speciesOwned = new Set(next.plants.map((p) => p.speciesId))
        if (speciesOwned.size >= Object.keys(SPECIES).length) {
          next = award(next, 'full-collection')
        }
        return next
      }
      if (item.kind === 'unlock' || item.kind === 'deco') {
        if (s.inventory.items.includes(item.id)) return s
        // The tadpole needs somewhere to hop off to when it's done growing.
        if (item.id === 'tadpole-jar' && !hasGreenhouse(s)) return s
        const bought: GameState = {
          ...s,
          inventory: {
            dewdrops: s.inventory.dewdrops - item.cost,
            items: [...s.inventory.items, item.id],
          },
        }
        if (item.id === 'tadpole-jar') {
          return { ...bought, pets: { ...bought.pets, tadpoleSince: now } }
        }
        return bought
      }
      if (item.kind === 'accessory') {
        // Dressing up the active plant — repeatable per plant, swaps the old one.
        if (!item.accessoryId || plant.accessory === item.accessoryId || plant.dead) return s
        const dressed = withPlant(s, { ...plant, accessory: item.accessoryId })
        return {
          ...dressed,
          inventory: { ...dressed.inventory, dewdrops: dressed.inventory.dewdrops - item.cost },
        }
      }
      // pot: a physical repot of the active plant — repeatable per plant
      if (!item.potColor || plant.potColor === item.potColor) return s
      const repotted = withPlant(s, { ...plant, potColor: item.potColor })
      return {
        ...repotted,
        inventory: { ...repotted.inventory, dewdrops: repotted.inventory.dewdrops - item.cost },
      }
    }
    case 'setDormant': {
      if (plant.dead || !SPECIES[plant.speciesId].needsDormancy) return s
      if (action.on) {
        if (seasonAt(now) !== 'winter' || plant.dormant) return s
        return withPlant(s, { ...plant, dormant: true, flowering: null })
      }
      if (!plant.dormant) return s
      return withPlant(s, { ...plant, dormant: false })
    }
    case 'cutFlower': {
      if (unavailable(plant) || !plant.flowering || plant.flowering.blooming) return s
      const next = withPlant(s, { ...plant, flowering: null })
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
      return withPlant(s, { ...plant, flowering: { startedAt: now, blooming: true } })
    }
    case 'removePlant': {
      const target = s.plants.find((candidate) => candidate.id === action.plantId)
      if (!target || !target.dead || s.plants.length <= 1) return s
      const plants = s.plants.filter((candidate) => candidate.id !== action.plantId)
      const activePlantId = s.activePlantId === action.plantId ? plants[0].id : s.activePlantId
      return { ...s, plants, activePlantId }
    }
    case 'setTimeScale': {
      if (!TIME_SCALES.some((scale) => scale === action.scale)) return s
      if (s.time.scale === action.scale) return s
      return { ...s, time: withTimeScale(s.time, action.scale, realNow) }
    }
    case 'setSound': {
      if (s.settings.sound === action.on) return s
      return { ...s, settings: { ...s.settings, sound: action.on } }
    }
    case 'setMusic': {
      if (s.settings.music === action.on) return s
      return { ...s, settings: { ...s.settings, music: action.on } }
    }
    case 'setLocale': {
      if (s.settings.locale === action.locale) return s
      return { ...s, settings: { ...s.settings, locale: action.locale } }
    }
    case 'setHardMode': {
      if (s.settings.hardMode === action.on) return s
      return { ...s, settings: { ...s.settings, hardMode: action.on } }
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

/** Shared shape of every garden-guest hello: a dewdrop on a gentle cooldown. */
function greetGuest(
  s: GameState,
  now: number,
  field: 'lastRobinAt' | 'lastButterflyAt' | 'lastHedgehogAt',
  achievement: AchievementId,
): GameState {
  const last = s.pets[field]
  if (last !== null && now - last < SIM.GUEST_COOLDOWN_HOURS * HOUR_MS) return s
  const greeted: GameState = {
    ...s,
    pets: { ...s.pets, [field]: now },
    inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + SIM.GUEST_DEWDROPS },
  }
  return award(greeted, achievement)
}

function withPlant(state: GameState, plant: PlantState): GameState {
  return {
    ...state,
    plants: state.plants.map((candidate) => (candidate.id === plant.id ? plant : candidate)),
  }
}

function bumpCareStreak(state: GameState, now: number): GameState {
  const day = dayKey(now)
  if (state.careStreak.lastDay === day) return state
  const days = state.careStreak.days + 1
  const next: GameState = {
    ...state,
    careStreak: { days, lastDay: day },
    // The day's first act of care pays a little check-in bonus.
    inventory: {
      ...state.inventory,
      dewdrops: state.inventory.dewdrops + SIM.DAILY_CARE_DEWDROPS,
    },
  }
  return days >= SIM.GREEN_THUMB_DAYS ? award(next, 'green-thumb') : next
}
