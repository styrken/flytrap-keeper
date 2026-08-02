import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { playSnap, playTease } from '../audio'
import { type TrapState, activePlant, isTrapReady } from '../sim'
import { useGame } from '../store'
import { insectBus } from './insectBus'
import { palette } from './palette'
import { STAGE_SCALE, STEM_LAYOUT } from './plantLayout'

export function FlytrapPlant({ position }: { position: [number, number, number] }) {
  const plant = useGame((s) => activePlant(s.state))
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
                  index={i}
                  wilted={plant.wilted}
                  position={[0, stemHeight + 0.02, 0]}
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
const TRAP_TEASE = -0.45
const TOOTH_COLOR = '#e8f0d8'

function Trap({
  trap,
  index,
  wilted,
  position,
}: {
  trap: TrapState
  index: number
  wilted: boolean
  position: [number, number, number]
}) {
  const dispatch = useGame((s) => s.dispatch)
  const root = useRef<Group>(null)
  const upper = useRef<Group>(null)
  const teaseRequest = useRef(false)
  const teaseUntil = useRef(-1)
  const popStart = useRef(-1)
  const prevDigesting = useRef(trap.digestingUntil !== null)

  const withered = trap.witheredAt !== null
  const closed = trap.digestingUntil !== null || withered

  useFrame((frame, delta) => {
    const g = upper.current
    if (!g) return
    const t = frame.clock.elapsedTime

    // A fresh digestion (from any source: 3D tap, HUD button, insect) pops the trap.
    const digestingNow = trap.digestingUntil !== null
    if (digestingNow && !prevDigesting.current) popStart.current = t
    prevDigesting.current = digestingNow

    if (teaseRequest.current) {
      teaseRequest.current = false
      if (!closed) teaseUntil.current = t + 0.25
    }

    const teasing = !closed && t < teaseUntil.current
    const target = closed ? TRAP_CLOSED : teasing ? TRAP_TEASE : TRAP_OPEN
    const speed = closed || teasing ? 16 : 3
    g.rotation.x += (target - g.rotation.x) * Math.min(1, delta * speed)

    if (root.current) {
      const sincePop = t - popStart.current
      const pop =
        popStart.current >= 0 && sincePop < 0.35 ? Math.sin((sincePop / 0.35) * Math.PI) : 0
      root.current.scale.setScalar(1 + pop * 0.18)
    }
  })

  const trapColor = withered ? palette.trapWithered : wilted ? palette.trapWilted : palette.trap
  const mouthColor = withered ? palette.mouthWithered : palette.mouth

  return (
    <group
      ref={root}
      position={position}
      rotation-z={withered ? 0.5 : 0}
      onPointerDown={(e) => {
        if (wilted || !isTrapReady(trap, Date.now())) return
        e.stopPropagation()
        const presence = insectBus.presence
        if (presence && presence.nearTrapIndex === index) {
          dispatch({ type: 'catchInsect', trapId: trap.id, insect: presence.kind })
          insectBus.onCaught?.(index)
          playSnap()
        } else {
          // Empty snap: a playful half-close that costs nothing.
          teaseRequest.current = true
          playTease()
        }
      }}
      onPointerOver={() => {
        if (!wilted && isTrapReady(trap, Date.now())) document.body.style.cursor = 'pointer'
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
      {[-0.06, 0.02, 0.08].map((x) => (
        <mesh key={`lo${x}`} position={[x, 0.075, 0.2]}>
          <boxGeometry args={[0.025, 0.04, 0.025]} />
          <meshStandardMaterial color={TOOTH_COLOR} />
        </mesh>
      ))}
      <group ref={upper} position={[0, 0.06, -0.03]} rotation-x={TRAP_OPEN}>
        <mesh position={[0, 0.03, 0.12]}>
          <boxGeometry args={[0.26, 0.06, 0.24]} />
          <meshStandardMaterial color={trapColor} />
        </mesh>
        {[-0.08, 0, 0.08].map((x) => (
          <mesh key={`up${x}`} position={[x, 0.015, 0.235]}>
            <boxGeometry args={[0.025, 0.045, 0.025]} />
            <meshStandardMaterial color={TOOTH_COLOR} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
