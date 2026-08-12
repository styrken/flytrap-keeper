import type { GameState } from './types'

export const SAVE_KEY = 'flytrap-keeper:save'
export const SAVE_VERSION = 18

type RawSave = Record<string, unknown>
type Migration = (data: RawSave) => RawSave

/** Keyed by the version being migrated FROM. Runs in sequence up to SAVE_VERSION. */
const MIGRATIONS: Record<number, Migration> = {
  // v1 -> v2: phase 2 added weather/rain barrel, sound setting, and care streak.
  1: (data) => ({
    ...data,
    weather: { rainBarrel: 60 },
    settings: { sound: true },
    careStreak: { days: 0, lastDay: null },
  }),
  // v2 -> v3: phases 4-5 added collection, humidity, locale/hard mode, flowering.
  2: (data) => {
    const plants = (Array.isArray(data.plants) ? data.plants : []) as RawSave[]
    const settings = (data.settings ?? {}) as RawSave
    return {
      ...data,
      activePlantId: (plants[0]?.id as string | undefined) ?? 'p1',
      settings: { sound: settings.sound !== false, locale: 'en', hardMode: false },
      plants: plants.map((plant) => ({
        ...plant,
        humidity: 80,
        lastFedAt: null,
        potColor: null,
        flowering: null,
        dead: false,
        criticalSince: null,
      })),
    }
  },
  // v3 -> v4: petting.
  3: (data) => ({
    ...data,
    plants: ((Array.isArray(data.plants) ? data.plants : []) as RawSave[]).map((plant) => ({
      ...plant,
      lastPetAt: null,
    })),
  }),
  // v4 -> v5: weeds — the first one sprouts a couple of hours after upgrading.
  4: (data) => {
    const base = typeof data.lastTickAt === 'number' ? data.lastTickAt : 0
    return {
      ...data,
      plants: ((Array.isArray(data.plants) ? data.plants : []) as RawSave[]).map((plant) => ({
        ...plant,
        nextWeedAt: base + 2 * 3_600_000,
      })),
    }
  },
  // v5 -> v6: minigames (golden raindrops).
  5: (data) => ({ ...data, minigames: { lastRaindropAt: null } }),
  // v6 -> v7: daily quests — the next tick draws the day's set.
  6: (data) => ({ ...data, quests: { day: '', items: [] } }),
  // v7 -> v8: the game clock (speed mode) — old saves ran at real time,
  // so anchoring both clocks at lastTickAt keeps game time ≡ wall clock.
  7: (data) => {
    const base = typeof data.lastTickAt === 'number' ? data.lastTickAt : 0
    return { ...data, time: { scale: 1, realAnchor: base, gameAnchor: base } }
  },
  // v8 -> v9: calm background music, on by default.
  8: (data) => {
    const settings = (data.settings ?? {}) as RawSave
    return { ...data, settings: { ...settings, music: true } }
  },
  // v9 -> v10: the greenhouse. No new fields — the bump exists so clients
  // without the 'greenhouse' placement refuse these saves instead of
  // simulating a plant in a spot they don't know.
  9: (data) => data,
  // v10 -> v11: the language now follows the browser unless explicitly chosen
  // ('' = auto). A stored 'en' was the old default, indistinguishable from a
  // real choice, so it resets to auto; 'da' was always a deliberate pick.
  10: (data) => {
    const settings = (data.settings ?? {}) as RawSave
    const locale =
      typeof settings.locale === 'string' && settings.locale !== 'en' ? settings.locale : ''
    return { ...data, settings: { ...settings, locale } }
  },
  // v11 -> v12: night life (star wishes), cultivars, accessories and pets —
  // existing plants are the plain species, undressed; nothing has been wished
  // for, and nobody furry (or slimy) has moved in yet.
  11: (data) => {
    const minigames = (data.minigames ?? {}) as RawSave
    return {
      ...data,
      minigames: { ...minigames, lastWishAt: null },
      pets: {
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
      },
      plants: ((Array.isArray(data.plants) ? data.plants : []) as RawSave[]).map((plant) => ({
        ...plant,
        cultivar: null,
        accessory: null,
      })),
    }
  },
  // v12 -> v13: butterwort, the plant diary and the arcade. The species alone
  // warrants the bump: older clients must refuse a save that may contain a
  // pinguicula rather than mis-simulate a species they don't know. Existing
  // plants open their diary on a fresh first page.
  12: (data) => {
    const base = typeof data.lastTickAt === 'number' ? data.lastTickAt : 0
    return {
      ...data,
      arcade: { best: 0, day: '', paidToday: 0 },
      plants: ((Array.isArray(data.plants) ? data.plants : []) as RawSave[]).map((plant) => ({
        ...plant,
        journal: [{ at: base, kind: 'firstPage' }],
      })),
    }
  },
  // v13 -> v14: the flower stalk now rests between shows. Without the field a
  // cut stalk regrew on the very next tick, so the choice dialog never went away.
  13: (data) => ({
    ...data,
    plants: ((Array.isArray(data.plants) ? data.plants : []) as RawSave[]).map((plant) => ({
      ...plant,
      lastFloweringEndedAt: null,
    })),
  }),
  // v14 -> v15: the fly pack — the shop's first consumable. Nothing in stock yet.
  14: (data) => {
    const inventory = (data.inventory ?? {}) as RawSave
    return { ...data, inventory: { ...inventory, flyPacks: 0 } }
  },
  // v15 -> v16: one fly pack grew into a whole shelf of insect packs — the
  // lone flyPacks counter moves into the per-kind record.
  15: (data) => {
    const { flyPacks, ...inventory } = (data.inventory ?? {}) as RawSave
    return {
      ...data,
      inventory: {
        ...inventory,
        packs: {
          fly: typeof flyPacks === 'number' ? flyPacks : 0,
          mosquito: 0,
          moth: 0,
          spider: 0,
        },
      },
    }
  },
  // v16 -> v17: weekly quests join the dailies — the next tick draws the pair.
  16: (data) => {
    const quests = (data.quests ?? { day: '', items: [] }) as RawSave
    return { ...data, quests: { ...quests, week: '', weekItems: [] } }
  },
  // v17 -> v18: daily luck jars — every little friend starts with a full one.
  17: (data) => ({
    ...data,
    luck: {
      day: '',
      paid: { raindrop: 0, star: 0, snail: 0, ladybird: 0, robin: 0, butterfly: 0, hedgehog: 0 },
    },
  }),
}

export function saveToString(state: GameState): string {
  return JSON.stringify(state)
}

/** Returns null for corrupt, unrecognizable, or newer-than-us saves. */
export function loadFromString(raw: string): GameState | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null

  let save = data as RawSave
  let version = typeof save.saveVersion === 'number' ? save.saveVersion : NaN
  if (!Number.isFinite(version) || version > SAVE_VERSION) return null

  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version]
    if (!migrate) return null
    save = migrate(save)
    version += 1
    save.saveVersion = version
  }

  return looksLikeGameState(save) ? (save as unknown as GameState) : null
}

function looksLikeGameState(data: RawSave): boolean {
  if (typeof data.lastTickAt !== 'number' || typeof data.rngSeed !== 'number') return false
  const time = data.time as RawSave | undefined
  if (typeof time !== 'object' || time === null) return false
  if (
    typeof time.scale !== 'number' ||
    typeof time.realAnchor !== 'number' ||
    typeof time.gameAnchor !== 'number'
  ) {
    return false
  }
  const weather = data.weather as RawSave | undefined
  if (typeof weather !== 'object' || weather === null) return false
  if (typeof weather.rainBarrel !== 'number') return false
  if (!Array.isArray(data.plants) || data.plants.length === 0) return false
  const plant = data.plants[0] as RawSave
  return (
    typeof plant === 'object' &&
    plant !== null &&
    typeof plant.water === 'number' &&
    typeof plant.nutrition === 'number' &&
    typeof plant.health === 'number' &&
    typeof plant.xp === 'number' &&
    Array.isArray(plant.traps)
  )
}
