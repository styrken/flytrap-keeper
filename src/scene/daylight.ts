/**
 * View-only day/night factor from the local clock: 1 in full daylight,
 * 0.2 at night, smooth ramps at dusk (19-21) and dawn (06-08).
 */
export function daylightFactor(nowMs: number): number {
  const date = new Date(nowMs)
  const hour = date.getHours() + date.getMinutes() / 60
  if (hour >= 8 && hour < 19) return 1
  if (hour >= 19 && hour < 21) return 1 - ((hour - 19) / 2) * 0.8
  if (hour >= 6 && hour < 8) return 0.2 + ((hour - 6) / 2) * 0.8
  return 0.2
}
