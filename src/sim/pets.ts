import { SIM } from './config'
import { mulberry32 } from './rng'
import type { GameState, PetsState } from './types'
import { DAY_MS } from './util'
import { currentWeather, weatherPeriodMs } from './weather'

/**
 * The tadpole's metamorphosis, derived purely from elapsed game time:
 * -1 no jar · 0 egg · 1 tadpole · 2 legs! · 3 froglet · 4 grown frog
 * (who promptly moves out to the greenhouse). No tick bookkeeping needed —
 * offline time counts in full, vacations included.
 */
export function frogStage(pets: PetsState, now: number): number {
  if (pets.tadpoleSince === null) return -1
  const days = (now - pets.tadpoleSince) / DAY_MS
  return SIM.TADPOLE_STAGE_DAYS.filter((threshold) => days >= threshold).length
}

/**
 * A soaked cat waits out some rain periods on the outer sill — deterministic
 * per (seed, rain period) like the weather itself, until someone opens the
 * window. Once adopted it never sits in the rain again.
 */
export function catAtWindow(state: GameState, now: number): boolean {
  if (state.pets.cat) return false
  if (currentWeather(state, now) !== 'rain') return false
  const period = Math.floor(now / weatherPeriodMs())
  const roll = mulberry32((state.rngSeed ^ Math.imul(period, 973547)) >>> 0)()
  return roll < SIM.CAT_VISIT_CHANCE
}

/** Whether the sill snail may show up: not kept yet, and not just rescued. */
export function snailAbout(state: GameState, now: number): boolean {
  if (state.pets.snail) return false
  if (currentWeather(state, now) !== 'rain') return false
  const last = state.pets.lastSnailAt
  return last === null || now - last >= SIM.SNAIL_RESCUE_COOLDOWN_HOURS * 3_600_000
}

/** Moved-in pets: the grown frog, the cat, and the kept snail. */
export const petCount = (state: GameState, now: number): number =>
  (frogStage(state.pets, now) >= 4 ? 1 : 0) + (state.pets.cat ? 1 : 0) + (state.pets.snail ? 1 : 0)
