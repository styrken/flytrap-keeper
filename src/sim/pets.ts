import { SIM } from './config'
import { mulberry32 } from './rng'
import { seasonAt } from './season'
import type { GameState, PetsState } from './types'
import { DAY_MS } from './util'
import { currentWeather, weatherAt, weatherPeriodMs } from './weather'

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

/**
 * Whether the sill snail may show up: not kept yet, not just rescued — and
 * out during rain or in the period right after it, as real snails are. The
 * after-rain window also keeps the snail meetable in speed mode, where a
 * single rain period can pass in real seconds.
 */
export function snailAbout(state: GameState, now: number): boolean {
  if (state.pets.snail) return false
  const last = state.pets.lastSnailAt
  if (last !== null && now - last < SIM.SNAIL_RESCUE_COOLDOWN_HOURS * 3_600_000) return false
  return (
    currentWeather(state, now) === 'rain' ||
    weatherAt(state.rngSeed, now - weatherPeriodMs()) === 'rain'
  )
}

/**
 * Autumn is spider season: on some days (deterministic per seed + day, like
 * the firefly calendar) a little spider spins a trial web in the corner and
 * waits for a verdict. Ignored, it is gone with the next day.
 */
export function spiderAtCorner(state: GameState, now: number): boolean {
  if (state.pets.spider) return false
  if (seasonAt(now) !== 'autumn') return false
  const day = Math.floor(now / DAY_MS)
  const roll = mulberry32((state.rngSeed ^ Math.imul(day, 388229)) >>> 0)()
  return roll < SIM.SPIDER_DAY_CHANCE
}

/** Whether the settled spider's web holds rent (a wrapped bug) to collect. */
export const webLootReady = (state: GameState, now: number): boolean =>
  state.pets.spider &&
  (state.pets.lastWebLootAt === null ||
    now - state.pets.lastWebLootAt >= SIM.WEB_LOOT_COOLDOWN_HOURS * 3_600_000)

/** Moved-in pets: the grown frog, the cat, the kept snail, and the spider. */
export const petCount = (state: GameState, now: number): number =>
  (frogStage(state.pets, now) >= 4 ? 1 : 0) +
  (state.pets.cat ? 1 : 0) +
  (state.pets.snail ? 1 : 0) +
  (state.pets.spider ? 1 : 0)

/** All four adoptable pets under one roof. (The ladybird is a guest, always.) */
export const hasFullHouse = (state: GameState, now: number): boolean => petCount(state, now) >= 4
