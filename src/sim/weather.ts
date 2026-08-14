import { SIM } from './config'
import { mulberry32 } from './rng'
import { seasonAt } from './season'
import type { GameState, PrecipitationKind, WeatherKind } from './types'
import { HOUR_MS } from './util'

export const weatherPeriodMs = () => SIM.WEATHER_PERIOD_HOURS * HOUR_MS

/**
 * Weather is a pure function of (save seed, wall-clock time) — never stored,
 * so offline catch-up and live play always agree on when it rained.
 * Roughly sun 40% · clouds 30% · rain 30% — rain often enough that a normal
 * play session actually gets to see (and hear) it now and then.
 */
export function weatherAt(seed: number, timeMs: number): WeatherKind {
  const period = Math.floor(timeMs / weatherPeriodMs())
  const roll = mulberry32((seed ^ Math.imul(period, 2654435761)) >>> 0)()
  if (roll < 0.4) return 'sun'
  if (roll < 0.7) return 'clouds'
  return 'rain'
}

export const currentWeather = (state: GameState, now: number): WeatherKind =>
  weatherAt(state.rngSeed, now)

/**
 * What a 'rain' period actually drops: snow in winter, rain the rest of the
 * year. Purely how the weather looks and is talked about — the barrel keeps
 * filling either way (snow on the lid melts in, just like real barrels).
 */
export function precipitationAt(timeMs: number, weather: WeatherKind): PrecipitationKind | null {
  if (weather !== 'rain') return null
  return seasonAt(timeMs) === 'winter' ? 'snow' : 'rain'
}

export interface ForecastEntry {
  /** When this period's weather takes over — `at === now` for the first. */
  at: number
  weather: WeatherKind
}

/**
 * The radio's forecast: the current weather plus the next few period changes.
 * Weather is already a pure function of (seed, time), so reading tomorrow's
 * sky costs nothing — the radio just says out loud what the world had planned.
 */
export function weatherForecast(
  seed: number,
  now: number,
  periods = SIM.FORECAST_PERIODS,
): ForecastEntry[] {
  const periodMs = weatherPeriodMs()
  const nextBoundary = (Math.floor(now / periodMs) + 1) * periodMs
  return Array.from({ length: periods }, (_, i) => {
    const at = i === 0 ? now : nextBoundary + (i - 1) * periodMs
    return { at, weather: weatherAt(seed, at) }
  })
}

/**
 * When the next rain (or winter snow) begins — `now` if it is already coming
 * down — or null if the scan window ahead stays dry. The barrel-planner's
 * favourite number.
 */
export function nextRainStart(seed: number, now: number): number | null {
  if (weatherAt(seed, now) === 'rain') return now
  const periodMs = weatherPeriodMs()
  const scanPeriods = Math.ceil((SIM.FORECAST_RAIN_SCAN_HOURS * HOUR_MS) / periodMs)
  const nextBoundary = (Math.floor(now / periodMs) + 1) * periodMs
  for (let i = 0; i < scanPeriods; i++) {
    const at = nextBoundary + i * periodMs
    if (weatherAt(seed, at) === 'rain') return at
  }
  return null
}
