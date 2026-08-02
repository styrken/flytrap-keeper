import type { Season } from './types'

/** Season from the real calendar (northern hemisphere), UTC for determinism. */
export function seasonAt(nowMs: number): Season {
  const month = new Date(nowMs).getUTCMonth() // 0-11
  if (month === 11 || month <= 1) return 'winter'
  if (month <= 4) return 'spring'
  if (month <= 7) return 'summer'
  return 'autumn'
}
