import { describe, expect, it } from 'vitest'
import { SPECIES, activePlant, apply, createInitialState, firstReadyTrap, tick } from '../src/sim'

const T0 = 1_700_000_000_000
const h = (n: number) => n * 3_600_000

/**
 * The phase-1 flagship scenario from the plan: a week of twice-daily care
 * must produce a thriving, visibly grown plant — simulated in milliseconds.
 */
describe('seven days of care', () => {
  it('keeps the plant thriving and grows it through stages', () => {
    let state = createInitialState(T0, 7)
    const visits = 14 // every 12 hours for 7 days

    for (let visit = 1; visit <= visits; visit++) {
      const at = T0 + h(12 * visit)
      state = tick(state, at)
      state = apply(state, { type: 'water' }, at)
      // Feed every ready trap this visit — digestion limits the rest.
      for (;;) {
        const plant = activePlant(state)!
        const trap = firstReadyTrap(plant, at)
        if (!trap || plant.nutrition > 95) break
        const next = apply(state, { type: 'feedTrap', trapId: trap.id }, at)
        if (next === state) break
        state = next
      }
    }

    const plant = activePlant(state)!
    expect(plant.wilted).toBe(false)
    expect(plant.health).toBeGreaterThan(80)
    expect(plant.water).toBeGreaterThan(50)
    expect(plant.stage).toBeGreaterThanOrEqual(2)
    expect(plant.xp).toBeGreaterThan(900)
    expect(plant.traps.length).toBe(SPECIES.dionaea.stages[plant.stage].trapCount)
  })

  it('a weekend away after good care is completely safe', () => {
    let state = createInitialState(T0, 7)
    state = apply(state, { type: 'water' }, T0)
    const backHome = tick(state, T0 + h(60)) // Friday evening -> Monday morning
    const plant = activePlant(backHome)!
    expect(plant.wilted).toBe(false)
    expect(plant.health).toBeGreaterThan(50)
  })
})
