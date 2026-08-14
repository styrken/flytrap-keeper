import { describe, expect, it } from 'vitest'
import {
  type GameState,
  SIM,
  createInitialState,
  apply,
  hasMailWaiting,
  isRainbowSpell,
  isWindyAt,
  luckLeft,
  mailLetterIndex,
  mailToday,
  puddlesAbout,
  volunteerAbout,
  weatherAt,
  weatherPeriodMs,
} from '../src/sim'

const SUMMER = Date.UTC(2026, 6, 10, 12)
const AUTUMN = Date.UTC(2026, 9, 15, 12)
const WINTER = Date.UTC(2026, 0, 10, 12)
const SEED = 42

const init = (at: number, extra: Partial<GameState> = {}): GameState => {
  const s = createInitialState(at, SEED)
  return { ...s, quests: { ...s.quests, items: [], weekItems: [] }, ...extra }
}

/** Walk period by period from `from` until `test` says yes (bounded). */
const hunt = (from: number, test: (t: number) => boolean): number => {
  for (let i = 0; i < 4000; i++) {
    const t = from + i * weatherPeriodMs()
    if (test(t)) return t
  }
  throw new Error('never found a matching period')
}

describe('wind', () => {
  it('is deterministic, and both calm and windy periods exist', () => {
    const windy = hunt(SUMMER, (t) => isWindyAt(SEED, t))
    const calm = hunt(SUMMER, (t) => !isWindyAt(SEED, t))
    expect(isWindyAt(SEED, windy)).toBe(true)
    expect(isWindyAt(SEED, windy)).toBe(true) // same answer twice
    expect(isWindyAt(SEED, calm)).toBe(false)
  })
})

describe('the rainbow', () => {
  const spellAt = hunt(SUMMER, (t) => isRainbowSpell(SEED, t))

  it('only appears in sunshine right after rain', () => {
    expect(weatherAt(SEED, spellAt)).toBe('sun')
    expect(weatherAt(SEED, spellAt - weatherPeriodMs())).toBe('rain')
    // and never while it is still raining
    const raining = hunt(SUMMER, (t) => weatherAt(SEED, t) === 'rain')
    expect(isRainbowSpell(SEED, raining)).toBe(false)
  })

  it('pays a wish from its jar, once per moment', () => {
    const s = init(spellAt, { achievements: ['rainbow-wish'] })
    const wished = apply(s, { type: 'wishOnRainbow' }, spellAt)
    expect(wished.inventory.dewdrops).toBe(SIM.RAINBOW_WISH_DEWDROPS)
    // a tap-burst on the same rainbow folds into one wish
    const burst = apply(wished, { type: 'wishOnRainbow' }, spellAt + 1000)
    expect(burst.inventory.dewdrops).toBe(wished.inventory.dewdrops)
  })

  it('unlocks its achievement and refuses wishes under a plain sky', () => {
    const wished = apply(init(spellAt), { type: 'wishOnRainbow' }, spellAt)
    expect(wished.achievements).toContain('rainbow-wish')
    const plain = hunt(SUMMER, (t) => !isRainbowSpell(SEED, t))
    const s = init(plain)
    expect(apply(s, { type: 'wishOnRainbow' }, plain)).toBe(s)
  })
})

describe('the apple tree', () => {
  it('pays per apple in autumn until the day is picked clean', () => {
    let s = init(AUTUMN, { achievements: ['apple-picker'] })
    const gap = (SIM.APPLE_REPEAT_SECONDS + 1) * 1000
    for (let i = 0; i < SIM.DAILY_LUCK.apple; i++) {
      s = apply(s, { type: 'pickApple' }, AUTUMN + i * gap)
    }
    expect(s.inventory.dewdrops).toBe(SIM.DAILY_LUCK.apple * SIM.APPLE_DEWDROPS)
    expect(luckLeft(s, 'apple', AUTUMN)).toBe(0)
    // the tree is bare now — one more pick pays nothing
    const extra = apply(s, { type: 'pickApple' }, AUTUMN + 10 * gap)
    expect(extra.inventory.dewdrops).toBe(s.inventory.dewdrops)
  })

  it('is an autumn-only pleasure', () => {
    const s = init(SUMMER)
    expect(apply(s, { type: 'pickApple' }, SUMMER)).toBe(s)
  })
})

describe('puddles', () => {
  const wet = hunt(SUMMER, (t) => weatherAt(SEED, t) === 'rain')

  it('lie about during rain and the period right after — never in winter', () => {
    expect(puddlesAbout(SEED, wet)).toBe(true)
    expect(puddlesAbout(SEED, wet + weatherPeriodMs())).toBe(true)
    const frozen = hunt(
      WINTER,
      (t) => weatherAt(SEED, t) === 'rain' && t < WINTER + 86_400_000 * 30,
    )
    expect(puddlesAbout(SEED, frozen)).toBe(false)
  })

  it('stomping needs boots, and pays in badge only', () => {
    const bare = init(wet)
    expect(apply(bare, { type: 'stompPuddle' }, wet)).toBe(bare)
    const booted = init(wet, {
      achievements: ['puddle-jumper'], // badge pre-earned: stomps pay nothing
      inventory: { ...init(wet).inventory, items: ['rain-boots'] },
    })
    const stomped = apply(booted, { type: 'stompPuddle' }, wet)
    expect(stomped.inventory.dewdrops).toBe(0)
    // and the badge itself unlocks on a fresh save's first stomp
    const first = init(wet, { inventory: { ...init(wet).inventory, items: ['rain-boots'] } })
    expect(apply(first, { type: 'stompPuddle' }, wet).achievements).toContain('puddle-jumper')
  })
})

describe('post in the letterbox', () => {
  const DAY = 86_400_000
  const mailDay = (() => {
    for (let i = 0; i < 60; i++) {
      const t = SUMMER + i * DAY
      if (mailToday(SEED, t)) return t
    }
    throw new Error('no mail for two months?')
  })()

  it('delivers deterministically, with a letter from the pool', () => {
    expect(mailToday(SEED, mailDay)).toBe(true)
    const index = mailLetterIndex(SEED, mailDay)
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeLessThan(SIM.MAIL_LETTERS)
    expect(mailLetterIndex(SEED, mailDay)).toBe(index)
  })

  it('collects once per delivery, small treat included', () => {
    const s = init(mailDay, { achievements: ['pen-pal'] })
    expect(hasMailWaiting(s, mailDay)).toBe(true)
    const collected = apply(s, { type: 'collectMail' }, mailDay)
    expect(collected.inventory.dewdrops).toBe(SIM.MAIL_DEWDROPS)
    expect(hasMailWaiting(collected, mailDay)).toBe(false)
    const again = apply(collected, { type: 'collectMail' }, mailDay + 1000)
    expect(again.inventory.dewdrops).toBe(collected.inventory.dewdrops)
  })

  it('unlocks the pen-pal achievement on the first letter', () => {
    const collected = apply(init(mailDay), { type: 'collectMail' }, mailDay)
    expect(collected.achievements).toContain('pen-pal')
  })
})

describe('the volunteer seedling', () => {
  const windyAutumn = hunt(
    Date.UTC(2026, 8, 5, 0),
    (t) => isWindyAt(SEED, t) && new Date(t).getUTCMonth() >= 8 && new Date(t).getUTCMonth() <= 10,
  )

  it('blows in on a windy autumn day, once per year', () => {
    const s = init(windyAutumn, { achievements: ['volunteer'] })
    expect(volunteerAbout(s, windyAutumn)).toBe(true)
    const potted = apply(s, { type: 'claimVolunteer' }, windyAutumn)
    expect(potted.inventory.dewdrops).toBe(SIM.VOLUNTEER_DEWDROPS)
    expect(potted.volunteerYear).toBe(new Date(windyAutumn).getUTCFullYear())
    // this year's has been potted — no more volunteers until next autumn
    expect(volunteerAbout(potted, windyAutumn)).toBe(false)
    expect(apply(potted, { type: 'claimVolunteer' }, windyAutumn)).toBe(potted)
  })

  it('never sprouts outside autumn', () => {
    const windySummer = hunt(
      Date.UTC(2026, 5, 10, 0),
      (t) => isWindyAt(SEED, t) && new Date(t).getUTCMonth() === 5,
    )
    expect(volunteerAbout(init(windySummer), windySummer)).toBe(false)
  })
})

describe('the pond dragonfly', () => {
  it('is greeted over an owned pond in summer — high-value guest', () => {
    const base = init(SUMMER)
    const s = {
      ...base,
      achievements: ['sky-dancer'],
      inventory: { ...base.inventory, items: ['pond'] },
    }
    const greeted = apply(s, { type: 'greetDragonfly' }, SUMMER)
    expect(greeted.inventory.dewdrops).toBe(SIM.DRAGONFLY_DEWDROPS)
    expect(greeted.pets.lastDragonflyAt).toBe(SUMMER)
  })

  it('needs the pond, and keeps to the warm months', () => {
    const noPond = init(SUMMER)
    expect(apply(noPond, { type: 'greetDragonfly' }, SUMMER)).toBe(noPond)
    const base = init(AUTUMN)
    const autumn = { ...base, inventory: { ...base.inventory, items: ['pond'] } }
    expect(apply(autumn, { type: 'greetDragonfly' }, AUTUMN)).toBe(autumn)
  })
})
