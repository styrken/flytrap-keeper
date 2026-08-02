// The drivhus: a little glass house in the garden. The potting bench shares
// the windowsill's dimensions and slot positions, so pots, insects and
// interactions work identically in both rooms — only the scenery changes.
// Glass is plain transparency (no dollhouse trick needed: see-through is the
// whole point of a greenhouse).
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group, InstancedMesh, Mesh, MeshStandardMaterial } from 'three'
import { BackSide, Color, DoubleSide, Object3D } from 'three'
import { currentWeather } from '../sim'
import { sceneNow, useSceneState } from '../sceneView'
import { daylightFactor } from './daylight'
import { palette } from './palette'
import { GoldenDrop } from './WeatherSky'

const FRAME = '#e8e2d2'
const FRAME_DARK = '#cfc7b2'
const BRICK = '#b07a5c'
const BENCH_WOOD = '#9a7b52'
const BENCH_LEG = '#7d6242'
const GLASS = '#d8ecef'

function GlassPane({
  position,
  rotation,
  size,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  size: [number, number]
}) {
  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial color={GLASS} transparent opacity={0.16} side={DoubleSide} />
    </mesh>
  )
}

export function Greenhouse() {
  return (
    <group>
      {/* lawn around the greenhouse, and a warmer gravel floor inside */}
      <mesh position={[0, -0.94, 1.2]}>
        <boxGeometry args={[11, 0.1, 8.5]} />
        <meshStandardMaterial color="#7da75a" />
      </mesh>
      <mesh position={[0, -0.888, 1.05]}>
        <boxGeometry args={[7.2, 0.02, 4.4]} />
        <meshStandardMaterial color="#cbb490" />
      </mesh>

      {/* knee-high brick base walls */}
      <mesh position={[0, -0.64, -1.14]}>
        <boxGeometry args={[7.3, 0.5, 0.14]} />
        <meshStandardMaterial color={BRICK} />
      </mesh>
      {[-3.58, 3.58].map((x) => (
        <mesh key={x} position={[x, -0.64, 1.05]}>
          <boxGeometry args={[0.14, 0.5, 4.5]} />
          <meshStandardMaterial color={BRICK} />
        </mesh>
      ))}
      {/* front base leaves a doorway gap */}
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, -0.64, 3.24]}>
          <boxGeometry args={[2.9, 0.5, 0.14]} />
          <meshStandardMaterial color={BRICK} />
        </mesh>
      ))}

      {/* glass walls above the base */}
      <GlassPane position={[0, 0.71, -1.13]} size={[7.1, 2.2]} />
      <GlassPane position={[-3.57, 0.71, 1.05]} rotation={[0, Math.PI / 2, 0]} size={[4.4, 2.2]} />
      <GlassPane position={[3.57, 0.71, 1.05]} rotation={[0, -Math.PI / 2, 0]} size={[4.4, 2.2]} />
      <GlassPane position={[-2.2, 0.71, 3.23]} size={[2.8, 2.2]} />
      <GlassPane position={[2.2, 0.71, 3.23]} size={[2.8, 2.2]} />

      {/* corner and door posts */}
      {(
        [
          [-3.58, -1.14],
          [3.58, -1.14],
          [-3.58, 3.24],
          [3.58, 3.24],
          [-0.75, 3.24],
          [0.75, 3.24],
        ] as const
      ).map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, 0.46, z]}>
          <boxGeometry args={[0.12, 2.7, 0.12]} />
          <meshStandardMaterial color={FRAME} />
        </mesh>
      ))}
      {/* eaves beams */}
      <mesh position={[0, 1.82, -1.14]}>
        <boxGeometry args={[7.3, 0.12, 0.12]} />
        <meshStandardMaterial color={FRAME} />
      </mesh>
      <mesh position={[0, 1.82, 3.24]}>
        <boxGeometry args={[7.3, 0.12, 0.12]} />
        <meshStandardMaterial color={FRAME} />
      </mesh>
      {[-3.58, 3.58].map((x) => (
        <mesh key={x} position={[x, 1.82, 1.05]}>
          <boxGeometry args={[0.12, 0.12, 4.5]} />
          <meshStandardMaterial color={FRAME} />
        </mesh>
      ))}

      {/* gable roof: ridge, rafters and two big glass slopes */}
      <mesh position={[0, 2.62, 1.05]}>
        <boxGeometry args={[7.4, 0.14, 0.14]} />
        <meshStandardMaterial color={FRAME_DARK} />
      </mesh>
      {[-3.55, -1.8, 0, 1.8, 3.55].map((x) => (
        <group key={x} position={[x, 0, 1.05]}>
          <mesh position={[0, 2.24, -1.1]} rotation-x={-0.35}>
            <boxGeometry args={[0.09, 0.09, 2.35]} />
            <meshStandardMaterial color={FRAME_DARK} />
          </mesh>
          <mesh position={[0, 2.24, 1.1]} rotation-x={0.35}>
            <boxGeometry args={[0.09, 0.09, 2.35]} />
            <meshStandardMaterial color={FRAME_DARK} />
          </mesh>
        </group>
      ))}
      <GlassPane
        position={[0, 2.22, -0.05]}
        rotation={[-0.35 + Math.PI / 2, 0, 0]}
        size={[7.1, 2.3]}
      />
      <GlassPane
        position={[0, 2.22, 2.15]}
        rotation={[0.35 - Math.PI / 2, Math.PI, 0]}
        size={[7.1, 2.3]}
      />

      {/* the potting bench — same top as the windowsill, so slots line up */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.2, 0.12, 1.1]} />
        <meshStandardMaterial color={BENCH_WOOD} />
      </mesh>
      {(
        [
          [-1.45, 0.4],
          [1.45, 0.4],
          [-1.45, -0.35],
          [1.45, -0.35],
        ] as const
      ).map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, -0.48, z]}>
          <boxGeometry args={[0.12, 0.85, 0.12]} />
          <meshStandardMaterial color={BENCH_LEG} />
        </mesh>
      ))}
      <mesh position={[0, -0.38, 0]}>
        <boxGeometry args={[3.0, 0.06, 0.9]} />
        <meshStandardMaterial color={BENCH_LEG} />
      </mesh>

      {/* clutter on the lower shelf: spare pots and a soil bag */}
      <group position={[-1.05, -0.35, 0.1]}>
        {[0, 0.09, 0.18].map((y) => (
          <mesh key={y} position={[0, y + 0.06, 0]}>
            <cylinderGeometry args={[0.12 - y * 0.12, 0.09 - y * 0.12, 0.12, 8]} />
            <meshStandardMaterial color={palette.potRim} flatShading />
          </mesh>
        ))}
      </group>
      <mesh position={[0.95, -0.24, 0.05]} rotation-z={0.12}>
        <boxGeometry args={[0.34, 0.22, 0.24]} />
        <meshStandardMaterial color="#8a6a48" />
      </mesh>

      {/* tomato planter in the back corner — every drivhus needs one */}
      <group position={[-2.7, -0.884, -0.55]}>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.9, 0.28, 0.5]} />
          <meshStandardMaterial color="#7d6242" />
        </mesh>
        {[-0.25, 0.22].map((x) => (
          <group key={x} position={[x, 0.28, 0]}>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[0.05, 0.6, 0.05]} />
              <meshStandardMaterial color={palette.stem} />
            </mesh>
            <mesh position={[0.08, 0.42, 0.04]}>
              <boxGeometry args={[0.16, 0.14, 0.14]} />
              <meshStandardMaterial color="#5a8f42" />
            </mesh>
            <mesh position={[-0.09, 0.24, 0.05]}>
              <boxGeometry args={[0.14, 0.16, 0.13]} />
              <meshStandardMaterial color="#5a8f42" />
            </mesh>
            <mesh position={[0.07, 0.18, 0.09]}>
              <boxGeometry args={[0.07, 0.07, 0.07]} />
              <meshStandardMaterial color="#cb4a4a" />
            </mesh>
            <mesh position={[-0.06, 0.5, 0.08]}>
              <boxGeometry args={[0.06, 0.06, 0.06]} />
              <meshStandardMaterial color="#e2574c" />
            </mesh>
          </group>
        ))}
      </group>

      {/* stepping stones out the door */}
      {(
        [
          [0, 3.6],
          [0.25, 4.2],
        ] as const
      ).map(([x, z]) => (
        <mesh key={z} position={[x, -0.885, z]}>
          <cylinderGeometry args={[0.28, 0.28, 0.03, 7]} />
          <meshStandardMaterial color="#b9b0a0" flatShading />
        </mesh>
      ))}

      <GreenhouseWeather />
    </group>
  )
}

const SKY_BASE = { sun: palette.sky, clouds: palette.skyDim, rain: '#87a0b4' } as const
const NIGHT_SKY = new Color('#28324f')
const RAIN_DROPS = 160
const RAIN_TOP = 3.4

/** The sky drum is centered on the greenhouse lawn — dress it in cylinder
 * coordinates: azimuth 0° faces north, +90° east, ±180° south. */
const SKY_CENTER_Z = 1.2
const onSky = (azDeg: number, y: number, r: number): [number, number, number] => {
  const az = (azDeg * Math.PI) / 180
  return [Math.sin(az) * r, y, SKY_CENTER_Z - Math.cos(az) * r]
}
const faceCenter = (azDeg: number) => (-azDeg * Math.PI) / 180

/** Cloud banks all the way round the drum — [azimuth°, y, scale]. */
const CLOUD_BANKS: [number, number, number][] = [
  [-24, 5.4, 1],
  [78, 5.8, 0.8],
  [152, 5.1, 1.05],
  [-104, 6.0, 0.85],
]

/** A raindrop spot on the lawn around the glass house — never inside it. */
const rainSpot = (): { x: number; z: number } => {
  for (;;) {
    const x = -5.3 + Math.random() * 10.6
    const z = -2.9 + Math.random() * 8.2
    if (Math.abs(x) >= 3.85 || z <= -1.45 || z >= 3.55) return { x, z }
  }
}

/** Sky drum, sun/clouds around it, and rain on the lawn outside the glass. */
function GreenhouseWeather() {
  const weather = useSceneState((s) => currentWeather(s, s.lastTickAt))
  const skyMat = useRef<MeshStandardMaterial>(null)
  const sun = useRef<Mesh>(null)
  const clouds = useRef<Group>(null)
  const rain = useRef<InstancedMesh>(null)
  const drops = useRef<{ x: number; y: number; z: number; speed: number }[] | null>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const targetSky = useMemo(() => new Color(), [])
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useFrame((_, delta) => {
    const daylight = daylightFactor(sceneNow())
    const ease = Math.min(1, delta * 2)
    if (skyMat.current) {
      targetSky.set(SKY_BASE[weather]).lerp(NIGHT_SKY, 1 - daylight)
      skyMat.current.color.lerp(targetSky, ease)
    }
    if (sun.current) sun.current.visible = weather === 'sun' && daylight > 0.5
    if (clouds.current) clouds.current.visible = weather !== 'sun'

    const rainMesh = rain.current
    if (rainMesh) {
      const active = weather === 'rain' && !reduceMotion
      rainMesh.visible = active
      if (active) {
        drops.current ??= Array.from({ length: RAIN_DROPS }, () => ({
          ...rainSpot(),
          y: Math.random() * RAIN_TOP,
          speed: 1.8 + Math.random() * 1.0,
        }))
        for (let i = 0; i < RAIN_DROPS; i++) {
          const drop = drops.current[i]
          drop.y -= drop.speed * delta
          if (drop.y < -0.85) drop.y = RAIN_TOP
          dummy.position.set(drop.x, drop.y, drop.z)
          dummy.updateMatrix()
          rainMesh.setMatrixAt(i, dummy.matrix)
        }
        rainMesh.instanceMatrix.needsUpdate = true
      }
    }
  })

  return (
    <group>
      {/* the sky: a drum around the glass house — weather in every direction,
          same wrap-around fix as the garden's sky */}
      <mesh position={[0, 0.5, SKY_CENTER_Z]}>
        <cylinderGeometry args={[15.5, 15.5, 15, 14, 1, true]} />
        <meshStandardMaterial ref={skyMat} color={palette.sky} side={BackSide} />
      </mesh>
      {/* the sun keeps to its side of the sky — there's only one of it */}
      <mesh ref={sun} position={onSky(-40, 6.0, 13.8)} rotation={[0, faceCenter(-40), 0.5]}>
        <boxGeometry args={[1.1, 1.1, 0.1]} />
        <meshStandardMaterial color={palette.sun} />
      </mesh>
      {/* cloud banks hang all around the drum, not just past the back wall */}
      <group ref={clouds}>
        {CLOUD_BANKS.map(([az, y, s]) => (
          <group key={az} position={onSky(az, y, 13.5)} rotation-y={faceCenter(az)} scale={s}>
            <mesh>
              <boxGeometry args={[2.2, 0.6, 0.12]} />
              <meshStandardMaterial color="#f2f4f0" />
            </mesh>
            <mesh position={[-1.8, 0.65, 0]}>
              <boxGeometry args={[1.6, 0.5, 0.12]} />
              <meshStandardMaterial color="#f2f4f0" />
            </mesh>
            <mesh position={[2.1, -0.45, 0]}>
              <boxGeometry args={[1.4, 0.5, 0.12]} />
              <meshStandardMaterial color="#f2f4f0" />
            </mesh>
          </group>
        ))}
      </group>
      <instancedMesh ref={rain} args={[undefined, undefined, RAIN_DROPS]} visible={false}>
        <boxGeometry args={[0.014, 0.11, 0.014]} />
        <meshStandardMaterial color="#7fa8c9" transparent opacity={0.6} />
      </instancedMesh>
      {/* the roof vent stands open — golden drops sneak in when it rains */}
      <GoldenDrop area={{ x0: -1.0, x1: 1.0, z: 0.7, yTop: 2.3, yBottom: 0.2 }} />
    </group>
  )
}
