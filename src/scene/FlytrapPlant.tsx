import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { type TrapState, activePlant, isTrapReady } from '../sim'
import { useGame } from '../store'
import { palette } from './palette'

const STAGE_SCALE = [0.55, 0.75, 1, 1.15]

/** Rosette slots for up to 5 traps: azimuth around the pot, outward tilt, stem length. */
const STEM_LAYOUT = [
  { azimuth: 0.4, tilt: 0.12, len: 1 },
  { azimuth: 2.5, tilt: 0.5, len: 0.85 },
  { azimuth: 4.5, tilt: 0.48, len: 0.9 },
  { azimuth: 1.5, tilt: 0.62, len: 0.75 },
  { azimuth: 5.6, tilt: 0.6, len: 0.8 },
]

export function FlytrapPlant({ position }: { position: [number, number, number] }) {
  const plant = useGame((s) => activePlant(s.state))
  const dispatch = useGame((s) => s.dispatch)
  const sway = useRef<Group>(null)
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useFrame((frame, delta) => {
    const g = sway.current
    if (!g) return
    const droopTarget = plant?.wilted ? 0.4 : 0
    g.rotation.x += (droopTarget - g.rotation.x) * Math.min(1, delta * 2)
    if (!reduceMotion) g.rotation.z = Math.sin(frame.clock.elapsedTime * 0.8) * 0.025
  })

  if (!plant) return null
  const scale = STAGE_SCALE[Math.min(plant.stage, STAGE_SCALE.length - 1)]
  const stemColor = plant.wilted ? palette.stemWilted : palette.stem

  return (
    <group position={position} scale={scale}>
      <group ref={sway}>
        {plant.traps.map((trap, i) => {
          const slot = STEM_LAYOUT[i % STEM_LAYOUT.length]
          const stemHeight = 0.34 * slot.len
          return (
            <group key={trap.id} rotation-y={slot.azimuth}>
              <group rotation-z={slot.tilt}>
                <mesh position={[0, stemHeight / 2, 0]}>
                  <boxGeometry args={[0.045, stemHeight, 0.045]} />
                  <meshStandardMaterial color={stemColor} />
                </mesh>
                <Trap
                  trap={trap}
                  wilted={plant.wilted}
                  position={[0, stemHeight + 0.02, 0]}
                  onFeed={() => dispatch({ type: 'feedTrap', trapId: trap.id })}
                />
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}

const TRAP_OPEN = -0.85
const TRAP_CLOSED = -0.06

function Trap({
  trap,
  wilted,
  position,
  onFeed,
}: {
  trap: TrapState
  wilted: boolean
  position: [number, number, number]
  onFeed: () => void
}) {
  const upper = useRef<Group>(null)
  const withered = trap.witheredAt !== null
  const closed = trap.digestingUntil !== null || withered

  useFrame((_, delta) => {
    const g = upper.current
    if (!g) return
    const target = closed ? TRAP_CLOSED : TRAP_OPEN
    const speed = closed ? 16 : 3
    g.rotation.x += (target - g.rotation.x) * Math.min(1, delta * speed)
  })

  const trapColor = withered ? palette.trapWithered : wilted ? palette.trapWilted : palette.trap
  const mouthColor = withered ? palette.mouthWithered : palette.mouth

  return (
    <group
      position={position}
      rotation-z={withered ? 0.5 : 0}
      onPointerDown={(e) => {
        if (!isTrapReady(trap, Date.now())) return
        e.stopPropagation()
        onFeed()
      }}
      onPointerOver={() => {
        if (isTrapReady(trap, Date.now())) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh position={[0, 0.028, 0.09]}>
        <boxGeometry args={[0.26, 0.056, 0.24]} />
        <meshStandardMaterial color={trapColor} />
      </mesh>
      <mesh position={[0, 0.058, 0.09]}>
        <boxGeometry args={[0.2, 0.014, 0.18]} />
        <meshStandardMaterial color={mouthColor} />
      </mesh>
      <group ref={upper} position={[0, 0.06, -0.03]} rotation-x={TRAP_OPEN}>
        <mesh position={[0, 0.03, 0.12]}>
          <boxGeometry args={[0.26, 0.06, 0.24]} />
          <meshStandardMaterial color={trapColor} />
        </mesh>
      </group>
    </group>
  )
}
