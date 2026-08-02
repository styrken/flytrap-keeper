export const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value))

export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000

/** UTC day key — deterministic across timezones and offline catch-up. */
export const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10)
