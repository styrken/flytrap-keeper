import { describe, expect, it } from 'vitest'
import {
  type GameState,
  SIM,
  activePlant,
  anniversaryAt,
  birthdaysPassed,
  createInitialState,
  isBirthdayToday,
  loadFromString,
  tick,
} from '../src/sim'

const PLANTED = Date.UTC(2026, 7, 14, 10, 30) // 14 Aug 2026
const DAY = 86_400_000

const init = (at = PLANTED): GameState => {
  const s = createInitialState(at, 42)
  return {
    ...s,
    quests: { ...s.quests, items: [], weekItems: [] },
    // Long ticks rain the barrel full — pre-earn its achievement so the
    // dewdrop arithmetic below only sees birthdays.
    achievements: ['rain-collector'],
  }
}

describe('anniversaries', () => {
  it('lands on the same calendar day every year', () => {
    expect(anniversaryAt(PLANTED, 1)).toBe(Date.UTC(2027, 7, 14, 10, 30))
    expect(anniversaryAt(PLANTED, 3)).toBe(Date.UTC(2029, 7, 14, 10, 30))
  })

  it('moves a leap-day planting to 28 February in ordinary years', () => {
    const leap = Date.UTC(2024, 1, 29, 9)
    expect(anniversaryAt(leap, 1)).toBe(Date.UTC(2025, 1, 28, 9))
    expect(anniversaryAt(leap, 4)).toBe(Date.UTC(2028, 1, 29, 9))
  })

  it('counts how many have passed', () => {
    expect(birthdaysPassed(PLANTED, PLANTED)).toBe(0)
    expect(birthdaysPassed(PLANTED, anniversaryAt(PLANTED, 1) - 1)).toBe(0)
    expect(birthdaysPassed(PLANTED, anniversaryAt(PLANTED, 1))).toBe(1)
    expect(birthdaysPassed(PLANTED, anniversaryAt(PLANTED, 5) + DAY)).toBe(5)
  })
})

describe('the birthday party', () => {
  it('writes a diary page, pays a present, and unlocks the achievement', () => {
    const s = init()
    const before = s.inventory.dewdrops
    const arrived = tick(s, anniversaryAt(PLANTED, 1) + 3_600_000)
    const plant = activePlant(arrived)!
    expect(plant.birthdays).toBe(1)
    const page = plant.journal.find((entry) => entry.kind === 'birthday')
    expect(page).toBeDefined()
    expect(page!.age).toBe(1)
    expect(arrived.achievements).toContain('birthday-party')
    expect(arrived.inventory.dewdrops).toBe(
      before + SIM.BIRTHDAY_DEWDROPS + SIM.ACHIEVEMENT_DEWDROPS,
    )
  })

  it('celebrates each year exactly once, with the right age on the page', () => {
    let s = tick(init(), anniversaryAt(PLANTED, 1) + DAY)
    const afterFirst = s.inventory.dewdrops
    s = tick(s, anniversaryAt(PLANTED, 2) + DAY)
    const plant = activePlant(s)!
    expect(plant.birthdays).toBe(2)
    expect(plant.journal.filter((e) => e.kind === 'birthday').map((e) => e.age)).toEqual([1, 2])
    // Second birthday: the present again, the achievement bonus never again.
    expect(s.inventory.dewdrops).toBe(afterFirst + SIM.BIRTHDAY_DEWDROPS)
    // The day after, nothing more happens.
    const later = tick(s, anniversaryAt(PLANTED, 2) + 2 * DAY)
    expect(activePlant(later)!.birthdays).toBe(2)
  })

  it('celebrates even in dormancy — a birthday is a calendar fact', () => {
    const winterPlanted = Date.UTC(2026, 0, 20, 12)
    const s = init(winterPlanted)
    const asleep: GameState = {
      ...s,
      plants: s.plants.map((p) => ({ ...p, dormant: true })),
    }
    const arrived = tick(asleep, anniversaryAt(winterPlanted, 1) + 3_600_000)
    const plant = activePlant(arrived)!
    expect(plant.dormant).toBe(true) // still winter, still sleeping
    expect(plant.birthdays).toBe(1)
    expect(plant.journal.some((e) => e.kind === 'birthday')).toBe(true)
  })

  it('knows when today is the day (and when it is not)', () => {
    const plant = activePlant(init())!
    expect(isBirthdayToday(plant, anniversaryAt(PLANTED, 1) - DAY)).toBe(false)
    // The whole birthday, morning to night — not just the planting minute.
    expect(isBirthdayToday(plant, anniversaryAt(PLANTED, 1) - 3_600_000)).toBe(true)
    expect(isBirthdayToday(plant, anniversaryAt(PLANTED, 1) + 5 * 3_600_000)).toBe(true)
    expect(isBirthdayToday(plant, anniversaryAt(PLANTED, 1) + DAY)).toBe(false)
    // The planting day itself is not a birthday yet.
    expect(isBirthdayToday(plant, PLANTED + 3_600_000)).toBe(false)
  })
})

describe('save migration to v19', () => {
  it('derives plantedAt from the diary and marks old anniversaries celebrated', () => {
    const fresh = createInitialState(PLANTED, 42)
    // Rebuild what an old v18 save looked like: no birthday fields, no snowman
    // — and a lastTickAt two-and-a-bit years after planting.
    const lastTickAt = anniversaryAt(PLANTED, 2) + 5 * DAY
    const old = {
      ...fresh,
      saveVersion: 18,
      lastTickAt,
      time: { scale: 1, realAnchor: lastTickAt, gameAnchor: lastTickAt },
      plants: fresh.plants.map((plant) => {
        const stripped: Record<string, unknown> = { ...plant }
        delete stripped.plantedAt
        delete stripped.birthdays
        return stripped
      }),
    } as Record<string, unknown>
    delete old.snowman

    const migrated = loadFromString(JSON.stringify(old))
    expect(migrated).not.toBeNull()
    expect(migrated!.snowman).toBeNull()
    const plant = migrated!.plants[0]
    expect(plant.plantedAt).toBe(PLANTED)
    expect(plant.birthdays).toBe(2)
    // No retroactive parties: the next tick has nothing to catch up on.
    const ticked = tick(migrated!, lastTickAt + 3_600_000)
    expect(activePlant(ticked)!.birthdays).toBe(2)
    expect(ticked.achievements).not.toContain('birthday-party')
  })
})
