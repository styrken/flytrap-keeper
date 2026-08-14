import type { PlantState } from './types'
import { dayKey } from './util'

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

/**
 * The `years`-th anniversary of the planting, on the game-clock calendar
 * (UTC, like seasons and quest days). Seeds planted on 29 February celebrate
 * on the 28th in ordinary years — a day early beats three years of waiting.
 */
export function anniversaryAt(plantedAt: number, years: number): number {
  const planted = new Date(plantedAt)
  const year = planted.getUTCFullYear() + years
  const feb29 = planted.getUTCMonth() === 1 && planted.getUTCDate() === 29
  const day = feb29 && !isLeapYear(year) ? 28 : planted.getUTCDate()
  return Date.UTC(
    year,
    planted.getUTCMonth(),
    day,
    planted.getUTCHours(),
    planted.getUTCMinutes(),
    planted.getUTCSeconds(),
    planted.getUTCMilliseconds(),
  )
}

/** Whole anniversaries that have passed by `now` — the plant's age in years. */
export function birthdaysPassed(plantedAt: number, now: number): number {
  if (now < plantedAt) return 0
  let years = Math.max(0, new Date(now).getUTCFullYear() - new Date(plantedAt).getUTCFullYear())
  while (years > 0 && anniversaryAt(plantedAt, years) > now) years -= 1
  while (anniversaryAt(plantedAt, years + 1) <= now) years += 1
  return years
}

/**
 * Whether today (the UTC game-clock day) is one of the plant's birthdays —
 * true for the whole day, so the confetti over the pot lasts until midnight.
 */
export function isBirthdayToday(plant: PlantState, now: number): boolean {
  const today = dayKey(now)
  const passed = birthdaysPassed(plant.plantedAt, now)
  if (passed >= 1 && dayKey(anniversaryAt(plant.plantedAt, passed)) === today) return true
  return dayKey(anniversaryAt(plant.plantedAt, passed + 1)) === today
}
