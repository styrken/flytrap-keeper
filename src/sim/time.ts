import type { GameTime } from './types'

/** Speed-mode presets the player can pick — ×1 is real time. */
export const TIME_SCALES = [1, 10, 60, 600] as const

/**
 * The game clock: gameNow = gameAnchor + (realNow - realAnchor) × scale.
 * The whole sim (decay, digestion, weather, seasons, day/night) runs on game
 * time; only `updatedAt` stays on the wall clock for cloud-sync comparisons.
 */
export const toGameTime = (time: GameTime, realNow: number): number =>
  time.gameAnchor + (realNow - time.realAnchor) * time.scale

/**
 * Re-anchor at `realNow` with a new scale. Anchoring keeps the clock
 * continuous: switching speed never jumps it, and returning to real time
 * keeps whatever head start the fast days built up — game timestamps stay
 * self-consistent and monotonic either way.
 */
export const withTimeScale = (time: GameTime, scale: number, realNow: number): GameTime => ({
  scale,
  realAnchor: realNow,
  gameAnchor: toGameTime(time, realNow),
})
