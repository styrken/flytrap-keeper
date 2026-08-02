import { describe, expect, it } from 'vitest'
import {
  GRAVITY,
  JUMP_VELOCITY,
  PLAYER_RADIUS,
  ROOM_BOUNDS,
  SPAWN,
  type VerticalState,
  groundAt,
  roomColliders,
  stepPlayer,
  stepVertical,
} from '../src/scene/playerMovement'

const base = roomColliders([])
const collider = (id: string, colliders = base) => {
  const found = colliders.find((c) => c.id === id)
  if (!found) throw new Error(`no collider ${id}`)
  return found
}

describe('player movement', () => {
  it('spawns inside the walkable bounds and clear of all furniture', () => {
    expect(SPAWN.x).toBeGreaterThan(ROOM_BOUNDS.minX)
    expect(SPAWN.x).toBeLessThan(ROOM_BOUNDS.maxX)
    expect(SPAWN.z).toBeGreaterThan(ROOM_BOUNDS.minZ)
    expect(SPAWN.z).toBeLessThan(ROOM_BOUNDS.maxZ)
    for (const c of roomColliders(['lamp', 'computer'])) {
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
    const lamp = collider('lamp', withLamp)
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

describe('walkable furniture tops', () => {
  it('the bed blocks from the floor but not while standing on it', () => {
    const bed = collider('bed')
    const fromFloor = stepPlayer({ x: -2.0, z: 1.0 }, { x: -0.6, z: 0 }, base, 0)
    expect(fromFloor.x).toBeCloseTo(bed.maxX + PLAYER_RADIUS)
    const onBed = stepPlayer({ x: -2.5, z: 1.0 }, { x: -0.6, z: 0 }, base, bed.height)
    expect(onBed.x).toBeCloseTo(-3.1)
  })

  it('the headboard still stops you while walking on the bed', () => {
    const headboard = collider('headboard')
    const next = stepPlayer({ x: -3.0, z: 0.5 }, { x: 0, z: -0.6 }, base, 0.45)
    expect(next.z).toBeCloseTo(headboard.maxZ + PLAYER_RADIUS)
  })

  it('keeps a jump-approach lane onto the chair seat from the south', () => {
    const chair = collider('chair')
    // on the floor the seat blocks…
    const walking = stepPlayer({ x: 2.5, z: 1.3 }, { x: 0, z: -0.5 }, base, 0)
    expect(walking.z).toBeCloseTo(chair.maxZ + PLAYER_RADIUS)
    // …but mid-jump the same push crosses onto it
    const jumping = stepPlayer({ x: 2.5, z: 1.3 }, { x: 0, z: -0.5 }, base, 0.55)
    expect(jumping.z).toBeCloseTo(0.8)
    expect(groundAt(jumping.x, jumping.z, base, 0.55)).toEqual({ height: 0.42, id: 'chair' })
  })

  it('reports the surface underfoot only when it is reachable', () => {
    expect(groundAt(0.5, 2.5, base, 0)).toEqual({ height: 0, id: null })
    // over the bed, falling from above: the mattress is the ground
    expect(groundAt(-3.0, 1.0, base, 0.5)).toEqual({ height: 0.45, id: 'bed' })
    // over the bed at floor level (blocked, but never the ground)
    expect(groundAt(-3.0, 1.0, base, 0).height).toBe(0)
    // the desk counts only from (roughly) desk height
    expect(groundAt(3.2, 1.0, base, 0.8)).toEqual({ height: 0.745, id: 'desk' })
    expect(groundAt(3.2, 1.0, base, 0.3).height).toBe(0)
    // the sill is a pure wall: never a surface, whatever the height
    expect(groundAt(0, 0, base, 2).id).toBeNull()
  })
})

describe('jumping', () => {
  const FLOOR = { height: 0, id: null }
  const DT = 1 / 120

  const simulate = (
    state: VerticalState,
    ground: { height: number; id: string | null },
    seconds: number,
    jumpAtStart = false,
  ) => {
    let s = state
    let peak = s.y
    let bounced = false
    let falling = false
    for (let t = 0; t < seconds; t += DT) {
      const wasFalling = falling
      s = stepVertical(s, ground, jumpAtStart && t === 0, DT)
      peak = Math.max(peak, s.y)
      falling = !s.grounded && s.vy < 0
      if (wasFalling && s.vy > 0) bounced = true
    }
    return { state: s, peak, bounced }
  }

  it('a jump rises about six tenths of a unit and lands back on the floor', () => {
    const { state, peak } = simulate({ y: 0, vy: 0, grounded: true }, FLOOR, 2, true)
    expect(peak).toBeGreaterThan(0.55)
    expect(peak).toBeLessThan(0.65)
    expect(state).toEqual({ y: 0, vy: 0, grounded: true })
  })

  it('cannot jump again mid-air', () => {
    let s = stepVertical({ y: 0, vy: 0, grounded: true }, FLOOR, true, DT)
    const rising = s.vy
    s = stepVertical(s, FLOOR, true, DT)
    expect(s.vy).toBeLessThan(rising) // second press did nothing
  })

  it('reaches the bed and chair from the floor, the desk only via the chair', () => {
    const apex = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY)
    expect(apex).toBeGreaterThan(collider('bed').height + 0.05)
    expect(apex).toBeGreaterThan(collider('chair').height + 0.05)
    expect(apex).toBeLessThan(collider('desk').height)
    expect(collider('chair').height + apex).toBeGreaterThan(collider('desk').height + 0.05)
  })

  it('walking off an edge falls to the floor', () => {
    const { state } = simulate({ y: 0.45, vy: 0, grounded: true }, FLOOR, 1)
    expect(state).toEqual({ y: 0, vy: 0, grounded: true })
  })

  it('a hard landing on the bed bounces, then settles', () => {
    const BED = { height: 0.45, id: 'bed' }
    const { state, bounced } = simulate({ y: 1.1, vy: 0, grounded: false }, BED, 3)
    expect(bounced).toBe(true)
    expect(state).toEqual({ y: 0.45, vy: 0, grounded: true })
  })

  it('the same landing on the floor does not bounce', () => {
    const { state, bounced } = simulate({ y: 0.65, vy: 0, grounded: false }, FLOOR, 3)
    expect(bounced).toBe(false)
    expect(state).toEqual({ y: 0, vy: 0, grounded: true })
  })
})
