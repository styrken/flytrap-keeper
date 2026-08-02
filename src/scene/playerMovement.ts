// The keeper avatar's movement lives here as pure math — same philosophy as
// src/sim/: no Three.js, no DOM, so collisions can be unit-tested. The avatar
// is a circle (its feet) sliding against the room bounds and axis-aligned
// boxes for the furniture.

export interface Collider {
  id: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface Vec2 {
  x: number
  z: number
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
  { id: 'sill', minX: -1.75, maxX: 1.75, minZ: -0.6, maxZ: 0.58 },
  // bed along the left wall
  { id: 'bed', minX: -3.63, maxX: -2.27, minZ: -0.13, maxZ: 2.03 },
  // desk against the right wall
  { id: 'desk', minX: 2.82, maxX: 3.58, minZ: -0.05, maxZ: 1.45 },
  // chair in front of the desk
  { id: 'chair', minX: 2.4, maxX: 2.84, minZ: 0.48, maxZ: 0.92 },
]

/** Floor-lamp decor — only solid once it actually stands in the room. */
const LAMP: Collider = { id: 'lamp', minX: -3.34, maxX: -2.96, minZ: 2.56, maxZ: 2.94 }

/** The solid obstacles for a given set of owned shop items. */
export function roomColliders(items: readonly string[]): Collider[] {
  return items.includes('lamp') ? [...FURNITURE, LAMP] : FURNITURE
}

/**
 * Move the feet circle by `move`, sliding along whatever it hits. Axes are
 * resolved separately against the boxes grown by the player radius, so a
 * diagonal push into a wall glides along it instead of sticking.
 */
export function stepPlayer(pos: Vec2, move: Vec2, colliders: readonly Collider[]): Vec2 {
  const r = PLAYER_RADIUS
  let x = pos.x + move.x
  if (move.x !== 0) {
    for (const c of colliders) {
      if (pos.z > c.minZ - r && pos.z < c.maxZ + r && x > c.minX - r && x < c.maxX + r) {
        x = move.x > 0 ? c.minX - r : c.maxX + r
      }
    }
  }
  x = Math.min(ROOM_BOUNDS.maxX, Math.max(ROOM_BOUNDS.minX, x))

  let z = pos.z + move.z
  if (move.z !== 0) {
    for (const c of colliders) {
      if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
        z = move.z > 0 ? c.minZ - r : c.maxZ + r
      }
    }
  }
  z = Math.min(ROOM_BOUNDS.maxZ, Math.max(ROOM_BOUNDS.minZ, z))

  return { x, z }
}
