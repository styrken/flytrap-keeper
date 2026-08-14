// The garden's own little calendars: wind, rainbows, puddles, apples, post
// and the volunteer seedling. All pure functions of (seed, time) — like the
// weather they ride on — so every device and every offline catch-up agrees.
import { SIM } from './config'
import { mulberry32 } from './rng'
import { seasonAt } from './season'
import type { GameState } from './types'
import { DAY_MS, dayKey } from './util'
import { weatherAt, weatherPeriodMs } from './weather'

/**
 * Whether the wind is up this period. Wind is an overlay, not a fourth
 * weather kind — it can blow through sunshine, clouds and rain alike, so the
 * long-established weather odds (and everything balanced on them) stay put.
 */
export function isWindyAt(seed: number, timeMs: number): boolean {
  const period = Math.floor(timeMs / weatherPeriodMs())
  const roll = mulberry32((seed ^ Math.imul(period, 1103515245)) >>> 0)()
  return roll < SIM.WIND_PERIOD_CHANCE
}

/**
 * A rainbow spell: the sun is out, the previous period was rain, and the sky
 * feels like showing off. The view only hangs it up in daylight — the sim
 * just rules on the calendar, as it does for fireflies.
 */
export function isRainbowSpell(seed: number, timeMs: number): boolean {
  if (weatherAt(seed, timeMs) !== 'sun') return false
  if (weatherAt(seed, timeMs - weatherPeriodMs()) !== 'rain') return false
  const period = Math.floor(timeMs / weatherPeriodMs())
  const roll = mulberry32((seed ^ Math.imul(period, 2246822519)) >>> 0)()
  return roll < SIM.RAINBOW_AFTER_RAIN_CHANCE
}

/**
 * Puddles on the lawn during rain and in the period right after — the same
 * window the snails like. Winter has snow instead; puddles would be ice.
 */
export function puddlesAbout(seed: number, timeMs: number): boolean {
  if (seasonAt(timeMs) === 'winter') return false
  return (
    weatherAt(seed, timeMs) === 'rain' || weatherAt(seed, timeMs - weatherPeriodMs()) === 'rain'
  )
}

/** The one roll behind the day's post: has mail, and which letter it is. */
const mailRoll = (seed: number, timeMs: number): number => {
  const day = Math.floor(timeMs / DAY_MS)
  return mulberry32((seed ^ Math.imul(day, 3266489917)) >>> 0)()
}

/** Whether the postman came by at all today (collected or not). */
export const mailToday = (seed: number, timeMs: number): boolean =>
  mailRoll(seed, timeMs) < SIM.MAIL_CHANCE

/** Which of the letter pool today's envelope holds (locale-side texts). */
export const mailLetterIndex = (seed: number, timeMs: number): number =>
  Math.floor((mailRoll(seed, timeMs) / SIM.MAIL_CHANCE) * SIM.MAIL_LETTERS) % SIM.MAIL_LETTERS

/** Mail waiting in the box: the postman came and nobody has collected yet. */
export const hasMailWaiting = (state: GameState, now: number): boolean =>
  mailToday(state.rngSeed, now) && state.mail.lastDay !== dayKey(now)

/**
 * Whether a volunteer seedling sits in the flower box right now: a windy
 * autumn day blew it in, and this year's hasn't been potted up yet. It waits
 * out the windy spell — unclaimed, another gust brings it back.
 */
export function volunteerAbout(state: GameState, now: number): boolean {
  if (seasonAt(now) !== 'autumn') return false
  if (state.volunteerYear === new Date(now).getUTCFullYear()) return false
  return isWindyAt(state.rngSeed, now)
}
