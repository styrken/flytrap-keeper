import { describe, expect, it } from 'vitest'
import {
  type GameState,
  SIM,
  activePlant,
  adventDayAt,
  apply,
  createInitialState,
  createPlant,
  decodeSeedGift,
  encodeSeedGift,
  loadFromString,
} from '../src/sim'

const T0 = Date.UTC(2026, 6, 10, 12)
const DAY = 86_400_000

const init = (extra: Partial<GameState> = {}, at = T0): GameState => {
  const s = createInitialState(at, 42)
  return { ...s, quests: { ...s.quests, items: [], weekItems: [] }, ...extra }
}

/** A donor in its propagation prime. */
const grownDonor = (at = T0) => {
  const s = init({}, at)
  return {
    ...s,
    plants: s.plants.map((p) => ({ ...p, stage: 3, xp: 3000, health: 100 })),
  }
}

describe('leaf cuttings', () => {
  it('roots a free clone — species, cultivar and all', () => {
    const s = grownDonor()
    const donor = { ...s.plants[0], cultivar: 'b52' as const }
    const potted = apply({ ...s, plants: [donor] }, { type: 'takeCutting' }, T0)
    expect(potted.plants).toHaveLength(2)
    const baby = potted.plants[1]
    expect(baby.speciesId).toBe('dionaea')
    expect(baby.cultivar).toBe('b52')
    expect(baby.stage).toBe(0)
    expect(potted.activePlantId).toBe(baby.id)
    expect(potted.inventory.dewdrops).toBeGreaterThanOrEqual(0) // free (achievements may pay)
    const rested = potted.plants[0]
    expect(rested.lastCuttingAt).toBe(T0)
    expect(rested.journal.some((e) => e.kind === 'cutting')).toBe(true)
    expect(potted.achievements).toContain('propagator')
  })

  it('lets the donor rest before the next pulling', () => {
    const once = apply(grownDonor(), { type: 'takeCutting' }, T0)
    const backToDonor = apply(once, { type: 'selectPlant', plantId: 'p1' }, T0)
    // too soon — the cooldown holds (time passes, but no new plant appears)
    expect(apply(backToDonor, { type: 'takeCutting' }, T0 + DAY).plants).toHaveLength(2)
    // after a proper rest it works again
    const later = T0 + (SIM.CUTTING_COOLDOWN_DAYS + 1) * DAY
    const again = apply(backToDonor, { type: 'takeCutting' }, later)
    expect(again.plants.length).toBe(3)
  })

  it('needs a thriving grown plant and a free pot', () => {
    const seedling = init()
    expect(apply(seedling, { type: 'takeCutting' }, T0)).toBe(seedling)

    const s = grownDonor()
    const wilted = { ...s, plants: s.plants.map((p) => ({ ...p, wilted: true })) }
    expect(apply(wilted, { type: 'takeCutting' }, T0)).toBe(wilted)

    const donor = s.plants[0]
    const full = {
      ...s,
      plants: [donor, createPlant('p2', 'drosera', T0), createPlant('p3', 'pinguicula', T0)],
    }
    expect(apply(full, { type: 'takeCutting' }, T0)).toBe(full)
  })
})

describe('seed gifts in chat', () => {
  it('encodes and decodes only real seed items', () => {
    const body = encodeSeedGift('seed-red-dragon')
    expect(decodeSeedGift(body)).toBe('seed-red-dragon')
    expect(decodeSeedGift('hello there')).toBeNull()
    expect(decodeSeedGift('[seed-gift:radio]')).toBeNull() // not a seed
    expect(decodeSeedGift('[seed-gift:totally-made-up]')).toBeNull()
  })

  it('the sender pays the shop price', () => {
    const s = init({ inventory: { ...init().inventory, dewdrops: 100 } })
    const sent = apply(s, { type: 'giftSeed', item: 'seed-drosera' }, T0)
    expect(sent.inventory.dewdrops).toBe(100 - 50 + SIM.ACHIEVEMENT_DEWDROPS) // + gift-sent badge
    expect(sent.achievements).toContain('gift-sent')

    const broke = init()
    expect(apply(broke, { type: 'giftSeed', item: 'seed-drosera' }, T0)).toBe(broke)
    // non-seed items can't ride along
    expect(apply(s, { type: 'giftSeed', item: 'radio' }, T0)).toBe(s)
  })

  it('the recipient plants it once, keyed by the message', () => {
    const s = init()
    const planted = apply(s, { type: 'redeemSeedGift', messageId: 'm1', item: 'seed-b52' }, T0)
    expect(planted.plants).toHaveLength(2)
    expect(planted.plants[1].cultivar).toBe('b52')
    expect(planted.inventory.dewdrops).toBe(s.inventory.dewdrops) // a gift costs nothing
    expect(planted.redeemedGifts).toContain('m1')
    // the same envelope can't be planted twice
    expect(apply(planted, { type: 'redeemSeedGift', messageId: 'm1', item: 'seed-b52' }, T0)).toBe(
      planted,
    )
  })

  it('waits politely when every pot is taken', () => {
    const s = init()
    const full = {
      ...s,
      plants: [s.plants[0], createPlant('p2', 'drosera', T0), createPlant('p3', 'pinguicula', T0)],
    }
    const tried = apply(full, { type: 'redeemSeedGift', messageId: 'm2', item: 'seed-drosera' }, T0)
    expect(tried).toBe(full) // nothing planted, nothing marked — try again later
  })
})

describe('the advent calendar', () => {
  const DEC5 = Date.UTC(2026, 11, 5, 12)
  const DEC24 = Date.UTC(2026, 11, 24, 12)

  it('only exists in December', () => {
    expect(adventDayAt(T0)).toBe(0)
    expect(adventDayAt(DEC5)).toBe(5)
    expect(adventDayAt(Date.UTC(2026, 11, 28))).toBe(24) // Christmas week keeps all open
    const s = init()
    expect(apply(s, { type: 'openAdventDoor', day: 1 }, T0)).toBe(s)
  })

  it("opens today's door — and yesterday's missed one, but never tomorrow's", () => {
    const s = init({}, DEC5)
    const today = apply(s, { type: 'openAdventDoor', day: 5 }, DEC5)
    expect(today.inventory.dewdrops).toBe(SIM.ADVENT_GIFTS[4])
    expect(today.advent).toEqual({ year: 2026, opened: [5] })
    const catchUp = apply(today, { type: 'openAdventDoor', day: 2 }, DEC5)
    expect(catchUp.advent?.opened).toEqual([5, 2])
    expect(apply(catchUp, { type: 'openAdventDoor', day: 6 }, DEC5)).toBe(catchUp)
    expect(apply(catchUp, { type: 'openAdventDoor', day: 5 }, DEC5)).toBe(catchUp)
  })

  it('all twenty-four doors pay their sum and the star', () => {
    let s = init({ achievements: ['advent-star'] }, DEC24)
    for (let day = 1; day <= 24; day++) {
      s = apply(s, { type: 'openAdventDoor', day }, DEC24)
    }
    const total = SIM.ADVENT_GIFTS.reduce((sum, gift) => sum + gift, 0)
    expect(s.inventory.dewdrops).toBe(total)
    expect(s.advent?.opened).toHaveLength(24)
  })

  it('each December starts its own calendar', () => {
    const lastYear = init(
      { advent: { year: 2025, opened: Array.from({ length: 24 }, (_, i) => i + 1) } },
      DEC5,
    )
    const opened = apply(lastYear, { type: 'openAdventDoor', day: 1 }, DEC5)
    expect(opened.advent).toEqual({ year: 2026, opened: [1] })
  })
})

describe('save migration to v20', () => {
  it('gives old saves the new outdoor life, untouched', () => {
    const fresh = createInitialState(T0, 42)
    const old = {
      ...fresh,
      saveVersion: 19,
      minigames: { lastRaindropAt: null, lastWishAt: null },
      pets: Object.fromEntries(
        Object.entries(fresh.pets).filter(([key]) => key !== 'lastDragonflyAt'),
      ),
      luck: {
        day: '',
        paid: { raindrop: 0, star: 0, snail: 0, ladybird: 0, robin: 0, butterfly: 0, hedgehog: 0 },
      },
      plants: fresh.plants.map((plant) => {
        const stripped: Record<string, unknown> = { ...plant }
        delete stripped.lastCuttingAt
        return stripped
      }),
    } as Record<string, unknown>
    delete old.mail
    delete old.volunteerYear
    delete old.advent
    delete old.redeemedGifts

    const migrated = loadFromString(JSON.stringify(old))
    expect(migrated).not.toBeNull()
    expect(migrated!.mail).toEqual({ lastDay: null })
    expect(migrated!.volunteerYear).toBeNull()
    expect(migrated!.advent).toBeNull()
    expect(migrated!.redeemedGifts).toEqual([])
    expect(migrated!.minigames.lastRainbowAt).toBeNull()
    expect(migrated!.minigames.lastAppleAt).toBeNull()
    expect(migrated!.pets.lastDragonflyAt).toBeNull()
    expect(migrated!.luck.paid.apple).toBe(0)
    expect(migrated!.luck.paid.rainbow).toBe(0)
    expect(migrated!.luck.paid.dragonfly).toBe(0)
    expect(activePlant(migrated!)!.lastCuttingAt).toBeNull()
  })
})
