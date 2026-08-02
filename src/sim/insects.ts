import { SIM } from './config'
import { mulberry32 } from './rng'
import { seasonAt } from './season'
import type { InsectKind } from './types'
import { DAY_MS } from './util'

export interface InsectDef {
  nutrition: number
  dewdrops: number
}

export const INSECTS: Record<InsectKind, InsectDef> = {
  fly: { nutrition: 30, dewdrops: 2 },
  mosquito: { nutrition: 15, dewdrops: 1 },
  spider: { nutrition: 45, dewdrops: 5 },
  beetle: { nutrition: 0, dewdrops: 0 },
  moth: { nutrition: 25, dewdrops: 3 },
}

/** Spawn weights for the visiting-insect choreography (view layer rolls the dice). */
export function insectKindFromRoll(roll: number): InsectKind {
  if (roll < 0.55) return 'fly'
  if (roll < 0.75) return 'mosquito'
  if (roll < 0.85) return 'spider'
  return 'beetle'
}

/** Night weights while the floor lamp glows — moths can't resist it. */
export function nightInsectKindFromRoll(roll: number): InsectKind {
  if (roll < 0.5) return 'moth'
  if (roll < 0.7) return 'fly'
  if (roll < 0.85) return 'mosquito'
  if (roll < 0.93) return 'spider'
  return 'beetle'
}

/**
 * Whether tonight is a firefly night — deterministic per (seed, night) like the
 * weather, so every device agrees. A "night" is the 12:00→12:00 UTC window, so
 * the verdict doesn't flip at midnight mid-glow. Fireflies are strictly a
 * summer treat, and strictly for watching: they taste terrible (truly — they
 * are toxic to many predators).
 */
export function isFireflyNight(seed: number, timeMs: number): boolean {
  if (seasonAt(timeMs) !== 'summer') return false
  const night = Math.floor((timeMs - DAY_MS / 2) / DAY_MS)
  const roll = mulberry32((seed ^ Math.imul(night, 1597334677)) >>> 0)()
  return roll < SIM.FIREFLY_NIGHT_CHANCE
}
