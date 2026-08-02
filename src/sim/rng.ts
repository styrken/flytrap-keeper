/**
 * Deterministic seeded RNG (mulberry32). The sim never calls Math.random —
 * randomness flows from GameState.rngSeed so scenarios replay identically.
 * (Unused by the MVP rules; the phase-2 weather system draws from it.)
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Advance a stored seed one step so the next draw differs. */
export function nextSeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0
}
