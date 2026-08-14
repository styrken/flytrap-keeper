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
export const PLAYER_RADIUS = 0.26
/** Walking speed in room units per second. */
export const PLAYER_SPEED = 2.2
/** Height above the feet the camera looks at (about the avatar's head). */
export const HEAD_HEIGHT = 1.0
/** Where a session starts: on the rug, facing the windowsill. */
export const SPAWN = { x: 0.5, z: 2.3, yaw: Math.PI }

/** Gravity and jump impulse: apex ≈ v²/2g ≈ 0.6 — onto the bed or chair
 * from the floor, onto the desk from the chair, never onto the windowsill. */
export const GRAVITY = 8
export const JUMP_VELOCITY = 3.1
/** Ledges lower than this are stepped onto instead of blocking. */
export const STEP_UP = 0.08
/** A landing faster than this on the bed bounces back up. */
export const BED_BOUNCE_MIN_SPEED = 1.2
const BED_BOUNCE_RESTITUTION = 0.42

/** The garden trampoline: every landing bounces (gently decaying), and a
 * jump pressed while standing or landing on it pumps higher and higher,
 * up to a cap of about three room-heights of air. */
export const TRAMPOLINE_TOP = 0.28
export const TRAMPOLINE_MIN_BOUNCE_SPEED = 0.8
export const TRAMPOLINE_RESTITUTION = 0.82
export const TRAMPOLINE_BOOST = 1.22
export const TRAMPOLINE_MAX_VELOCITY = 5.4

/** Sentinel height for pure obstacles (sill, lamp…) with no walkable top. */
export const WALL = Number.POSITIVE_INFINITY

/**
 * Where the avatar may stand: inside the side walls, off the open back edge
 * of the floor, and clear of the window wall. The sill/radiator strip in the
 * middle of the window wall is a collider (not a bound), so the avatar can
 * still walk right up to the window left and right of it.
 */
export const ROOM_BOUNDS = { minX: -3.31, maxX: 3.31, minZ: -0.24, maxZ: 3.79 }

export interface Bounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** Inside the greenhouse's brick base walls (the doorway leads to the garden). */
export const GREENHOUSE_BOUNDS: Bounds = { minX: -3.25, maxX: 3.25, minZ: -0.78, maxZ: 2.95 }

/** Inside the garden's picket fence, up against the house facade to the north. */
export const GARDEN_BOUNDS: Bounds = { minX: -6.05, maxX: 6.05, minZ: -0.66, maxZ: 6.28 }

export type PlayerRoom = 'bedroom' | 'greenhouse' | 'garden'

export const roomBounds = (room: PlayerRoom): Bounds =>
  room === 'greenhouse' ? GREENHOUSE_BOUNDS : room === 'garden' ? GARDEN_BOUNDS : ROOM_BOUNDS

/** Where the keeper stands when a room is entered from the HUD. */
export const roomSpawn = (room: PlayerRoom): { x: number; z: number; yaw: number } =>
  room === 'greenhouse'
    ? { x: 0, z: 2.45, yaw: Math.PI }
    : room === 'garden'
      ? { x: 0.9, z: 2.6, yaw: Math.PI } // on the path, admiring the house
      : SPAWN

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

/** Footprints of the greenhouse fixtures (positions from Greenhouse.tsx). */
const GREENHOUSE_FURNITURE: Collider[] = [
  // the potting bench in the middle — plants live up there, keepers stay down
  { id: 'bench', minX: -1.7, maxX: 1.7, minZ: -0.62, maxZ: 0.62, height: WALL },
  // tomato planter in the back-left corner
  { id: 'tomatoes', minX: -3.2, maxX: -2.2, minZ: -0.85, maxZ: -0.25, height: WALL },
  // rain barrel by the left wall
  { id: 'barrel', minX: -2.85, maxX: -2.35, minZ: 1.35, maxZ: 1.85, height: WALL },
]

/** Footprints of the garden fixtures (positions from Garden.tsx). */
const GARDEN_FURNITURE: Collider[] = [
  // flower box under the big window
  { id: 'flowerbed', minX: -3.55, maxX: -1.25, minZ: -1.1, maxZ: -0.56, height: WALL },
  // rain barrel under the downspout, right of the front door
  { id: 'garden-barrel', minX: 1.6, maxX: 2.1, minZ: -0.8, maxZ: -0.3, height: WALL },
  // the old apple tree (trunk only — the canopy is well above head height)
  { id: 'tree', minX: 5.15, maxX: 5.65, minZ: 5.65, maxZ: 6.15, height: WALL },
  // letterbox by the gate
  { id: 'mailbox', minX: 1.52, maxX: 1.88, minZ: 5.84, maxZ: 6.16, height: WALL },
  // clothesline poles
  { id: 'pole-w', minX: -5.42, maxX: -5.18, minZ: 2.18, maxZ: 2.42, height: WALL },
  { id: 'pole-e', minX: -3.12, maxX: -2.88, minZ: 2.18, maxZ: 2.42, height: WALL },
  // shrubs in the south-west corner and along the east fence
  { id: 'bush-sw', minX: -6.1, maxX: -5.15, minZ: 5.25, maxZ: 6.1, height: WALL },
  { id: 'bush-e', minX: 5.45, maxX: 6.1, minZ: 2.3, maxZ: 2.95, height: WALL },
]

/** The greenhouse standing in the garden — solid only once it is owned. */
const GARDEN_GREENHOUSE: Collider = {
  id: 'garden-greenhouse',
  minX: 3.2,
  maxX: 6.0,
  minZ: -1.1,
  maxZ: 0.95,
  height: WALL,
}

/** The bought trampoline on the west lawn — jump on, then bounce away.
 * The box sits inside the round mat, so the springy part is what you land on. */
const GARDEN_TRAMPOLINE: Collider = {
  id: 'trampoline',
  minX: -4.82,
  maxX: -3.58,
  minZ: 3.88,
  maxZ: 5.12,
  height: TRAMPOLINE_TOP,
}

/** This winter's snowman on the lawn — solid from the first packed ball on.
 * (Walking through a snowman would give it away as a ghost.) */
const GARDEN_SNOWMAN: Collider = {
  id: 'snowman',
  minX: -2.74,
  maxX: -2.06,
  minZ: 4.06,
  maxZ: 4.74,
  height: WALL,
}

/** The bought pond on the south-east lawn — keepers stay dry, rules are rules. */
const GARDEN_POND: Collider = {
  id: 'pond',
  minX: 2.3,
  maxX: 3.9,
  minZ: 3.9,
  maxZ: 5.5,
  height: WALL,
}

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

/** The solid obstacles of a room, given the displayed garden's shop items —
 * and, in winter, whether a snowman stands on the lawn. */
export function roomColliders(
  items: readonly string[],
  room: PlayerRoom = 'bedroom',
  snowmanUp = false,
): Collider[] {
  if (room === 'greenhouse') return [...GREENHOUSE_FURNITURE]
  if (room === 'garden') {
    const colliders = [...GARDEN_FURNITURE]
    if (items.includes('greenhouse')) colliders.push(GARDEN_GREENHOUSE)
    if (items.includes('trampoline')) colliders.push(GARDEN_TRAMPOLINE)
    if (items.includes('pond')) colliders.push(GARDEN_POND)
    if (snowmanUp) colliders.push(GARDEN_SNOWMAN)
    return colliders
  }
  const colliders = [...FURNITURE]
  if (items.includes('lamp')) colliders.push(LAMP)
  if (items.includes('computer')) colliders.push(COMPUTER)
  return colliders
}

/* --------------------------------- doorways ---------------------------------- */

export interface Doorway {
  /** Where this door leads. */
  to: PlayerRoom
  /** The door mat: step into this zone and you walk through. */
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  /** Where you arrive on the other side — clear of that room's own door mats. */
  spawn: { x: number; z: number; yaw: number }
  /** The garden's greenhouse door only exists once the greenhouse is owned. */
  needsGreenhouse?: boolean
}

/**
 * The doors that stitch the world together: the bedroom door opens onto the
 * garden, the house's front door leads back in, and the greenhouse (once
 * owned) can be entered from the garden and left through its doorway gap.
 * Every mat sits against a wall or bound, so you trigger it by deliberately
 * walking into the door — never by strolling past.
 */
const DOORWAYS: Record<PlayerRoom, Doorway[]> = {
  bedroom: [
    // the door in the right wall, out to the garden
    {
      to: 'garden',
      minX: 3.17,
      maxX: 3.4,
      minZ: 2.62,
      maxZ: 3.28,
      spawn: { x: 0.9, z: -0.1, yaw: 0 },
    },
  ],
  garden: [
    // the front door of the house, back into the bedroom
    {
      to: 'bedroom',
      minX: 0.55,
      maxX: 1.25,
      minZ: -0.9,
      maxZ: -0.52,
      spawn: { x: 2.82, z: 2.95, yaw: -Math.PI / 2 },
    },
    // the greenhouse door on its south face
    {
      to: 'greenhouse',
      minX: 4.3,
      maxX: 4.9,
      minZ: 0.95,
      maxZ: 1.28,
      needsGreenhouse: true,
      spawn: { x: 0, z: 2.45, yaw: Math.PI },
    },
  ],
  greenhouse: [
    // the doorway gap in the front base wall, out to the garden
    {
      to: 'garden',
      minX: -0.45,
      maxX: 0.45,
      minZ: 2.88,
      maxZ: 3.1,
      spawn: { x: 4.6, z: 1.6, yaw: 0 },
    },
  ],
}

/** The doorways leading out of `room` (for tests and tooling). */
export const roomDoorways = (room: PlayerRoom): readonly Doorway[] => DOORWAYS[room]

/** The doorway the keeper is standing in, if any. */
export function doorwayAt(room: PlayerRoom, pos: Vec2, greenhouseOwned: boolean): Doorway | null {
  for (const door of DOORWAYS[room]) {
    if (door.needsGreenhouse && !greenhouseOwned) continue
    if (pos.x > door.minX && pos.x < door.maxX && pos.z > door.minZ && pos.z < door.maxZ) {
      return door
    }
  }
  return null
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
export function stepPlayer(
  pos: Vec2,
  move: Vec2,
  colliders: readonly Collider[],
  feetY = 0,
  bounds: Bounds = ROOM_BOUNDS,
): Vec2 {
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
  x = Math.min(bounds.maxX, Math.max(bounds.minX, x))

  let z = pos.z + move.z
  if (move.z !== 0) {
    for (const c of colliders) {
      if (!blocksAt(c, feetY)) continue
      if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
        z = move.z > 0 ? c.minZ - r : c.maxZ + r
      }
    }
  }
  z = Math.min(bounds.maxZ, Math.max(bounds.minZ, z))

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
      // A standing jump off the trampoline already springs extra high.
      vy = ground.id === 'trampoline' ? JUMP_VELOCITY * TRAMPOLINE_BOOST : JUMP_VELOCITY
    } else if (y <= ground.height + 1e-4) {
      return { y: ground.height, vy: 0, grounded: true } // follow small steps
    }
    // otherwise the ground dropped away underfoot — fall
  }

  vy -= GRAVITY * dt
  y += vy * dt

  if (vy <= 0 && y <= ground.height) {
    if (ground.id === 'trampoline') {
      // A jump timed with the landing pumps the bounce higher (up to the
      // cap); otherwise the mat returns most of the fall on its own.
      if (jump) {
        const pumped = Math.min(
          Math.max(JUMP_VELOCITY, -vy) * TRAMPOLINE_BOOST,
          TRAMPOLINE_MAX_VELOCITY,
        )
        return { y: ground.height, vy: pumped, grounded: false }
      }
      if (vy < -TRAMPOLINE_MIN_BOUNCE_SPEED) {
        return { y: ground.height, vy: -vy * TRAMPOLINE_RESTITUTION, grounded: false }
      }
    }
    if (ground.id === 'bed' && vy < -BED_BOUNCE_MIN_SPEED) {
      return { y: ground.height, vy: -vy * BED_BOUNCE_RESTITUTION, grounded: false }
    }
    return { y: ground.height, vy: 0, grounded: true }
  }
  return { y, vy, grounded: false }
}
