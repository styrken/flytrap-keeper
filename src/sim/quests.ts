import { SIM } from './config'
import { mulberry32 } from './rng'
import { SPECIES } from './species'
import type {
  GameState,
  PlantState,
  QuestId,
  QuestState,
  WeeklyQuestId,
  WeeklyQuestState,
} from './types'
import { DAY_MS, dayKey } from './util'

/** Target count per quest type. */
export const QUEST_DEFS: Record<QuestId, number> = {
  water2: 2,
  catch2: 2,
  weed2: 2,
  pet2: 2,
  pour1: 1,
  mist1: 1,
}

/** Weekly targets — a week's worth of gentle doing, not a grind. */
export const WEEKLY_QUEST_DEFS: Record<WeeklyQuestId, number> = {
  waterWeek: 10,
  catchWeek: 8,
  weedWeek: 6,
  petWeek: 7,
  pourWeek: 3,
  greetWeek: 10,
}

/**
 * Three quests per UTC day, drawn deterministically from (seed, day) so every
 * device agrees. The pool only offers what the garden can actually deliver:
 * mist1 needs a living tropical pitcher, and catch2 needs an awake snapper —
 * with a target no higher than its trap count, so a one-trap sprout gets
 * "catch 1" instead of a quest that digestion makes impossible to finish.
 */
export function drawQuests(
  rngSeed: number,
  now: number,
  plants: PlantState[],
): { day: string; items: QuestState[] } {
  const pool: QuestId[] = ['water2', 'weed2', 'pet2', 'pour1']
  const snapperTraps = plants
    .filter((p) => SPECIES[p.speciesId].isSnapper && !p.dead && !p.dormant)
    .reduce((sum, p) => sum + p.traps.length, 0)
  if (snapperTraps > 0) pool.push('catch2')
  if (plants.some((p) => SPECIES[p.speciesId].needsMisting && !p.dead)) pool.push('mist1')

  const dayNumber = Math.floor(now / DAY_MS)
  const rng = mulberry32((rngSeed ^ Math.imul(dayNumber, 40503)) >>> 0)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return {
    day: dayKey(now),
    items: pool.slice(0, 3).map((id) => ({
      id,
      target: id === 'catch2' ? Math.min(QUEST_DEFS.catch2, snapperTraps) : QUEST_DEFS[id],
      progress: 0,
    })),
  }
}

/**
 * The Monday (UTC) that starts the week `now` belongs to — the weekly slate's
 * identity, deterministic on every device.
 */
export function weekKey(now: number): string {
  const dayNumber = Math.floor(now / DAY_MS)
  const monday = dayNumber - ((dayNumber + 3) % 7) // epoch day -3 was a Monday
  return dayKey(monday * DAY_MS)
}

/**
 * Two weekly quests per (UTC) Monday-to-Monday week, drawn deterministically
 * from (seed, week) like the dailies. The catch quest only joins the pool
 * once an awake snapper has at least two traps — a week of eight catches is
 * no fun with a single mouth.
 */
export function drawWeeklyQuests(
  rngSeed: number,
  now: number,
  plants: PlantState[],
): { week: string; weekItems: WeeklyQuestState[] } {
  const pool: WeeklyQuestId[] = ['waterWeek', 'weedWeek', 'petWeek', 'pourWeek', 'greetWeek']
  const snapperTraps = plants
    .filter((p) => SPECIES[p.speciesId].isSnapper && !p.dead && !p.dormant)
    .reduce((sum, p) => sum + p.traps.length, 0)
  if (snapperTraps >= 2) pool.push('catchWeek')

  const dayNumber = Math.floor(now / DAY_MS)
  const monday = dayNumber - ((dayNumber + 3) % 7)
  const rng = mulberry32((rngSeed ^ Math.imul(monday, 972663749)) >>> 0)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return {
    week: weekKey(now),
    weekItems: pool.slice(0, 2).map((id) => ({ id, target: WEEKLY_QUEST_DEFS[id], progress: 0 })),
  }
}

/** Bump a quest if it's active and unfinished; pay on completion (+ all-done bonus). */
export function progressQuest(state: GameState, id: QuestId): GameState {
  const index = state.quests.items.findIndex(
    (quest) => quest.id === id && quest.progress < quest.target,
  )
  if (index === -1) return state
  const items = state.quests.items.map((quest, i) =>
    i === index ? { ...quest, progress: quest.progress + 1 } : quest,
  )
  let dewdrops = state.inventory.dewdrops
  if (items[index].progress >= items[index].target) {
    dewdrops += SIM.QUEST_DEWDROPS
    if (items.every((quest) => quest.progress >= quest.target)) dewdrops += SIM.QUEST_ALL_BONUS
  }
  return {
    ...state,
    quests: { ...state.quests, items },
    inventory: { ...state.inventory, dewdrops },
  }
}

/** The weekly twin of progressQuest — chunkier goals, chunkier pay. */
export function progressWeekly(state: GameState, id: WeeklyQuestId): GameState {
  const index = state.quests.weekItems.findIndex(
    (quest) => quest.id === id && quest.progress < quest.target,
  )
  if (index === -1) return state
  const weekItems = state.quests.weekItems.map((quest, i) =>
    i === index ? { ...quest, progress: quest.progress + 1 } : quest,
  )
  let dewdrops = state.inventory.dewdrops
  if (weekItems[index].progress >= weekItems[index].target) {
    dewdrops += SIM.QUEST_WEEK_DEWDROPS
    if (weekItems.every((quest) => quest.progress >= quest.target)) {
      dewdrops += SIM.QUEST_WEEK_ALL_BONUS
    }
  }
  return {
    ...state,
    quests: { ...state.quests, weekItems },
    inventory: { ...state.inventory, dewdrops },
  }
}
