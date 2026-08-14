// December's advent calendar: 24 little doors, one per day, catching up
// allowed — as every Danish household knows, that is simply how it works.
import { SIM } from './config'
import type { GameState } from './types'

/**
 * Which advent doors the calendar offers right now: 0 outside December,
 * otherwise the highest openable door (Christmas week keeps all 24 open, so
 * nobody's holiday travel eats their chocolate).
 */
export function adventDayAt(nowMs: number): number {
  const date = new Date(nowMs)
  if (date.getUTCMonth() !== 11) return 0
  return Math.min(date.getUTCDate(), 24)
}

/** What door `day` holds (1-24). */
export const adventGift = (day: number): number => SIM.ADVENT_GIFTS[day - 1] ?? 0

/** The doors already opened this December (an old year's calendar is over). */
export function adventOpened(state: GameState, nowMs: number): number[] {
  const year = new Date(nowMs).getUTCFullYear()
  return state.advent && state.advent.year === year ? state.advent.opened : []
}

/** Whether today's door (or an earlier missed one) is still waiting. */
export function adventDoorWaiting(state: GameState, nowMs: number): boolean {
  const last = adventDayAt(nowMs)
  if (last === 0) return false
  const opened = new Set(adventOpened(state, nowMs))
  for (let day = 1; day <= last; day++) if (!opened.has(day)) return true
  return false
}
