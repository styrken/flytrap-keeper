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
  snailAbout,
  spiderAtCorner,
  tick,
  weatherAt,
  weatherPeriodMs,
} from '../src/sim'
import type { GameState, PetsState } from '../src/sim'

const T0 = 1_700_000_000_000
const h = (n: number) => n * 3_600_000
const d = (n: number) => n * 86_400_000

const init = (dewdrops = 0, items: string[] = []): GameState => {
  const s = createInitialState(T0, 42)
  return {
    ...s,
    quests: { ...s.quests, items: [] },
    inventory: { dewdrops, items, flyPacks: 0 },
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
    const pets: PetsState = {
      tadpoleSince: T0,
      cat: false,
      snailRescues: 0,
      snail: false,
      lastSnailAt: null,
      spider: false,
      lastWebLootAt: null,
      lastLadybirdAt: null,
      lastRobinAt: null,
      lastButterflyAt: null,
      lastHedgehogAt: null,
    }
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

describe('the corner spider', () => {
  /** First autumn day (from T0, which is November) with a trial web up. */
  const findSpiderDay = (state: GameState): number => {
    for (let t = T0; t < T0 + d(15); t += d(1)) {
      if (spiderAtCorner(state, t)) return t
    }
    throw new Error('no spider day found in 15 autumn days')
  }

  it('spins trial webs on some autumn days only, until adopted', () => {
    const state = init()
    const day = findSpiderDay(state)
    expect(spiderAtCorner(state, day)).toBe(spiderAtCorner(state, day))
    // spiders keep away in high summer
    expect(spiderAtCorner(state, Date.UTC(2024, 6, 10))).toBe(false)
    const adopted = { ...state, pets: { ...state.pets, spider: true } }
    expect(spiderAtCorner(adopted, day)).toBe(false)
  })

  it('adopting works only while the web hangs; the settled web pays rent on a cooldown', () => {
    const state = init()
    const day = findSpiderDay(state)

    let offDay = T0
    while (spiderAtCorner(state, offDay)) offDay += d(1)
    expect(apply(state, { type: 'adoptSpider' }, offDay).pets.spider).toBe(false)

    const withSpider = apply(state, { type: 'adoptSpider' }, day)
    expect(withSpider.pets.spider).toBe(true)
    expect(withSpider.achievements).toContain('pet-spider')

    // measure each loot as a delta at a frozen instant — tick first, then act,
    // so stray tick-time achievements (a capped rain barrel, say) can't skew it
    const rentDue = tick(withSpider, day + h(1))
    const paid = apply(rentDue, { type: 'lootWeb' }, day + h(1))
    expect(paid.inventory.dewdrops - rentDue.inventory.dewdrops).toBe(SIM.WEB_LOOT_DEWDROPS)

    const later = tick(paid, day + h(2))
    expect(apply(later, { type: 'lootWeb' }, day + h(2))).toBe(later) // still digesting the rent

    const at = day + h(1 + SIM.WEB_LOOT_COOLDOWN_HOURS) + 1000
    const nextDue = tick(paid, at)
    const paidAgain = apply(nextDue, { type: 'lootWeb' }, at)
    expect(paidAgain.inventory.dewdrops - nextDue.inventory.dewdrops).toBe(SIM.WEB_LOOT_DEWDROPS)

    // no spider, no rent
    expect(apply(init(), { type: 'lootWeb' }, T0).inventory.dewdrops).toBe(0)
  })
})

describe('the ladybird', () => {
  it('greeting pays a spot of luck on a cooldown — and never in winter', () => {
    const state = apply(init(), { type: 'greetLadybird' }, T0) // November: autumn
    expect(state.inventory.dewdrops).toBe(SIM.LADYBIRD_DEWDROPS + SIM.ACHIEVEMENT_DEWDROPS)
    expect(state.achievements).toContain('ladybird-luck')

    // frozen-instant deltas, so tick-time achievements can't skew the counts
    const tooSoon = tick(state, T0 + h(1))
    expect(apply(tooSoon, { type: 'greetLadybird' }, T0 + h(1))).toBe(tooSoon)

    const at = T0 + h(SIM.LADYBIRD_COOLDOWN_HOURS) + 1000
    const rested = tick(state, at)
    const greeted = apply(rested, { type: 'greetLadybird' }, at)
    expect(greeted.inventory.dewdrops - rested.inventory.dewdrops).toBe(SIM.LADYBIRD_DEWDROPS)
    expect(greeted.achievements.filter((a) => a === 'ladybird-luck')).toHaveLength(1)

    const midwinter = tick(init(), Date.UTC(2024, 0, 10))
    expect(apply(midwinter, { type: 'greetLadybird' }, Date.UTC(2024, 0, 10))).toBe(midwinter)
  })
})

describe('the snail comes out after the rain too', () => {
  it('may show during a rain period and in the one right after', () => {
    const state = init()
    let rainStart = T0
    while (weatherAt(state.rngSeed, rainStart) !== 'rain') rainStart += weatherPeriodMs()
    expect(snailAbout(state, rainStart)).toBe(true)
    // the period after rain keeps the window open, whatever the sky does
    expect(snailAbout(state, rainStart + weatherPeriodMs())).toBe(true)

    // find a moment where neither the current nor previous period was rain
    let dry = T0
    while (
      weatherAt(state.rngSeed, dry) === 'rain' ||
      weatherAt(state.rngSeed, dry - weatherPeriodMs()) === 'rain'
    ) {
      dry += weatherPeriodMs()
    }
    expect(snailAbout(state, dry)).toBe(false)
  })
})

describe('the garden guests: robin, butterfly, hedgehog', () => {
  const JULY = Date.UTC(2024, 6, 10, 12)
  const JANUARY = Date.UTC(2024, 0, 10, 12)

  it('the robin only visits a bought feeder, and sings on a cooldown', () => {
    // no feeder, no robin
    expect(apply(init(), { type: 'greetRobin' }, T0).inventory.dewdrops).toBe(0)

    let state = { ...init(), inventory: { dewdrops: 0, items: ['bird-feeder'], flyPacks: 0 } }
    state = apply(state, { type: 'greetRobin' }, T0)
    expect(state.inventory.dewdrops).toBe(SIM.GUEST_DEWDROPS + SIM.ACHIEVEMENT_DEWDROPS)
    expect(state.achievements).toContain('robin-song')

    const tooSoon = tick(state, T0 + h(1))
    expect(apply(tooSoon, { type: 'greetRobin' }, T0 + h(1))).toBe(tooSoon)

    // the robin visits in the dead of winter too — no hibernation here
    const winter = tick(state, JANUARY)
    const greeted = apply(winter, { type: 'greetRobin' }, JANUARY)
    expect(greeted.inventory.dewdrops - winter.inventory.dewdrops).toBe(SIM.GUEST_DEWDROPS)
  })

  it('the butterfly is a spring/summer guest with a safe landing', () => {
    // November is off-season
    expect(apply(init(), { type: 'greetButterfly' }, T0).inventory.dewdrops).toBe(0)

    const summer = tick(init(), JULY)
    const greeted = apply(summer, { type: 'greetButterfly' }, JULY)
    expect(greeted.inventory.dewdrops - summer.inventory.dewdrops).toBe(
      SIM.GUEST_DEWDROPS + SIM.ACHIEVEMENT_DEWDROPS,
    )
    expect(greeted.achievements).toContain('safe-landing')

    const tooSoon = tick(greeted, JULY + h(1))
    expect(apply(tooSoon, { type: 'greetButterfly' }, JULY + h(1))).toBe(tooSoon)
  })

  it('the hedgehog snuffles three seasons and hibernates through winter', () => {
    const autumn = apply(init(), { type: 'greetHedgehog' }, T0) // November
    expect(autumn.inventory.dewdrops).toBe(SIM.GUEST_DEWDROPS + SIM.ACHIEVEMENT_DEWDROPS)
    expect(autumn.achievements).toContain('evening-snuffler')

    const midwinter = tick(init(), JANUARY)
    expect(apply(midwinter, { type: 'greetHedgehog' }, JANUARY)).toBe(midwinter)
  })
})

describe('full house', () => {
  it('the fourth moved-in pet fills the house', () => {
    let state = apply(init(500, ['greenhouse']), { type: 'buy', item: 'tadpole-jar' }, T0)
    state = { ...state, pets: { ...state.pets, cat: true, snail: true, spider: true } }
    expect(petCount(state, state.lastTickAt)).toBe(3)
    state = tick(state, T0 + d(8)) // the frog completes the quartet
    expect(petCount(state, state.lastTickAt)).toBe(4)
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
      spider: false,
      lastWebLootAt: null,
      lastLadybirdAt: null,
      lastRobinAt: null,
      lastButterflyAt: null,
      lastHedgehogAt: null,
    })
  })
})
