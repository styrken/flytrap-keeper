import type { Season } from './types'

/** Season from the real calendar (northern hemisphere), UTC for determinism. */
export function seasonAt(nowMs: number): Season {
  const month = new Date(nowMs).getUTCMonth() // 0-11
  if (month === 11 || month <= 1) return 'winter'
  if (month <= 4) return 'spring'
  if (month <= 7) return 'summer'
  return 'autumn'
}

/**
 * Which winter a moment belongs to, named by the year of its December —
 * December 2026, January 2027 and February 2027 are all winter 2026. Outside
 * winter the answer is the nearest winter just past (Dec of last year), which
 * callers use to notice that a stored snowman is from a melted season.
 */
export function winterKeyAt(nowMs: number): number {
  const date = new Date(nowMs)
  return date.getUTCMonth() === 11 ? date.getUTCFullYear() : date.getUTCFullYear() - 1
}
