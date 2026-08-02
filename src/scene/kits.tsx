// Blocky, procedurally assembled plant kits — one per species. Growth is just
// "more/larger modules", wilting is a droop pose with duller colors.
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { playSnap, playTease } from '../audio'
import { type PlantState, type TrapState, isTrapReady } from '../sim'
import { gameNow, useGame } from '../store'
import { insectBus } from './insectBus'
import { palette } from './palette'
import { STAGE_SCALE, STEM_LAYOUT } from './plantLayout'

export function PlantKit({ plant }: { plant: PlantState }) {
  const sway = useRef<Group>(null)
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useFrame((frame, delta) => {
    const g = sway.current
    if (!g) return
    const droopTarget = plant.wilted || plant.dead ? 0.4 : plant.dormant ? 0.2 : 0
    g.rotation.x += (droopTarget - g.rotation.x) * Math.min(1, delta * 2)
    if (!reduceMotion && !plant.dormant && !plant.dead) {
      g.rotation.z = Math.sin(frame.clock.elapsedTime * 0.8) * 0.025
    }
  })

  const scale = STAGE_SCALE[Math.min(plant.stage, STAGE_SCALE.length - 1)]
  return (
    <group scale={scale}>
      <group ref={sway}>
        {plant.speciesId === 'dionaea' && <DionaeaKit plant={plant} />}
        {plant.speciesId === 'drosera' && <DroseraKit plant={plant} />}
        {plant.speciesId === 'nepenthes' && <NepenthesKit plant={plant} />}
        {plant.speciesId === 'sarracenia' && <SarraceniaKit plant={plant} />}
      </group>
    </group>
  )
}

const kitColors = (plant: PlantState) => {
  const dull = plant.wilted || plant.dead
  return {
    stem: plant.dead ? '#8a7355' : dull ? palette.stemWilted : palette.stem,
    leaf: plant.dead ? '#96825f' : dull ? '#87a05f' : '#7fae4f',
    accent: plant.dead ? '#7a6248' : '#d4506e',
  }
}

/* ---------------------------------- flytrap ---------------------------------- */

function DionaeaKit({ plant }: { plant: PlantState }) {
  const colors = kitColors(plant)
  return (
    <group>
      {plant.traps.map((trap, i) => {
        const stem = STEM_LAYOUT[i % STEM_LAYOUT.length]
        const stemHeight = 0.34 * stem.len
        return (
          <group key={trap.id} rotation-y={stem.azimuth}>
            <group rotation-z={stem.tilt}>
              <mesh position={[0, stemHeight / 2, 0]}>
                <boxGeometry args={[0.045, stemHeight, 0.045]} />
                <meshStandardMaterial color={colors.stem} />
              </mesh>
              <Trap trap={trap} index={i} plant={plant} position={[0, stemHeight + 0.02, 0]} />
            </group>
          </group>
        )
      })}
      {plant.flowering && <FlowerStalk blooming={plant.flowering.blooming} />}
    </group>
  )
}

function FlowerStalk({ blooming }: { blooming: boolean }) {
  return (
    <group position={[0, 0, -0.05]}>
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[0.035, 0.68, 0.035]} />
        <meshStandardMaterial color="#5a9b3f" />
      </mesh>
      {blooming ? (
        <group position={[0, 0.72, 0]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation-y={(i * Math.PI) / 2} position={[0, 0, 0]}>
              <boxGeometry args={[0.16, 0.05, 0.07]} />
              <meshStandardMaterial color="#f6f1e6" />
            </mesh>
          ))}
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.06, 0.06, 0.06]} />
            <meshStandardMaterial color={palette.sun} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, 0.71, 0]}>
          <boxGeometry args={[0.07, 0.09, 0.07]} />
          <meshStandardMaterial color="#a8c86a" />
        </mesh>
      )}
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
  plant,
  position,
}: {
  trap: TrapState
  index: number
  plant: PlantState
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
  const interactive = !plant.wilted && !plant.dormant && !plant.dead

  useFrame((frame, delta) => {
    const g = upper.current
    if (!g) return
    const t = frame.clock.elapsedTime

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

  const trapColor = withered
    ? palette.trapWithered
    : plant.wilted || plant.dead
      ? palette.trapWilted
      : palette.trap
  const mouthColor = withered ? palette.mouthWithered : palette.mouth

  return (
    <group
      ref={root}
      position={position}
      rotation-z={withered ? 0.5 : 0}
      onPointerDown={(e) => {
        if (!interactive || !isTrapReady(trap, gameNow())) return
        e.stopPropagation()
        const presence = insectBus.presence
        if (presence && presence.plantId === plant.id && presence.trapIndex === index) {
          dispatch({
            type: 'catchInsect',
            plantId: plant.id,
            trapId: trap.id,
            insect: presence.kind,
          })
          insectBus.onCaught?.()
          playSnap()
        } else {
          teaseRequest.current = true
          playTease()
        }
      }}
      onPointerOver={() => {
        if (interactive && isTrapReady(trap, gameNow())) document.body.style.cursor = 'pointer'
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

/* ---------------------------------- sundew ---------------------------------- */

function DroseraKit({ plant }: { plant: PlantState }) {
  const colors = kitColors(plant)
  const count = plant.traps.length
  return (
    <group>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.1, 0.06, 0.1]} />
        <meshStandardMaterial color={colors.stem} />
      </mesh>
      {plant.traps.map((trap, i) => (
        <group key={trap.id} rotation-y={(i * Math.PI * 2) / count}>
          <group rotation-z={0.95} position={[0, 0.05, 0]}>
            <mesh position={[0, 0.14, 0]}>
              <boxGeometry args={[0.055, 0.26, 0.03]} />
              <meshStandardMaterial color={colors.leaf} />
            </mesh>
            {[0.08, 0.15, 0.22].map((y) => (
              <mesh key={y} position={[0, y, 0.025]}>
                <boxGeometry args={[0.02, 0.02, 0.02]} />
                <meshStandardMaterial color={colors.accent} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------ tropical pitcher ------------------------------ */

function NepenthesKit({ plant }: { plant: PlantState }) {
  const colors = kitColors(plant)
  const count = plant.traps.length
  return (
    <group>
      {plant.traps.map((trap, i) => {
        const azimuth = (i * Math.PI * 2) / Math.max(3, count) + 0.5
        return (
          <group key={trap.id} rotation-y={azimuth}>
            <group rotation-z={0.35}>
              <mesh position={[0, 0.17, 0]}>
                <boxGeometry args={[0.04, 0.34, 0.04]} />
                <meshStandardMaterial color={colors.stem} />
              </mesh>
              {/* hanging pitcher */}
              <group position={[0, 0.34, 0]} rotation-z={-0.35}>
                <mesh position={[0, -0.07, 0.06]}>
                  <cylinderGeometry args={[0.055, 0.07, 0.17, 8]} />
                  <meshStandardMaterial color={colors.leaf} flatShading />
                </mesh>
                <mesh position={[0, 0.015, 0.06]}>
                  <cylinderGeometry args={[0.065, 0.065, 0.02, 8]} />
                  <meshStandardMaterial color={colors.accent} flatShading />
                </mesh>
                <mesh position={[0, 0.05, 0.02]} rotation-x={0.6}>
                  <boxGeometry args={[0.09, 0.015, 0.09]} />
                  <meshStandardMaterial color={colors.leaf} />
                </mesh>
              </group>
            </group>
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------ trumpet pitcher ------------------------------ */

function SarraceniaKit({ plant }: { plant: PlantState }) {
  const colors = kitColors(plant)
  const count = plant.traps.length
  return (
    <group>
      {plant.traps.map((trap, i) => {
        const azimuth = (i * Math.PI * 2) / Math.max(3, count) + 1.1
        const height = 0.34 + (i % 3) * 0.06
        return (
          <group key={trap.id} rotation-y={azimuth}>
            <group rotation-z={0.16}>
              <mesh position={[0, height / 2, 0]}>
                <cylinderGeometry args={[0.05, 0.022, height, 8]} />
                <meshStandardMaterial color={colors.leaf} flatShading />
              </mesh>
              <mesh position={[0, height, 0]}>
                <cylinderGeometry args={[0.055, 0.055, 0.02, 8]} />
                <meshStandardMaterial color={colors.accent} flatShading />
              </mesh>
              <mesh position={[0, height + 0.045, -0.03]} rotation-x={-0.7}>
                <boxGeometry args={[0.1, 0.015, 0.1]} />
                <meshStandardMaterial color={colors.leaf} />
              </mesh>
            </group>
          </group>
        )
      })}
    </group>
  )
}
