import { describe, expect, it } from 'vitest'
import {
  SAVE_VERSION,
  apply,
  createInitialState,
  loadFromString,
  saveToString,
  tick,
} from '../src/sim'

const T0 = 1_700_000_000_000
const h = (n: number) => n * 3_600_000

describe('save/load', () => {
  it('round-trips a lived-in game state exactly', () => {
    let state = createInitialState(T0, 42)
    state = apply(state, { type: 'feedTrap', plantId: 'p1', trapId: 't1' }, T0)
    state = apply(state, { type: 'move', placement: 'north-window' }, T0 + h(2))
    state = tick(state, T0 + h(30))

    const loaded = loadFromString(saveToString(state))
    expect(loaded).toEqual(state)
  })

  it('rejects corrupt or foreign JSON', () => {
    expect(loadFromString('garbage{')).toBeNull()
    expect(loadFromString('null')).toBeNull()
    expect(loadFromString('{"hello":"world"}')).toBeNull()
    expect(loadFromString('{"saveVersion":1,"plants":[]}')).toBeNull()
  })

  it('rejects saves from a newer app version', () => {
    const state = createInitialState(T0, 42)
    const future = saveToString({ ...state, saveVersion: SAVE_VERSION + 1 })
    expect(loadFromString(future)).toBeNull()
  })

  it('rejects unknown older versions with no migration path', () => {
    const state = createInitialState(T0, 42)
    const ancient = saveToString({ ...state, saveVersion: 0 })
    expect(loadFromString(ancient)).toBeNull()
  })

  it('migrates a v8 save to add the music setting, defaulting on', () => {
    const state = createInitialState(T0, 42)
    const v8 = JSON.parse(saveToString(state)) as Record<string, unknown>
    v8.saveVersion = 8
    const settings = v8.settings as Record<string, unknown>
    delete settings.music
    settings.sound = false

    const loaded = loadFromString(JSON.stringify(v8))
    expect(loaded).not.toBeNull()
    expect(loaded!.saveVersion).toBe(SAVE_VERSION)
    expect(loaded!.settings.music).toBe(true)
    expect(loaded!.settings.sound).toBe(false)
  })
})
