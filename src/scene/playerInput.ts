// Shared input state for the keeper avatar. Keyboard (WASD/arrows) and the
// touch joystick both write here; the Player reads it once per frame. It
// lives outside React so the per-frame path allocates nothing.

/** x = strafe right, y = forward — both in camera terms, each in [-1, 1]. */
export interface MoveInput {
  x: number
  y: number
}

const KEY_VECTORS: Record<string, readonly [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

const pressed = new Set<string>()
const joystick = { x: 0, y: 0 }

let movedOnce = false
const firstMoveListeners = new Set<() => void>()

function noteMovement() {
  if (movedOnce) return
  movedOnce = true
  for (const cb of [...firstMoveListeners]) cb()
  firstMoveListeners.clear()
}

/** True once the player has used any movement input this session. */
export function hasMoved(): boolean {
  return movedOnce
}

/** Fires `cb` on the first movement input (immediately if already moved). */
export function onFirstMove(cb: () => void): () => void {
  if (movedOnce) {
    cb()
    return () => {}
  }
  firstMoveListeners.add(cb)
  return () => firstMoveListeners.delete(cb)
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('input, textarea, select, [contenteditable="true"]') !== null
  )
}

/** Attach the keyboard listeners; returns a cleanup function. */
export function initPlayerInput(): () => void {
  const down = (e: KeyboardEvent) => {
    if (!(e.code in KEY_VECTORS) || isTypingTarget(e.target)) return
    pressed.add(e.code)
    noteMovement()
    // Keep arrows from scrolling the page or walking button focus.
    e.preventDefault()
  }
  const up = (e: KeyboardEvent) => {
    pressed.delete(e.code)
  }
  const clear = () => pressed.clear()
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', clear)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', clear)
    pressed.clear()
  }
}

/** The joystick writes its deflection here ([-1, 1] each, y up = forward). */
export function setJoystick(x: number, y: number) {
  joystick.x = x
  joystick.y = y
  if (x !== 0 || y !== 0) noteMovement()
}

/** Combined keyboard + joystick move vector, clamped to length 1. */
export function readMoveInput(out: MoveInput): MoveInput {
  let x = joystick.x
  let y = joystick.y
  for (const code of pressed) {
    const [vx, vy] = KEY_VECTORS[code]
    x += vx
    y += vy
  }
  const len = Math.hypot(x, y)
  if (len > 1) {
    x /= len
    y /= len
  }
  out.x = x
  out.y = y
  return out
}
