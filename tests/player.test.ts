import { describe, expect, it } from 'vitest'
import {
  PLAYER_RADIUS,
  ROOM_BOUNDS,
  SPAWN,
  roomColliders,
  stepPlayer,
} from '../src/scene/playerMovement'

const base = roomColliders([])
const collider = (id: string) => {
  const found = base.find((c) => c.id === id)
  if (!found) throw new Error(`no collider ${id}`)
  return found
}

describe('player movement', () => {
  it('spawns inside the walkable bounds and clear of all furniture', () => {
    expect(SPAWN.x).toBeGreaterThan(ROOM_BOUNDS.minX)
    expect(SPAWN.x).toBeLessThan(ROOM_BOUNDS.maxX)
    expect(SPAWN.z).toBeGreaterThan(ROOM_BOUNDS.minZ)
    expect(SPAWN.z).toBeLessThan(ROOM_BOUNDS.maxZ)
    for (const c of roomColliders(['lamp'])) {
      const overlaps =
        SPAWN.x > c.minX - PLAYER_RADIUS &&
        SPAWN.x < c.maxX + PLAYER_RADIUS &&
        SPAWN.z > c.minZ - PLAYER_RADIUS &&
        SPAWN.z < c.maxZ + PLAYER_RADIUS
      expect(overlaps, c.id).toBe(false)
    }
  })

  it('walks freely across open floor', () => {
    const next = stepPlayer({ x: 0.5, z: 2.5 }, { x: 0.1, z: -0.1 }, base)
    expect(next.x).toBeCloseTo(0.6)
    expect(next.z).toBeCloseTo(2.4)
  })

  it('does not mutate the input position', () => {
    const pos = { x: 0.5, z: 2.5 }
    stepPlayer(pos, { x: 0.2, z: 0.2 }, base)
    expect(pos).toEqual({ x: 0.5, z: 2.5 })
  })

  it('stays inside the room bounds', () => {
    const next = stepPlayer({ x: 3.3, z: 3.8 }, { x: 1, z: 1 }, base)
    expect(next.x).toBe(ROOM_BOUNDS.maxX)
    expect(next.z).toBe(ROOM_BOUNDS.maxZ)
    const back = stepPlayer({ x: -3.3, z: 3 }, { x: -1, z: 0 }, base)
    expect(back.x).toBe(ROOM_BOUNDS.minX)
  })

  it('stops at the bed instead of walking through it', () => {
    const bed = collider('bed')
    const next = stepPlayer({ x: -2.0, z: 1.0 }, { x: -0.6, z: 0 }, base)
    expect(next.x).toBeCloseTo(bed.maxX + PLAYER_RADIUS)
    expect(next.z).toBeCloseTo(1.0)
  })

  it('slides along the sill when pushing into it diagonally', () => {
    const sill = collider('sill')
    const next = stepPlayer({ x: 0.4, z: 0.9 }, { x: 0.2, z: -0.4 }, base)
    expect(next.x).toBeCloseTo(0.6)
    expect(next.z).toBeCloseTo(sill.maxZ + PLAYER_RADIUS)
  })

  it('cannot cut between chair and desk', () => {
    const chair = collider('chair')
    const next = stepPlayer({ x: 2.1, z: 0.7 }, { x: 0.4, z: 0 }, base)
    expect(next.x).toBeCloseTo(chair.minX - PLAYER_RADIUS)
  })

  it('the floor lamp becomes solid only once it is owned', () => {
    const start = { x: -3.15, z: 3.3 }
    const move = { x: 0, z: -0.45 }
    const without = stepPlayer(start, move, roomColliders([]))
    expect(without.z).toBeCloseTo(2.85)
    const withLamp = roomColliders(['lamp'])
    const lamp = withLamp.find((c) => c.id === 'lamp')
    if (!lamp) throw new Error('no lamp collider')
    const blocked = stepPlayer(start, move, withLamp)
    expect(blocked.z).toBeCloseTo(lamp.maxZ + PLAYER_RADIUS)
  })

  it('walking straight into a wall face stops without jitter', () => {
    const sill = collider('sill')
    const atSill = { x: 0, z: sill.maxZ + PLAYER_RADIUS }
    const next = stepPlayer(atSill, { x: 0, z: -0.05 }, base)
    expect(next.z).toBeCloseTo(atSill.z)
    const again = stepPlayer(next, { x: 0, z: -0.05 }, base)
    expect(again.z).toBeCloseTo(atSill.z)
  })
})
