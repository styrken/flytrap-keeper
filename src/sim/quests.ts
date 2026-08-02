import { SIM } from './config'
import { mulberry32 } from './rng'
import { SPECIES } from './species'
import type { GameState, PlantState, QuestId, QuestState } from './types'
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

/**
 * Three quests per UTC day, drawn deterministically from (seed, day) so every
 * device agrees. mist1 only enters the pool when a living tropical pitcher
 * is on the sill.
 */
export function drawQuests(
  rngSeed: number,
  now: number,
  plants: PlantState[],
): { day: string; items: QuestState[] } {
  const pool: QuestId[] = ['water2', 'catch2', 'weed2', 'pet2', 'pour1']
  if (plants.some((p) => SPECIES[p.speciesId].needsMisting && !p.dead)) pool.push('mist1')

  const dayNumber = Math.floor(now / DAY_MS)
  const rng = mulberry32((rngSeed ^ Math.imul(dayNumber, 40503)) >>> 0)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return {
    day: dayKey(now),
    items: pool.slice(0, 3).map((id) => ({ id, target: QUEST_DEFS[id], progress: 0 })),
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
