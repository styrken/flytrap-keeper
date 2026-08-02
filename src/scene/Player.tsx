import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, Vector3 } from 'three'
import { useGame } from '../store'
import { initPlayerInput, readMoveInput } from './playerInput'
import { palette } from './palette'
import {
  FLOOR_Y,
  HEAD_HEIGHT,
  PLAYER_SPEED,
  SPAWN,
  roomColliders,
  stepPlayer,
} from './playerMovement'

const SHIRT = '#5d84ae'
const PANTS = '#6b4f35'
const SKIN = '#e8c49a'
const HAIR = '#5f4630'
const SHOE = '#4c3a28'

/** What the follow logic needs from OrbitControls (set via makeDefault). */
interface FollowControls {
  target: Vector3
  update: () => void
}

const UP = new Vector3(0, 1, 0)
const forward = new Vector3()
const right = new Vector3()
const moveDir = new Vector3()
const camTarget = new Vector3()
const camShift = new Vector3()
const input = { x: 0, y: 0 }

/**
 * The keeper: a blocky kid you walk around the room with. WASD/arrows or the
 * touch joystick move it (camera-relative); the orbit camera follows along.
 */
export function Player() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as FollowControls | null
  const uiOpen = useGame(
    (s) =>
      s.showOnboarding ||
      s.showSettings ||
      s.showShop ||
      s.showLexicon ||
      s.showQuests ||
      s.conflict !== null,
  )
  const items = useGame((s) => s.state.inventory.items)
  const colliders = useMemo(() => roomColliders(items), [items])

  const root = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const pos = useRef({ x: SPAWN.x, z: SPAWN.z })
  const yaw = useRef(SPAWN.yaw)
  const targetYaw = useRef(SPAWN.yaw)
  const speed = useRef(0)
  const phase = useRef(0)

  useEffect(() => initPlayerInput(), [])

  useFrame((_, delta) => {
    const g = root.current
    if (!g) return
    const dt = Math.min(delta, 0.1)

    readMoveInput(input)
    if (uiOpen) {
      input.x = 0
      input.y = 0
    }
    const throttle = Math.min(1, Math.hypot(input.x, input.y))

    if (throttle > 0.001) {
      camera.getWorldDirection(forward)
      forward.y = 0
      if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1)
      forward.normalize()
      right.crossVectors(forward, UP)
      moveDir.copy(right).multiplyScalar(input.x).addScaledVector(forward, input.y)
      const step = stepPlayer(
        pos.current,
        { x: moveDir.x * PLAYER_SPEED * dt, z: moveDir.z * PLAYER_SPEED * dt },
        colliders,
      )
      pos.current.x = step.x
      pos.current.z = step.z
      targetYaw.current = Math.atan2(moveDir.x, moveDir.z)
    }

    // Ease the visible speed and turn with a shortest-arc lerp — chunky but smooth.
    speed.current += (throttle - speed.current) * Math.min(1, dt * 10)
    const turn = Math.atan2(
      Math.sin(targetYaw.current - yaw.current),
      Math.cos(targetYaw.current - yaw.current),
    )
    yaw.current += turn * Math.min(1, dt * 12)

    // Walk cycle: legs and arms swing opposite, with a tiny bounce in the step.
    const s = speed.current
    phase.current += dt * (2 + 11 * s) * (s > 0.02 ? 1 : 0)
    const swing = Math.sin(phase.current) * 0.62 * s
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armL.current) armL.current.rotation.x = -swing * 0.75
    if (armR.current) armR.current.rotation.x = swing * 0.75
    const bounce = Math.abs(Math.sin(phase.current)) * 0.035 * s
    g.position.set(pos.current.x, FLOOR_Y + bounce, pos.current.z)
    g.rotation.y = yaw.current

    // The camera tags along: shift target and camera by the same eased delta,
    // so the player's chosen orbit angle and zoom are preserved while walking.
    if (controls) {
      camTarget.set(pos.current.x, FLOOR_Y + HEAD_HEIGHT, pos.current.z)
      camShift
        .copy(camTarget)
        .sub(controls.target)
        .multiplyScalar(Math.min(1, dt * 8))
      controls.target.add(camShift)
      camera.position.add(camShift)
      controls.update()
    }
  })

  return (
    <group ref={root} position={[SPAWN.x, FLOOR_Y, SPAWN.z]} rotation-y={SPAWN.yaw}>
      {/* soft blob shadow to ground the figure */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 0]}>
        <circleGeometry args={[0.19, 12]} />
        <meshBasicMaterial color="#3a2d21" transparent opacity={0.16} />
      </mesh>

      {/* legs (pivot at the hip) */}
      <group ref={legL} position={[-0.062, 0.3, 0]}>
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.095, 0.3, 0.11]} />
          <meshStandardMaterial color={PANTS} />
        </mesh>
        <mesh position={[0, -0.27, 0.025]}>
          <boxGeometry args={[0.1, 0.06, 0.16]} />
          <meshStandardMaterial color={SHOE} />
        </mesh>
      </group>
      <group ref={legR} position={[0.062, 0.3, 0]}>
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.095, 0.3, 0.11]} />
          <meshStandardMaterial color={PANTS} />
        </mesh>
        <mesh position={[0, -0.27, 0.025]}>
          <boxGeometry args={[0.1, 0.06, 0.16]} />
          <meshStandardMaterial color={SHOE} />
        </mesh>
      </group>

      {/* torso with a little flytrap badge */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.26, 0.3, 0.15]} />
        <meshStandardMaterial color={SHIRT} />
      </mesh>
      <mesh position={[0.055, 0.49, 0.078]}>
        <boxGeometry args={[0.07, 0.06, 0.012]} />
        <meshStandardMaterial color={palette.trap} />
      </mesh>

      {/* arms (pivot at the shoulder): short sleeves, bare forearms */}
      <group ref={armL} position={[-0.168, 0.575, 0]} rotation-z={0.08}>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.078, 0.11, 0.098]} />
          <meshStandardMaterial color={SHIRT} />
        </mesh>
        <mesh position={[0, -0.175, 0]}>
          <boxGeometry args={[0.06, 0.16, 0.075]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      </group>
      <group ref={armR} position={[0.168, 0.575, 0]} rotation-z={-0.08}>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.078, 0.11, 0.098]} />
          <meshStandardMaterial color={SHIRT} />
        </mesh>
        <mesh position={[0, -0.175, 0]}>
          <boxGeometry args={[0.06, 0.16, 0.075]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      </group>

      {/* head: face forward (+z), hair in the back, green keeper's cap on top */}
      <group position={[0, 0.7, 0]}>
        <mesh>
          <boxGeometry args={[0.21, 0.2, 0.19]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        <mesh position={[-0.05, 0.012, 0.096]}>
          <boxGeometry args={[0.03, 0.042, 0.012]} />
          <meshStandardMaterial color="#3c2f24" />
        </mesh>
        <mesh position={[0.05, 0.012, 0.096]}>
          <boxGeometry args={[0.03, 0.042, 0.012]} />
          <meshStandardMaterial color="#3c2f24" />
        </mesh>
        <mesh position={[0, 0.02, -0.05]}>
          <boxGeometry args={[0.22, 0.18, 0.11]} />
          <meshStandardMaterial color={HAIR} />
        </mesh>
        <mesh position={[0, 0.115, 0]}>
          <boxGeometry args={[0.23, 0.07, 0.21]} />
          <meshStandardMaterial color={palette.trap} />
        </mesh>
        <mesh position={[0, 0.1, 0.13]}>
          <boxGeometry args={[0.19, 0.03, 0.1]} />
          <meshStandardMaterial color={palette.trap} />
        </mesh>
      </group>
    </group>
  )
}
