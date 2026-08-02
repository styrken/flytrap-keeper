import type { InsectKind } from '../sim'

export interface InsectPresence {
  kind: InsectKind
  /** Trap index the insect is currently tempting, or null while roaming. */
  nearTrapIndex: number | null
}

/**
 * Tiny frame-rate channel between the visiting insect and the traps —
 * updated in useFrame, read synchronously at tap time. Not React state on
 * purpose: nothing should re-render 60 times a second.
 */
export const insectBus: {
  presence: InsectPresence | null
  onCaught: ((trapIndex: number) => void) | null
} = {
  presence: null,
  onCaught: null,
}
