import { SIM } from './config'
import type { JournalEntry, JournalKind, PlantState } from './types'

/**
 * Write a page in the plant's diary. Milestones only — the callers decide
 * what counts — and capped, so a long and eventful life never bloats the
 * save: the oldest pages quietly fall out.
 */
export function remember(
  plant: PlantState,
  kind: JournalKind,
  at: number,
  stage?: number,
  age?: number,
): PlantState {
  const entry: JournalEntry = { at, kind }
  if (stage !== undefined) entry.stage = stage
  if (age !== undefined) entry.age = age
  const journal = [...plant.journal, entry].slice(-SIM.JOURNAL_MAX_ENTRIES)
  return { ...plant, journal }
}

/** Whether a milestone kind is already in the diary (for once-only pages). */
export const remembers = (plant: PlantState, kind: JournalKind): boolean =>
  plant.journal.some((entry) => entry.kind === kind)
