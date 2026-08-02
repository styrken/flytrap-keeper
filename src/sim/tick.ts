import { award } from './achievements'
import { SIM } from './config'
import { remember } from './journal'
import { frogStage, hasFullHouse } from './pets'
import { drawQuests } from './quests'
import { seasonAt } from './season'
import { SPECIES } from './species'
import { freshTrap } from './state'
import { toGameTime } from './time'
import type { GameState, PlantState } from './types'
import { clamp, dayKey, HOUR_MS } from './util'
import { weatherAt } from './weather'

interface StepEvents {
  bloomed: boolean
}

/**
 * Advance the world to the game-clock time for wall-clock `realNow`. Pure and
 * deterministic — the same function handles live ticks and offline catch-up.
 * Never trust timers for elapsed time; this is always driven by timestamps.
 * In speed mode the game clock runs faster than the wall clock, so one real
 * minute can simulate an hour — all sim timestamps live on the game clock.
 */
export function tick(state: GameState, realNow: number): GameState {
  const now = toGameTime(state.time, realNow)
  if (now === state.lastTickAt) return state
  if (now < state.lastTickAt) {
    // Clock went backwards (drift, timezone games) — resync without simulating.
    return { ...state, lastTickAt: now, updatedAt: realNow }
  }

  const elapsedMs = now - state.lastTickAt
  const simMs = Math.min(elapsedMs, SIM.OFFLINE_CAP_HOURS * HOUR_MS)
  const stepMs = SIM.TICK_STEP_MINUTES * 60_000

  // Simulate the window [now - simMs, now] in fixed sub-steps so threshold
  // crossings (running dry, digestion finishing, rain periods) land in order.
  let t = now - simMs
  let plants = state.plants
  let rainBarrel = state.weather.rainBarrel
  let barrelHitCap = false
  const events: StepEvents = { bloomed: false }
  const hardMode = state.settings.hardMode

  while (t < now) {
    const dt = Math.min(stepMs, now - t)
    t += dt
    const hours = dt / HOUR_MS
    if (weatherAt(state.rngSeed, t) === 'rain') {
      rainBarrel = clamp(rainBarrel + SIM.RAIN_FILL_PER_HOUR * hours, 0, SIM.BARREL_CAP)
      if (rainBarrel >= SIM.BARREL_CAP) barrelHitCap = true
    }
    plants = plants.map((plant) => stepPlant(plant, hours, t, hardMode, events))
  }

  let next: GameState = {
    ...state,
    plants,
    weather: { ...state.weather, rainBarrel },
    lastTickAt: now,
    updatedAt: realNow,
  }

  if (events.bloomed) {
    next = {
      ...next,
      inventory: {
        ...next.inventory,
        dewdrops: next.inventory.dewdrops + SIM.BLOOM_REWARD_DEWDROPS,
      },
    }
    next = award(next, 'in-bloom')
  }

  const before = state.plants[0]
  const after = plants[0]
  if (before && after) {
    if (after.stage >= 2) next = award(next, 'stage-adult')
    if (after.stage >= 3) next = award(next, 'stage-mature')
    if (before.wilted && !after.wilted) next = award(next, 'survivor')
  }
  if (barrelHitCap) next = award(next, 'rain-collector')

  // The tadpole finishing its metamorphosis is a tick-time event too.
  if (frogStage(next.pets, now) >= 4) {
    next = award(next, 'pet-frog')
    if (hasFullHouse(next, now)) next = award(next, 'full-house')
  }

  // A new day brings three fresh quests.
  if (dayKey(now) !== next.quests.day) {
    next = { ...next, quests: drawQuests(next.rngSeed, now, next.plants) }
  }

  return next
}

function stepPlant(
  plant: PlantState,
  hours: number,
  t: number,
  hardMode: boolean,
  events: StepEvents,
): PlantState {
  if (plant.dead) return plant
  const season = seasonAt(t)
  if (plant.dormant) {
    // Dormancy is a full pause (built-in vacation mode); wake with the spring.
    return season === 'winter' ? plant : remember({ ...plant, dormant: false }, 'wake', t)
  }
  const species = SPECIES[plant.speciesId]

  const water = clamp(plant.water - SIM.WATER_DECAY_PER_HOUR * hours, 0, 100)
  let nutrition = clamp(plant.nutrition - SIM.NUTRITION_DECAY_PER_HOUR * hours, 0, 100)
  if (species.passiveCatch && nutrition < SIM.PASSIVE_CATCH_CAP) {
    nutrition = Math.min(SIM.PASSIVE_CATCH_CAP, nutrition + SIM.PASSIVE_CATCH_PER_HOUR * hours)
  }
  const humidityDrain =
    plant.placement === 'greenhouse'
      ? SIM.HUMIDITY_DECAY_PER_HOUR * SIM.GREENHOUSE_HUMIDITY_FACTOR
      : SIM.HUMIDITY_DECAY_PER_HOUR
  const humidity = species.needsMisting
    ? clamp(plant.humidity - humidityDrain * hours, 0, 100)
    : plant.humidity

  // A temperate plant kept awake through winter is exhausted: it never
  // recovers health and slowly wears down — dormancy is the answer.
  const winterSkip = species.needsDormancy && season === 'winter'
  let health = plant.health
  if (water <= 0) health -= SIM.HEALTH_DECAY_DRY_PER_HOUR * hours
  else if (water < SIM.WATER_LOW) health -= SIM.HEALTH_DECAY_THIRSTY_PER_HOUR * hours
  else if (water >= SIM.WATER_REGEN_THRESHOLD && !winterSkip) {
    health += SIM.HEALTH_REGEN_PER_HOUR * hours
  }
  if (species.needsMisting && humidity < SIM.HUMIDITY_LOW) {
    health -= SIM.HUMIDITY_HEALTH_DECAY_PER_HOUR * hours
  }
  if (winterSkip) health -= SIM.WINTER_SKIP_HEALTH_DECAY_PER_HOUR * hours
  health = clamp(health, SIM.HEALTH_MIN, 100)

  // Hard mode: too long on the floor is fatal (opt-in).
  let criticalSince = plant.criticalSince
  let dead: boolean = plant.dead
  if (hardMode && health <= SIM.HEALTH_MIN) {
    criticalSince ??= t
    if (t - criticalSince >= SIM.HARD_MODE_DEATH_HOURS * HOUR_MS) dead = true
  } else {
    criticalSince = null
  }

  let wilted = plant.wilted
  if (!wilted && health <= SIM.WILT_BELOW) wilted = true
  else if (wilted && health >= SIM.RECOVER_AT) wilted = false

  let xp = plant.xp
  if (!wilted && water > 0) {
    const light = species.lightLevels[plant.placement]
    const waterFactor = water >= SIM.WATER_OK_THRESHOLD ? 1 : water / SIM.WATER_OK_THRESHOLD
    const humidityFactor =
      species.needsMisting && humidity < SIM.HUMIDITY_OK
        ? Math.max(0.4, humidity / SIM.HUMIDITY_OK)
        : 1
    const nutritionBonus = 1 + SIM.NUTRITION_XP_BONUS_MAX * (nutrition / 100)
    xp += SIM.BASE_XP_PER_HOUR * light * waterFactor * humidityFactor * nutritionBonus * hours
  }

  let stage = plant.stage
  while (stage + 1 < species.stages.length && xp >= species.stages[stage + 1].xpThreshold) {
    stage += 1
  }

  // Flowering (flytrap only, phase 5): the stalk appears at peak condition.
  let flowering = plant.flowering
  if (
    species.id === 'dionaea' &&
    flowering === null &&
    stage >= 3 &&
    xp >= SIM.FLOWER_XP &&
    !wilted &&
    health > 85
  ) {
    flowering = { startedAt: t, blooming: false }
  }
  let bloomedNow = false
  if (flowering?.blooming) {
    health = clamp(
      health - (SIM.BLOOM_HEALTH_COST_TOTAL / SIM.BLOOM_HOURS) * hours,
      SIM.HEALTH_MIN,
      100,
    )
    if (t - flowering.startedAt >= SIM.BLOOM_HOURS * HOUR_MS) {
      flowering = null
      events.bloomed = true
      bloomedNow = true
    }
  }

  let trapSeq = plant.trapSeq
  let traps = plant.traps.map((trap) => {
    if (trap.digestingUntil !== null && t >= trap.digestingUntil) {
      return {
        ...trap,
        digestingUntil: null,
        witheredAt: trap.usesLeft <= 0 ? t : trap.witheredAt,
      }
    }
    return trap
  })

  traps = traps.map((trap) => {
    const regrowReady =
      trap.witheredAt !== null && !wilted && t - trap.witheredAt >= SIM.TRAP_REGROW_HOURS * HOUR_MS
    if (!regrowReady) return trap
    trapSeq += 1
    return freshTrap(`t${trapSeq}`)
  })

  while (traps.length < species.stages[stage].trapCount) {
    trapSeq += 1
    traps = [...traps, freshTrap(`t${trapSeq}`)]
  }

  let next: PlantState = {
    ...plant,
    water,
    nutrition,
    humidity,
    health,
    wilted,
    xp,
    stage,
    traps,
    trapSeq,
    flowering,
    criticalSince,
    dead,
  }

  // The diary notices what changed in this step, in the order it happened.
  if (stage > plant.stage) next = remember(next, 'stage', t, stage)
  if (!plant.wilted && wilted) next = remember(next, 'wilted', t)
  if (plant.wilted && !wilted) next = remember(next, 'recovered', t)
  if (plant.flowering === null && flowering !== null) next = remember(next, 'stalk', t)
  if (bloomedNow) next = remember(next, 'bloomed', t)
  if (!plant.dead && dead) next = remember(next, 'died', t)

  return next
}
