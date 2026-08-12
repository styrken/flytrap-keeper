import type { InsectKind } from '../sim'

export interface InsectPresence {
  kind: InsectKind
  /** Plant and trap the insect is currently tempting, or nulls while roaming. */
  plantId: string | null
  trapIndex: number | null
  slot: number | null
}

/**
 * Tiny frame-rate channel between the visiting insect and the traps —
 * updated in useFrame, read synchronously at tap time. Not React state on
 * purpose: nothing should re-render 60 times a second.
 *
 * `onCaught` receives the dewdrops the snap actually paid out, so the float
 * label can tell the truth instead of quoting the config table.
 */
export const insectBus: {
  presence: InsectPresence | null
  onCaught: ((gained: number) => void) | null
} = {
  presence: null,
  onCaught: null,
}
