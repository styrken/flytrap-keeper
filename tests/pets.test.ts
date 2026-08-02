import { describe, expect, it } from 'vitest'
import {
  SIM,
  apply,
  catAtWindow,
  createInitialState,
  currentWeather,
  frogStage,
  loadFromString,
  petCount,
  saveToString,
  tick,
  weatherPeriodMs,
} from '../src/sim'
import type { GameState } from '../src/sim'

const T0 = 1_700_000_000_000
const h = (n: number) => n * 3_600_000
const d = (n: number) => n * 86_400_000

const init = (dewdrops = 0, items: string[] = []): GameState => {
  const s = createInitialState(T0, 42)
  return {
    ...s,
    quests: { ...s.quests, items: [] },
    inventory: { dewdrops, items },
  }
}

describe('the tadpole jar and the frog', () => {
  it('needs the greenhouse before the jar can be bought', () => {
    const noHome = apply(init(500), { type: 'buy', item: 'tadpole-jar' }, T0)
    expect(noHome.pets.tadpoleSince).toBeNull()
    expect(noHome.inventory.dewdrops).toBe(500)

    const bought = apply(init(500, ['greenhouse']), { type: 'buy', item: 'tadpole-jar' }, T0)
    expect(bought.pets.tadpoleSince).toBe(T0)
    expect(bought.inventory.items).toContain('tadpole-jar')
    expect(bought.inventory.dewdrops).toBe(440)
  })

  it('metamorphoses on the calendar: egg to frog in a week', () => {
    const pets = { tadpoleSince: T0, cat: false, snailRescues: 0, snail: false, lastSnailAt: null }
    expect(frogStage(pets, T0)).toBe(0)
    expect(frogStage(pets, T0 + d(2))).toBe(1)
    expect(frogStage(pets, T0 + d(4))).toBe(2)
    expect(frogStage(pets, T0 + d(6))).toBe(3)
    expect(frogStage(pets, T0 + d(7))).toBe(4)
    expect(frogStage({ ...pets, tadpoleSince: null }, T0)).toBe(-1)
  })

  it('offline time counts in full — a vacation grows the frog, and tick awards it', () => {
    let state = apply(init(500, ['greenhouse']), { type: 'buy', item: 'tadpole-jar' }, T0)
    state = tick(state, T0 + d(8)) // way past the offline sim cap — stage is calendar-based
    expect(frogStage(state.pets, state.lastTickAt)).toBe(4)
    expect(state.achievements).toContain('pet-frog')
    expect(state.achievements.filter((a) => a === 'pet-frog')).toHaveLength(1)
  })
})

describe('the rainy-day cat', () => {
  /** First game-time where the soaked cat sits at the window for this state. */
  const findCatVisit = (state: GameState): number => {
    for (let t = T0; t < T0 + d(60); t += weatherPeriodMs()) {
      if (catAtWindow(state, t)) return t
    }
    throw new Error('no cat visit found in 60 days')
  }

  it('appears only in some rain periods, deterministically, until adopted', () => {
    const state = init()
    const visit = findCatVisit(state)
    expect(currentWeather(state, visit)).toBe('rain')
    expect(catAtWindow(state, visit)).toBe(catAtWindow(state, visit))
    const adopted = { ...state, pets: { ...state.pets, cat: true } }
    expect(catAtWindow(adopted, visit)).toBe(false)
  })

  it('letting it in only works while it sits there — then it moves in for good', () => {
    const state = init()
    const visit = findCatVisit(state)

    // find a moment with no cat at the window (any non-rain period will do)
    let dry = T0
    while (currentWeather(state, dry) === 'rain' || catAtWindow(state, dry)) {
      dry += weatherPeriodMs()
    }
    expect(apply(state, { type: 'letCatIn' }, dry).pets.cat).toBe(false)

    const withCat = apply(state, { type: 'letCatIn' }, visit)
    expect(withCat.pets.cat).toBe(true)
    expect(withCat.achievements).toContain('pet-cat')
  })
})

describe('the snail', () => {
  it('rescues pay a little, respect the cooldown, and the third moves it in', () => {
    let state = init()
    state = apply(state, { type: 'rescueSnail' }, T0)
    expect(state.pets.snailRescues).toBe(1)
    expect(state.pets.snail).toBe(false)
    // rescue + the day's first care action bonus
    expect(state.inventory.dewdrops).toBe(SIM.SNAIL_RESCUE_DEWDROPS + SIM.DAILY_CARE_DEWDROPS)

    // too soon — the sim shrugs
    const tooSoon = apply(state, { type: 'rescueSnail' }, T0 + h(1))
    expect(tooSoon.pets.snailRescues).toBe(1)

    state = apply(state, { type: 'rescueSnail' }, T0 + h(SIM.SNAIL_RESCUE_COOLDOWN_HOURS) + 1000)
    state = apply(
      state,
      { type: 'rescueSnail' },
      T0 + h(2 * SIM.SNAIL_RESCUE_COOLDOWN_HOURS) + 2000,
    )
    expect(state.pets.snailRescues).toBe(3)
    expect(state.pets.snail).toBe(true)
    expect(state.achievements).toContain('pet-snail')

    // once kept, there is nothing left to rescue
    const after = apply(state, { type: 'rescueSnail' }, T0 + d(1))
    expect(after.pets.snailRescues).toBe(3)
  })
})

describe('full house', () => {
  it('the third moved-in pet fills the house', () => {
    let state = apply(init(500, ['greenhouse']), { type: 'buy', item: 'tadpole-jar' }, T0)
    state = { ...state, pets: { ...state.pets, cat: true, snail: true } }
    expect(petCount(state, state.lastTickAt)).toBe(2)
    state = tick(state, T0 + d(8)) // the frog completes the trio
    expect(petCount(state, state.lastTickAt)).toBe(3)
    expect(state.achievements).toContain('full-house')
  })
})

describe('save migration v11 -> v12 (pets)', () => {
  it('starts old saves with an empty house', () => {
    const state = init()
    const v11 = JSON.parse(saveToString(state)) as Record<string, unknown>
    v11.saveVersion = 11
    delete v11.pets

    const loaded = loadFromString(JSON.stringify(v11))
    expect(loaded).not.toBeNull()
    expect(loaded!.pets).toEqual({
      tadpoleSince: null,
      cat: false,
      snailRescues: 0,
      snail: false,
      lastSnailAt: null,
    })
  })
})
