import { SIM } from './config'
import { SAVE_VERSION } from './save'
import type { GameState, PlantState, TrapState } from './types'

export const freshTrap = (id: string): TrapState => ({
  id,
  usesLeft: SIM.TRAP_USES,
  digestingUntil: null,
  witheredAt: null,
})

export function createInitialState(now: number, seed: number): GameState {
  const plant: PlantState = {
    id: 'p1',
    speciesId: 'dionaea',
    nickname: 'Venus',
    water: 90,
    nutrition: 60,
    health: 100,
    xp: 0,
    stage: 0,
    placement: 'south-window',
    traps: [freshTrap('t1')],
    trapSeq: 1,
    wilted: false,
    dormant: false,
  }
  return {
    saveVersion: SAVE_VERSION,
    updatedAt: now,
    lastTickAt: now,
    rngSeed: seed >>> 0,
    plants: [plant],
    inventory: { dewdrops: 0, items: [] },
    weather: { rainBarrel: SIM.BARREL_INITIAL },
    settings: { sound: true },
    careStreak: { days: 0, lastDay: null },
    achievements: [],
  }
}
