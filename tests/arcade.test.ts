import { describe, expect, it } from 'vitest'
import { SIM, apply, createInitialState, loadFromString, saveToString, tick } from '../src/sim'
import type { GameState } from '../src/sim'

const T0 = 1_700_000_000_000
const DAY = 86_400_000

const init = (items: string[] = ['computer']): GameState => {
  const s = createInitialState(T0, 42)
  return {
    ...s,
    quests: { ...s.quests, items: [] },
    inventory: { dewdrops: 0, items, flyPacks: 0 },
  }
}

describe('the SNAP! arcade', () => {
  it('needs the computer — it said it was not for games, after all', () => {
    const state = apply(init([]), { type: 'arcadeScore', score: 20 }, T0)
    expect(state.inventory.dewdrops).toBe(0)
    expect(state.arcade.best).toBe(0)
  })

  it('pays pocket money per score, tracks the best, ignores nonsense', () => {
    let state = apply(init(), { type: 'arcadeScore', score: 12 }, T0)
    expect(state.inventory.dewdrops).toBe(Math.floor(12 / SIM.ARCADE_SCORE_PER_DEWDROP))
    expect(state.arcade.best).toBe(12)

    state = apply(state, { type: 'arcadeScore', score: 7 }, T0)
    expect(state.arcade.best).toBe(12) // a worse run doesn't dethrone it

    expect(apply(init(), { type: 'arcadeScore', score: 0 }, T0).arcade.best).toBe(0)
    expect(apply(init(), { type: 'arcadeScore', score: -5 }, T0).arcade.best).toBe(0)
    expect(apply(init(), { type: 'arcadeScore', score: Number.NaN }, T0).arcade.best).toBe(0)
  })

  it('caps the payout per day and opens the till again tomorrow', () => {
    let state = init()
    // grind far past the cap in one sitting
    for (let run = 0; run < 5; run++) {
      state = apply(state, { type: 'arcadeScore', score: 20 }, T0 + run * 60_000)
    }
    expect(state.inventory.dewdrops).toBe(SIM.ARCADE_DAILY_CAP)
    expect(state.arcade.paidToday).toBe(SIM.ARCADE_DAILY_CAP)

    // a new UTC day, a new allowance — measured at a frozen instant so
    // tick-time achievements from the day-long window can't skew the count
    const tomorrow = tick(state, T0 + DAY)
    const paid = apply(tomorrow, { type: 'arcadeScore', score: 20 }, T0 + DAY)
    expect(paid.inventory.dewdrops - tomorrow.inventory.dewdrops).toBe(
      Math.floor(20 / SIM.ARCADE_SCORE_PER_DEWDROP),
    )
    expect(paid.arcade.paidToday).toBe(Math.floor(20 / SIM.ARCADE_SCORE_PER_DEWDROP))
  })

  it('a great run earns the high-score achievement — once', () => {
    let state = apply(init(), { type: 'arcadeScore', score: SIM.ARCADE_HIGHSCORE_AT }, T0)
    expect(state.achievements).toContain('high-score')
    state = apply(state, { type: 'arcadeScore', score: SIM.ARCADE_HIGHSCORE_AT + 5 }, T0 + 60_000)
    expect(state.achievements.filter((a) => a === 'high-score')).toHaveLength(1)
  })
})

describe('save migration v12 -> v13 (arcade)', () => {
  it('starts old saves with an untouched cabinet', () => {
    const state = init()
    const v12 = JSON.parse(saveToString(state)) as Record<string, unknown>
    v12.saveVersion = 12
    delete v12.arcade

    const loaded = loadFromString(JSON.stringify(v12))
    expect(loaded).not.toBeNull()
    expect(loaded!.arcade).toEqual({ best: 0, day: '', paidToday: 0 })
  })
})
