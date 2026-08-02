import { describe, expect, it } from 'vitest'
import {
  INSECTS,
  SIM,
  activePlant,
  apply,
  createInitialState,
  insectKindFromRoll,
  isFireflyNight,
  loadFromString,
  nightInsectKindFromRoll,
  saveToString,
} from '../src/sim'
import type { GameState, InsectKind } from '../src/sim'

const T0 = 1_700_000_000_000
/** A July noon (UTC) — solidly summer for the firefly calendar. */
const JULY = Date.UTC(2024, 6, 10, 12)
const h = (n: number) => n * 3_600_000
const init = (at = T0): GameState => {
  const s = createInitialState(at, 42)
  return { ...s, quests: { ...s.quests, items: [] } }
}

describe('moths', () => {
  it('a caught moth feeds the trap, pays well, and awards the night owl', () => {
    const next = apply(
      init(),
      { type: 'catchInsect', plantId: 'p1', trapId: 't1', insect: 'moth' },
      T0,
    )
    const plant = activePlant(next)!
    expect(plant.nutrition).toBe(60 + INSECTS.moth.nutrition)
    expect(plant.traps[0].usesLeft).toBe(SIM.TRAP_USES - 1)
    expect(next.achievements).toContain('night-owl')
    expect(next.achievements).toContain('first-catch')
    // moth + two achievements + first care of the day
    expect(next.inventory.dewdrops).toBe(
      INSECTS.moth.dewdrops + 2 * SIM.ACHIEVEMENT_DEWDROPS + SIM.DAILY_CARE_DEWDROPS,
    )
  })

  it('the night spawn table favours moths but can serve every insect', () => {
    const kinds = new Set<InsectKind>()
    let moths = 0
    for (let roll = 0; roll < 1; roll += 0.01) {
      const kind = nightInsectKindFromRoll(roll)
      kinds.add(kind)
      if (kind === 'moth') moths++
    }
    expect(kinds).toEqual(new Set(['moth', 'fly', 'mosquito', 'spider', 'beetle']))
    expect(moths).toBeGreaterThanOrEqual(45)
    // the daytime table never deals a moth
    for (let roll = 0; roll < 1; roll += 0.01) {
      expect(insectKindFromRoll(roll)).not.toBe('moth')
    }
  })
})

describe('wishing on a star', () => {
  it('pays dewdrops, awards the first wish, and cools down', () => {
    let state = apply(init(), { type: 'wishOnStar' }, T0)
    expect(state.inventory.dewdrops).toBe(SIM.STAR_WISH_DEWDROPS + SIM.ACHIEVEMENT_DEWDROPS)
    expect(state.achievements).toContain('first-wish')

    // a second wish inside the cooldown is politely ignored
    const tooSoon = apply(state, { type: 'wishOnStar' }, T0 + 1_000)
    expect(tooSoon.inventory.dewdrops).toBe(state.inventory.dewdrops)

    // after the cooldown it pays again — but the achievement stays unique
    state = apply(state, { type: 'wishOnStar' }, T0 + SIM.STAR_WISH_COOLDOWN_SECONDS * 1000 + 500)
    expect(state.inventory.dewdrops).toBe(2 * SIM.STAR_WISH_DEWDROPS + SIM.ACHIEVEMENT_DEWDROPS)
    expect(state.achievements.filter((a) => a === 'first-wish')).toHaveLength(1)
  })
})

describe('firefly nights', () => {
  /** First game-time (stepping by nights) where the calendar says fireflies. */
  const findFireflyNight = (seed: number, from: number): number => {
    for (let t = from; t < from + h(24 * 40); t += h(24)) {
      if (isFireflyNight(seed, t)) return t
    }
    throw new Error('no firefly night found in 40 summer days')
  }

  it('is deterministic, summer-only, and steady across midnight', () => {
    expect(isFireflyNight(42, T0)).toBe(false) // November — never
    const night = findFireflyNight(42, JULY)
    expect(isFireflyNight(42, night)).toBe(isFireflyNight(42, night))
    // 23:00 and 03:00 belong to the same night, so the verdict holds
    const evening = night + h(11) // JULY anchor is noon → 23:00
    const smallHours = night + h(15) // → 03:00 next day
    expect(isFireflyNight(42, evening)).toBe(isFireflyNight(42, smallHours))
  })

  it('watching fireflies awards the achievement — once, and only on real firefly nights', () => {
    const night = findFireflyNight(42, JULY)
    let state = init(night)
    state = apply(state, { type: 'markFireflies' }, night)
    expect(state.achievements).toContain('firefly-night')

    const again = apply(state, { type: 'markFireflies' }, night + 60_000)
    expect(again.achievements.filter((a) => a === 'firefly-night')).toHaveLength(1)

    // a November claim is refused by the calendar
    const winter = apply(init(), { type: 'markFireflies' }, T0)
    expect(winter.achievements).not.toContain('firefly-night')
  })
})

describe('save migration v11 -> v12', () => {
  it('adds the star-wish slot to old saves', () => {
    const state = init()
    const v11 = JSON.parse(saveToString(state)) as Record<string, unknown>
    v11.saveVersion = 11
    delete (v11.minigames as Record<string, unknown>).lastWishAt

    const loaded = loadFromString(JSON.stringify(v11))
    expect(loaded).not.toBeNull()
    expect(loaded!.minigames.lastWishAt).toBeNull()
    expect(loaded!.minigames.lastRaindropAt).toBeNull()
  })
})
