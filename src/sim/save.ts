import type { GameState } from './types'

export const SAVE_KEY = 'flytrap-keeper:save'
export const SAVE_VERSION = 6

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
