// The keeper avatar's movement lives here as pure math — same philosophy as
// src/sim/: no Three.js, no DOM, so collisions and jumping can be unit-tested.
// The avatar is a circle (its feet) sliding against the room bounds and
// axis-aligned boxes for the furniture. Boxes with a finite `height` have a
// walkable top: land on the bed, hop from the chair onto the desk.

export interface Collider {
  id: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  /** Top surface above the floor, or WALL for things you can never stand on. */
  height: number
}

export interface Vec2 {
  x: number
  z: number
}

/** Vertical state of the avatar: feet height above the floor + velocity. */
export interface VerticalState {
  y: number
  vy: number
  grounded: boolean
}

/** Top surface of the room's floor box (see Room.tsx). */
export const FLOOR_Y = -0.89
/** Feet-circle radius — a chunky kid takes up about this much floor. */
export const PLAYER_RADIUS = 0.16
/** Walking speed in room units per second. */
export const PLAYER_SPEED = 1.75
/** Height above the feet the camera looks at (about the avatar's head). */
export const HEAD_HEIGHT = 0.62
/** Where a session starts: on the rug, facing the windowsill. */
export const SPAWN = { x: 0.5, z: 2.3, yaw: Math.PI }

/** Gravity and jump impulse: apex ≈ v²/2g ≈ 0.54 — onto the bed or chair
 * from the floor, onto the desk from the chair, never onto the windowsill. */
export const GRAVITY = 8
export const JUMP_VELOCITY = 2.95
/** Ledges lower than this are stepped onto instead of blocking. */
export const STEP_UP = 0.08
/** A landing faster than this on the bed bounces back up. */
export const BED_BOUNCE_MIN_SPEED = 1.2
const BED_BOUNCE_RESTITUTION = 0.42

/** Sentinel height for pure obstacles (sill, lamp…) with no walkable top. */
export const WALL = Number.POSITIVE_INFINITY

/**
 * Where the avatar may stand: inside the side walls, off the open back edge
 * of the floor, and clear of the window wall. The sill/radiator strip in the
 * middle of the window wall is a collider (not a bound), so the avatar can
 * still walk right up to the window left and right of it.
 */
export const ROOM_BOUNDS = { minX: -3.4, maxX: 3.4, minZ: -0.34, maxZ: 3.88 }

/** Footprints of the fixed furniture (positions from Room.tsx / Diorama.tsx). */
const FURNITURE: Collider[] = [
  // windowsill + radiator + curtain strip on the window wall
  { id: 'sill', minX: -1.75, maxX: 1.75, minZ: -0.6, maxZ: 0.58, height: WALL },
  // bed along the left wall: solid headboard, bouncy walkable mattress
  { id: 'headboard', minX: -3.63, maxX: -2.27, minZ: -0.17, maxZ: -0.02, height: WALL },
  { id: 'bed', minX: -3.63, maxX: -2.27, minZ: -0.02, maxZ: 2.03, height: 0.45 },
  // desk against the right wall — reachable with a jump from the chair
  { id: 'desk', minX: 2.82, maxX: 3.58, minZ: -0.05, maxZ: 1.45, height: 0.745 },
  // chair in front of the desk. The whole box is walkable seat: a collider for
  // the thin backrest would wall off every jump approach once grown by the
  // player radius, so the backrest is visual only.
  { id: 'chair', minX: 2.4, maxX: 2.84, minZ: 0.48, maxZ: 0.92, height: 0.42 },
]

/** Decor that becomes solid once it actually stands in the room. */
const LAMP: Collider = {
  id: 'lamp',
  minX: -3.34,
  maxX: -2.96,
  minZ: 2.56,
  maxZ: 2.94,
  height: WALL,
}
const COMPUTER: Collider = {
  id: 'computer',
  minX: 3.14,
  maxX: 3.36,
  minZ: 0.12,
  maxZ: 0.78,
  height: WALL,
}

/** The solid obstacles for a given set of owned shop items. */
export function roomColliders(items: readonly string[]): Collider[] {
  const colliders = [...FURNITURE]
  if (items.includes('lamp')) colliders.push(LAMP)
  if (items.includes('computer')) colliders.push(COMPUTER)
  return colliders
}

/** Whether a collider blocks someone whose feet are at `feetY`: walkable tops
 * stop blocking once you stand on (or above) them. */
function blocksAt(c: Collider, feetY: number): boolean {
  return c.height > feetY + STEP_UP
}

/**
 * Move the feet circle by `move`, sliding along whatever it hits. Axes are
 * resolved separately against the boxes grown by the player radius, so a
 * diagonal push into a wall glides along it instead of sticking.
 */
export function stepPlayer(pos: Vec2, move: Vec2, colliders: readonly Collider[], feetY = 0): Vec2 {
  const r = PLAYER_RADIUS
  let x = pos.x + move.x
  if (move.x !== 0) {
    for (const c of colliders) {
      if (!blocksAt(c, feetY)) continue
      if (pos.z > c.minZ - r && pos.z < c.maxZ + r && x > c.minX - r && x < c.maxX + r) {
        x = move.x > 0 ? c.minX - r : c.maxX + r
      }
    }
  }
  x = Math.min(ROOM_BOUNDS.maxX, Math.max(ROOM_BOUNDS.minX, x))

  let z = pos.z + move.z
  if (move.z !== 0) {
    for (const c of colliders) {
      if (!blocksAt(c, feetY)) continue
      if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
        z = move.z > 0 ? c.minZ - r : c.maxZ + r
      }
    }
  }
  z = Math.min(ROOM_BOUNDS.maxZ, Math.max(ROOM_BOUNDS.minZ, z))

  return { x, z }
}

/**
 * The surface underfoot at (x, z) for someone whose feet are at `feetY`:
 * the highest walkable top at or below the feet (plus the step allowance),
 * else the floor. Returns the surface height and what it belongs to.
 */
export function groundAt(
  x: number,
  z: number,
  colliders: readonly Collider[],
  feetY: number,
): { height: number; id: string | null } {
  const r = PLAYER_RADIUS
  let height = 0
  let id: string | null = null
  for (const c of colliders) {
    if (c.height === WALL || c.height > feetY + STEP_UP || c.height <= height) continue
    if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
      height = c.height
      id = c.id
    }
  }
  return { height, id }
}

/**
 * Advance the vertical motion by `dt`: gravity, an optional jump (only from
 * the ground), stepping up/down with the surface underfoot, and a playful
 * bounce when landing hard on the bed. Pure — returns the next state.
 */
export function stepVertical(
  state: VerticalState,
  ground: { height: number; id: string | null },
  jump: boolean,
  dt: number,
): VerticalState {
  let { y, vy } = state

  if (state.grounded) {
    if (jump) {
      vy = JUMP_VELOCITY
    } else if (y <= ground.height + 1e-4) {
      return { y: ground.height, vy: 0, grounded: true } // follow small steps
    }
    // otherwise the ground dropped away underfoot — fall
  }

  vy -= GRAVITY * dt
  y += vy * dt

  if (vy <= 0 && y <= ground.height) {
    if (ground.id === 'bed' && vy < -BED_BOUNCE_MIN_SPEED) {
      return { y: ground.height, vy: -vy * BED_BOUNCE_RESTITUTION, grounded: false }
    }
    return { y: ground.height, vy: 0, grounded: true }
  }
  return { y, vy, grounded: false }
}
