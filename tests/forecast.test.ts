import { describe, expect, it } from 'vitest'
import {
  SIM,
  nextRainStart,
  precipitationAt,
  weatherAt,
  weatherForecast,
  weatherPeriodMs,
} from '../src/sim'

const JULY = Date.UTC(2026, 6, 10, 9, 30)
const JANUARY = Date.UTC(2026, 0, 10, 9, 30)

describe('the radio forecast', () => {
  it('starts with the current weather and follows the period boundaries', () => {
    const seed = 42
    const forecast = weatherForecast(seed, JULY)
    expect(forecast).toHaveLength(SIM.FORECAST_PERIODS)
    expect(forecast[0].at).toBe(JULY)
    expect(forecast[0].weather).toBe(weatherAt(seed, JULY))
    const period = weatherPeriodMs()
    const boundary = (Math.floor(JULY / period) + 1) * period
    expect(forecast[1].at).toBe(boundary)
    expect(forecast[2].at).toBe(boundary + period)
    for (const entry of forecast.slice(1)) {
      expect(entry.weather).toBe(weatherAt(seed, entry.at))
      expect(entry.at % period).toBe(0)
    }
  })

  it('is deterministic — the radio and the sky always agree', () => {
    expect(weatherForecast(7, JULY)).toEqual(weatherForecast(7, JULY))
  })

  it('reports rain immediately while it is already raining', () => {
    // Find a rainy moment for this seed, then ask the radio about it.
    const seed = 42
    let t = JULY
    while (weatherAt(seed, t) !== 'rain') t += weatherPeriodMs()
    expect(nextRainStart(seed, t)).toBe(t)
  })

  it('finds the next rain period on a dry day, aligned to a boundary', () => {
    const seed = 42
    let t = JULY
    while (weatherAt(seed, t) === 'rain') t += weatherPeriodMs()
    const start = nextRainStart(seed, t)
    expect(start).not.toBeNull()
    expect(start!).toBeGreaterThan(t)
    expect(start! % weatherPeriodMs()).toBe(0)
    expect(weatherAt(seed, start!)).toBe('rain')
    // Everything between now and the promised rain stays dry.
    for (let at = t; at < start!; at += weatherPeriodMs()) {
      expect(weatherAt(seed, at)).not.toBe('rain')
    }
  })

  it('admits when the whole scan window stays dry', () => {
    // Rain is ~30% per period, so a fully dry scan window exists for SOME
    // seed — hunt one down deterministically and check the radio's honesty.
    const periods = Math.ceil((SIM.FORECAST_RAIN_SCAN_HOURS * 3_600_000) / weatherPeriodMs())
    const dry = (seed: number, from: number) => {
      for (let i = 0; i <= periods; i++) {
        if (weatherAt(seed, from + i * weatherPeriodMs()) === 'rain') return false
      }
      return true
    }
    let seed = 0
    while (!dry(seed, JULY)) seed += 1
    expect(nextRainStart(seed, JULY)).toBeNull()
  })
})

describe('winter precipitation', () => {
  it('rains in July, snows in January, and clear skies drop nothing', () => {
    expect(precipitationAt(JULY, 'rain')).toBe('rain')
    expect(precipitationAt(JANUARY, 'rain')).toBe('snow')
    expect(precipitationAt(JULY, 'sun')).toBeNull()
    expect(precipitationAt(JANUARY, 'clouds')).toBeNull()
  })
})
