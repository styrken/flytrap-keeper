import { describe, expect, it } from 'vitest'
import { SIM, SPECIES, activePlant, apply, createInitialState, tick } from '../src/sim'
import type { GameState, ShopItemId } from '../src/sim'

const T0 = 1_700_000_000_000
const h = (n: number) => n * 3_600_000

const init = (dewdrops = 0, items: string[] = []): GameState => {
  const s = createInitialState(T0, 42)
  return {
    ...s,
    quests: { ...s.quests, items: [] },
    inventory: { dewdrops, items },
  }
}

describe('butterwort', () => {
  it('is the lime-tolerant exception: tap water costs it nothing', () => {
    let state = apply(init(200), { type: 'buy', item: 'seed-pinguicula' }, T0)
    const ping = activePlant(state)!
    expect(ping.speciesId).toBe('pinguicula')
    expect(ping.nickname).toBe('Ping')

    // dry it a little, then reach for the tap — no limescale flinch
    state = tick(state, T0 + h(6))
    const before = activePlant(state)!.health
    state = apply(state, { type: 'tapWater' }, T0 + h(6))
    expect(activePlant(state)!.water).toBe(100)
    expect(activePlant(state)!.health).toBeGreaterThanOrEqual(before)
  })

  it('the flytrap still pays the limescale price', () => {
    let state = tick(init(), T0 + h(6))
    const before = activePlant(state)!.health
    state = apply(state, { type: 'tapWater' }, T0 + h(6))
    expect(activePlant(state)!.health).toBeCloseTo(before - SIM.TAP_WATER_HEALTH_PENALTY, 5)
  })

  it('catches tiny prey passively, like the sundew: sticky leaves slow the hunger', () => {
    expect(SPECIES.pinguicula.passiveCatch).toBe(true)
    const state = apply(init(200), { type: 'buy', item: 'seed-pinguicula' }, T0)
    const drained: GameState = {
      ...state,
      plants: state.plants.map((p) => ({ ...p, nutrition: 10 })),
    }
    const after = tick(drained, T0 + h(10))
    const ping = after.plants.find((p) => p.speciesId === 'pinguicula')!
    const flytrap = after.plants.find((p) => p.speciesId === 'dionaea')!
    // both got hungrier, but the sticky rosette clearly less so
    expect(ping.nutrition).toBeGreaterThan(flytrap.nutrition + 5)
  })

  it('is temperate: it needs its winter rest', () => {
    expect(SPECIES.pinguicula.needsDormancy).toBe(true)
    expect(SPECIES.pinguicula.needsMisting).toBe(false)
  })

  it('owning all five species completes the collection', () => {
    const seeds: ShopItemId[] = [
      'seed-drosera',
      'seed-nepenthes',
      'seed-sarracenia',
      'seed-pinguicula',
    ]
    let state = { ...init(2000), inventory: { dewdrops: 2000, items: ['greenhouse'] } }
    for (const seed of seeds.slice(0, 3)) {
      state = apply(state, { type: 'buy', item: seed }, T0)
      expect(state.achievements).not.toContain('full-collection')
    }
    state = apply(state, { type: 'buy', item: 'seed-pinguicula' }, T0)
    expect(state.achievements).toContain('full-collection')
    expect(new Set(state.plants.map((p) => p.speciesId)).size).toBe(5)
  })
})
