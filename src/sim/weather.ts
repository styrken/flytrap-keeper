import { SIM } from './config'
import { mulberry32 } from './rng'
import type { GameState, WeatherKind } from './types'
import { HOUR_MS } from './util'

export const weatherPeriodMs = () => SIM.WEATHER_PERIOD_HOURS * HOUR_MS

/**
 * Weather is a pure function of (save seed, wall-clock time) — never stored,
 * so offline catch-up and live play always agree on when it rained.
 */
export function weatherAt(seed: number, timeMs: number): WeatherKind {
  const period = Math.floor(timeMs / weatherPeriodMs())
  const roll = mulberry32((seed ^ Math.imul(period, 2654435761)) >>> 0)()
  if (roll < 0.45) return 'sun'
  if (roll < 0.75) return 'clouds'
  return 'rain'
}

export const currentWeather = (state: GameState, now: number): WeatherKind =>
  weatherAt(state.rngSeed, now)
