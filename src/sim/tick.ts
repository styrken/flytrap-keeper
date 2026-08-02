import { SIM } from './config'
import { SPECIES } from './species'
import { freshTrap } from './state'
import type { GameState, PlantState } from './types'
import { clamp, HOUR_MS } from './util'

/**
 * Advance the world to `now`. Pure and deterministic — the same function handles
 * live ticks and offline catch-up. Never trust timers for elapsed time; this is
 * always driven by wall-clock timestamps.
 */
export function tick(state: GameState, now: number): GameState {
  if (now === state.lastTickAt) return state
  if (now < state.lastTickAt) {
    // Clock went backwards (drift, timezone games) — resync without simulating.
    return { ...state, lastTickAt: now, updatedAt: now }
  }

  const elapsedMs = now - state.lastTickAt
  const simMs = Math.min(elapsedMs, SIM.OFFLINE_CAP_HOURS * HOUR_MS)
  const stepMs = SIM.TICK_STEP_MINUTES * 60_000

  // Simulate the window [now - simMs, now] in fixed sub-steps so threshold
  // crossings (running dry, digestion finishing) land in the right order.
  let t = now - simMs
  let plants = state.plants
  while (t < now) {
    const dt = Math.min(stepMs, now - t)
    t += dt
    plants = plants.map((plant) => stepPlant(plant, dt / HOUR_MS, t))
  }

  return { ...state, plants, lastTickAt: now, updatedAt: now }
}

function stepPlant(plant: PlantState, hours: number, t: number): PlantState {
  if (plant.dormant) return plant
  const species = SPECIES[plant.speciesId]

  const water = clamp(plant.water - SIM.WATER_DECAY_PER_HOUR * hours, 0, 100)
  const nutrition = clamp(plant.nutrition - SIM.NUTRITION_DECAY_PER_HOUR * hours, 0, 100)

  let health = plant.health
  if (water <= 0) health -= SIM.HEALTH_DECAY_DRY_PER_HOUR * hours
  else if (water < SIM.WATER_LOW) health -= SIM.HEALTH_DECAY_THIRSTY_PER_HOUR * hours
  else if (water >= SIM.WATER_REGEN_THRESHOLD) health += SIM.HEALTH_REGEN_PER_HOUR * hours
  health = clamp(health, SIM.HEALTH_MIN, 100)

  let wilted = plant.wilted
  if (!wilted && health <= SIM.WILT_BELOW) wilted = true
  else if (wilted && health >= SIM.RECOVER_AT) wilted = false

  let xp = plant.xp
  if (!wilted && water > 0) {
    const light = species.lightLevels[plant.placement]
    const waterFactor = water >= SIM.WATER_OK_THRESHOLD ? 1 : water / SIM.WATER_OK_THRESHOLD
    const nutritionBonus = 1 + SIM.NUTRITION_XP_BONUS_MAX * (nutrition / 100)
    xp += SIM.BASE_XP_PER_HOUR * light * waterFactor * nutritionBonus * hours
  }

  let stage = plant.stage
  while (stage + 1 < species.stages.length && xp >= species.stages[stage + 1].xpThreshold) {
    stage += 1
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

  return { ...plant, water, nutrition, health, wilted, xp, stage, traps, trapSeq }
}
