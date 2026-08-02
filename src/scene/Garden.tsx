// The garden: the outdoors around the keeper's house. The facade with the
// front door and the big window runs along the north edge (hidden by
// <DollhouseWall> while the camera orbits behind it, same trick as the
// bedroom's window wall), a picket fence with a gate rings the lawn, and the
// greenhouse stands in the north-east corner once it is owned. Doors are
// real: their mats live in playerMovement.ts, so the keeper walks between
// rooms instead of teleporting. Weather happens to you out here — rain falls
// on the lawn.
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group, InstancedMesh, Mesh, MeshStandardMaterial } from 'three'
import { BackSide, Color, DoubleSide, Object3D } from 'three'
import { currentWeather } from '../sim'
import { sceneNow, useSceneState } from '../sceneView'
import { daylightFactor } from './daylight'
import { DollhouseWall } from './dollhouse'
import { palette } from './palette'
import { GoldenDrop } from './WeatherSky'

const GRASS = '#7da75a'
const HOUSE_WALL = '#ecd9a8'
const HOUSE_TRIM = '#f6f1e6'
const ROOF = '#c96b52'
const DOOR = '#b25b4a'
const FENCE = '#f3ead6'
const FENCE_POST = '#e0d5ba'
const STONE = '#b9b0a0'
const TRUNK = '#7d6242'
const LEAF = '#5a8f42'
const LEAF_DARK = '#4c7d38'
const BRICK = '#b07a5c'
const GH_FRAME = '#e8e2d2'
const GH_GLASS = '#d8ecef'

export function Garden() {
  const items = useSceneState((s) => s.inventory.items)
  const lastTickAt = useSceneState((s) => s.lastTickAt)
  const dark = daylightFactor(lastTickAt) < 0.6
  return (
    <group>
      {/* the lawn */}
      <mesh position={[0, -0.94, 2.4]}>
        <boxGeometry args={[13.4, 0.1, 9.4]} />
        <meshStandardMaterial color={GRASS} />
      </mesh>

      {/* the facade's front face sits at z ≈ -1.02 — hide the house beyond it */}
      <DollhouseWall z={-1.02}>
        <House dark={dark} />
      </DollhouseWall>
      <FlowerBed />
      <Downspout />
      <Path />
      <Fence />
      <Tree />
      <Bush position={[-5.62, 5.68]} scale={1.15} />
      <Bush position={[5.78, 2.62]} scale={0.85} />
      <Clothesline />
      <Mailbox />
      <LawnTufts />
      <Sunflowers />
      {items.includes('greenhouse') && <GardenGreenhouse />}

      <GardenWeather />
    </group>
  )
}

/** The house facade: butter-yellow render, red roof edge, door and window. */
function House({ dark }: { dark: boolean }) {
  return (
    <group>
      {/* facade wall — front face at z ≈ -1.02 */}
      <mesh position={[-2.325, 1.01, -1.12]}>
        <boxGeometry args={[8.75, 3.9, 0.2]} />
        <meshStandardMaterial color={HOUSE_WALL} />
      </mesh>
      {/* plinth along the ground */}
      <mesh position={[-2.325, -0.79, -1.01]}>
        <boxGeometry args={[8.75, 0.3, 0.06]} />
        <meshStandardMaterial color="#cbb490" />
      </mesh>
      {/* roof edge with a slight overhang, and the tile slope behind it */}
      <mesh position={[-2.325, 2.99, -1.06]}>
        <boxGeometry args={[9.0, 0.18, 0.4]} />
        <meshStandardMaterial color={HOUSE_TRIM} />
      </mesh>
      <mesh position={[-2.325, 3.35, -1.3]} rotation-x={0.5}>
        <boxGeometry args={[9.0, 0.06, 0.9]} />
        <meshStandardMaterial color={ROOF} />
      </mesh>
      {/* chimney */}
      <mesh position={[-4.6, 3.65, -1.35]}>
        <boxGeometry args={[0.5, 0.9, 0.4]} />
        <meshStandardMaterial color={BRICK} />
      </mesh>
      <mesh position={[-4.6, 4.12, -1.35]}>
        <boxGeometry args={[0.6, 0.12, 0.5]} />
        <meshStandardMaterial color="#9a674c" />
      </mesh>

      {/* the front door, with a little canopy and a step */}
      <group position={[0.9, 0, -1.0]}>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.98, 2.06, 0.08]} />
          <meshStandardMaterial color={HOUSE_TRIM} />
        </mesh>
        <mesh position={[0, 0.04, 0.045]}>
          <boxGeometry args={[0.8, 1.9, 0.06]} />
          <meshStandardMaterial color={DOOR} />
        </mesh>
        {/* four door panels */}
        {(
          [
            [-0.19, 0.5],
            [0.19, 0.5],
            [-0.19, -0.42],
            [0.19, -0.42],
          ] as const
        ).map(([x, y]) => (
          <mesh key={`${x}:${y}`} position={[x, y, 0.08]}>
            <boxGeometry args={[0.26, 0.7, 0.02]} />
            <meshStandardMaterial color="#a34f40" />
          </mesh>
        ))}
        <mesh position={[-0.3, 0.06, 0.09]}>
          <boxGeometry args={[0.05, 0.05, 0.04]} />
          <meshStandardMaterial color="#e8c49a" />
        </mesh>
        {/* canopy */}
        <mesh position={[0, 1.22, 0.2]} rotation-x={0.35}>
          <boxGeometry args={[1.2, 0.05, 0.5]} />
          <meshStandardMaterial color={ROOF} />
        </mesh>
        {/* doorstep */}
        <mesh position={[0, -0.905, 0.28]}>
          <boxGeometry args={[1.0, 0.07, 0.5]} />
          <meshStandardMaterial color={STONE} />
        </mesh>
      </group>

      {/* the big window — the room's window, seen from the outside */}
      <group position={[-2.4, 1.0, -1.0]}>
        <mesh>
          <boxGeometry args={[2.1, 1.62, 0.08]} />
          <meshStandardMaterial color={HOUSE_TRIM} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[1.9, 1.42, 0.07]} />
          <meshStandardMaterial
            color="#dcecf2"
            emissive={dark ? '#ffd9a0' : '#bcd8e4'}
            emissiveIntensity={dark ? 0.55 : 0.25}
          />
        </mesh>
        {/* glazing bars */}
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[0.07, 1.42, 0.03]} />
          <meshStandardMaterial color={HOUSE_TRIM} />
        </mesh>
        <mesh position={[0, 0.12, 0.06]}>
          <boxGeometry args={[1.9, 0.06, 0.03]} />
          <meshStandardMaterial color={HOUSE_TRIM} />
        </mesh>
        {/* the curtains, glimpsed from outside */}
        {[-0.78, 0.78].map((x) => (
          <mesh key={x} position={[x, 0, 0.045]}>
            <boxGeometry args={[0.26, 1.4, 0.04]} />
            <meshStandardMaterial color="#cb7a5e" />
          </mesh>
        ))}
        {/* window ledge */}
        <mesh position={[0, -0.87, 0.07]}>
          <boxGeometry args={[2.2, 0.09, 0.18]} />
          <meshStandardMaterial color={HOUSE_TRIM} />
        </mesh>
      </group>
    </group>
  )
}

/** The flower box under the window, stuffed with blocky summer colour. */
function FlowerBed() {
  const flowers: [number, number, string][] = [
    [-3.35, -0.75, '#e2574c'],
    [-3.05, -0.9, '#e8c94a'],
    [-2.75, -0.7, '#c86ba8'],
    [-2.45, -0.88, '#e2574c'],
    [-2.15, -0.72, '#f6f1e6'],
    [-1.85, -0.9, '#e8c94a'],
    [-1.55, -0.74, '#c86ba8'],
  ]
  return (
    <group>
      <mesh position={[-2.4, -0.72, -0.83]}>
        <boxGeometry args={[2.3, 0.34, 0.54]} />
        <meshStandardMaterial color={TRUNK} />
      </mesh>
      {flowers.map(([x, z, color]) => (
        <group key={`${x}:${z}`} position={[x, -0.55, z]}>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.05, 0.3, 0.05]} />
            <meshStandardMaterial color={palette.stem} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.13, 0.12, 0.13]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** The downspout from the gutter into the rain barrel by the door. */
function Downspout() {
  return (
    <group position={[1.85, 0, -0.98]}>
      <mesh position={[0, 1.06, 0]}>
        <boxGeometry args={[0.1, 3.7, 0.1]} />
        <meshStandardMaterial color="#8da3ad" />
      </mesh>
      <mesh position={[0, -0.72, 0.2]} rotation-x={0.9}>
        <boxGeometry args={[0.1, 0.1, 0.45]} />
        <meshStandardMaterial color="#8da3ad" />
      </mesh>
    </group>
  )
}

/** Stepping stones from the front door down to the gate. */
function Path() {
  const stones: [number, number][] = [
    [0.9, -0.25],
    [0.98, 0.55],
    [0.85, 1.35],
    [0.95, 2.15],
    [0.87, 2.95],
    [0.96, 3.75],
    [0.88, 4.55],
    [0.95, 5.35],
    [0.9, 6.05],
  ]
  return (
    <group>
      {stones.map(([x, z]) => (
        <mesh key={z} position={[x, -0.885, z]}>
          <cylinderGeometry args={[0.3, 0.3, 0.03, 7]} />
          <meshStandardMaterial color={STONE} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** One straight run of picket fence between two points on the lawn. */
function FenceRun({ from, to }: { from: [number, number]; to: [number, number] }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const len = Math.hypot(dx, dz)
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]
  const rotY = Math.atan2(-dz, dx)
  const pickets = Math.max(2, Math.round(len / 0.42))
  const posts = Math.max(2, Math.round(len / 1.7) + 1)
  return (
    <group position={mid} rotation-y={rotY}>
      {/* rails */}
      {[-0.5, -0.16].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[len, 0.07, 0.045]} />
          <meshStandardMaterial color={FENCE} />
        </mesh>
      ))}
      {/* pickets with pointed tops */}
      {Array.from({ length: pickets }, (_, i) => {
        const x = -len / 2 + ((i + 0.5) * len) / pickets
        return (
          <group key={i} position={[x, 0, 0.04]}>
            <mesh position={[0, -0.38, 0]}>
              <boxGeometry args={[0.16, 0.96, 0.035]} />
              <meshStandardMaterial color={FENCE} />
            </mesh>
            <mesh position={[0, 0.135, 0]} rotation-z={Math.PI / 4}>
              <boxGeometry args={[0.115, 0.115, 0.035]} />
              <meshStandardMaterial color={FENCE} />
            </mesh>
          </group>
        )
      })}
      {/* posts */}
      {Array.from({ length: posts }, (_, i) => {
        const x = -len / 2 + (i * len) / (posts - 1)
        return (
          <mesh key={`post-${i}`} position={[x, -0.36, -0.04]}>
            <boxGeometry args={[0.12, 1.06, 0.09]} />
            <meshStandardMaterial color={FENCE_POST} />
          </mesh>
        )
      })}
    </group>
  )
}

/** The picket fence around the lawn, with the gate at the end of the path. */
function Fence() {
  return (
    <group>
      {/* south fence, split around the gate */}
      <FenceRun from={[-6.35, 6.6]} to={[0.5, 6.6]} />
      <FenceRun from={[1.3, 6.6]} to={[6.35, 6.6]} />
      {/* west and east */}
      <FenceRun from={[-6.35, -1.06]} to={[-6.35, 6.6]} />
      <FenceRun from={[6.35, -1.06]} to={[6.35, 6.6]} />
      {/* north-east stretch, from the house corner to the east fence */}
      <FenceRun from={[2.05, -1.06]} to={[6.35, -1.06]} />
      <Gate />
    </group>
  )
}

/** The garden gate: taller posts with ball tops and a braced picket panel. */
function Gate() {
  return (
    <group position={[0.9, 0, 6.6]}>
      {[-0.46, 0.46].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <boxGeometry args={[0.14, 1.24, 0.12]} />
            <meshStandardMaterial color={FENCE_POST} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.12, 0.12, 0.12]} />
            <meshStandardMaterial color={FENCE} />
          </mesh>
        </group>
      ))}
      {[-0.52, -0.1].map((y) => (
        <mesh key={y} position={[0, y, 0.01]}>
          <boxGeometry args={[0.78, 0.07, 0.04]} />
          <meshStandardMaterial color={FENCE} />
        </mesh>
      ))}
      {/* diagonal brace */}
      <mesh position={[0, -0.31, 0.015]} rotation-z={0.5}>
        <boxGeometry args={[0.8, 0.06, 0.035]} />
        <meshStandardMaterial color={FENCE} />
      </mesh>
      {[-0.28, 0, 0.28].map((x) => (
        <group key={x} position={[x, 0, 0.045]}>
          <mesh position={[0, -0.34, 0]}>
            <boxGeometry args={[0.15, 0.8, 0.03]} />
            <meshStandardMaterial color={FENCE} />
          </mesh>
          <mesh position={[0, 0.09, 0]} rotation-z={Math.PI / 4}>
            <boxGeometry args={[0.108, 0.108, 0.03]} />
            <meshStandardMaterial color={FENCE} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * The old apple tree in the fence corner. Its canopy floats high (bottom at
 * ~y 2.1) and the trunk hugs the corner, so the follow camera — which trails
 * the keeper at head height — slides under and past it instead of ending up
 * inside the leaves.
 */
function Tree() {
  return (
    <group position={[5.4, 0, 5.9]}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.42, 2.5, 0.42]} />
        <meshStandardMaterial color={TRUNK} />
      </mesh>
      <mesh position={[0.32, 1.35, 0.1]} rotation-z={-0.5}>
        <boxGeometry args={[0.7, 0.22, 0.22]} />
        <meshStandardMaterial color={TRUNK} />
      </mesh>
      <mesh position={[0, 2.75, 0]}>
        <boxGeometry args={[1.9, 1.3, 1.9]} />
        <meshStandardMaterial color={LEAF} />
      </mesh>
      <mesh position={[0.75, 2.35, 0.55]}>
        <boxGeometry args={[1.1, 0.9, 1.0]} />
        <meshStandardMaterial color={LEAF_DARK} />
      </mesh>
      <mesh position={[-0.7, 2.3, -0.4]}>
        <boxGeometry args={[0.9, 0.8, 1.0]} />
        <meshStandardMaterial color={LEAF_DARK} />
      </mesh>
      <mesh position={[-0.4, 3.45, 0.3]}>
        <boxGeometry args={[0.9, 0.5, 0.8]} />
        <meshStandardMaterial color={LEAF} />
      </mesh>
      {/* a few apples */}
      {(
        [
          [0.6, 2.5, 0.95],
          [-0.85, 2.45, 0.25],
          [0.15, 3.0, 0.98],
        ] as const
      ).map(([x, y, z]) => (
        <mesh key={`${x}:${y}`} position={[x, y, z]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshStandardMaterial color="#cb4a4a" />
        </mesh>
      ))}
    </group>
  )
}

function Bush({ position, scale = 1 }: { position: [number, number]; scale?: number }) {
  return (
    <group position={[position[0], -0.89, position[1]]} scale={scale}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.85, 0.55, 0.75]} />
        <meshStandardMaterial color={LEAF_DARK} />
      </mesh>
      <mesh position={[0.25, 0.5, 0.15]}>
        <boxGeometry args={[0.5, 0.35, 0.45]} />
        <meshStandardMaterial color={LEAF} />
      </mesh>
      <mesh position={[-0.28, 0.45, -0.1]}>
        <boxGeometry args={[0.4, 0.3, 0.4]} />
        <meshStandardMaterial color={LEAF} />
      </mesh>
    </group>
  )
}

/** The washing line: two poles, a sagging line, a shirt and a towel. */
function Clothesline() {
  return (
    <group>
      {[-5.3, -3.0].map((x) => (
        <mesh key={x} position={[x, -0.29, 2.3]}>
          <boxGeometry args={[0.09, 1.3, 0.09]} />
          <meshStandardMaterial color="#8a8578" />
        </mesh>
      ))}
      <mesh position={[-4.15, 0.3, 2.3]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 2.3, 4]} />
        <meshStandardMaterial color="#e3ddcf" flatShading />
      </mesh>
      {/* a keeper-blue shirt */}
      <group position={[-4.65, 0.08, 2.3]}>
        <mesh>
          <boxGeometry args={[0.4, 0.42, 0.03]} />
          <meshStandardMaterial color="#5d84ae" side={DoubleSide} />
        </mesh>
        <mesh position={[-0.26, 0.13, 0]}>
          <boxGeometry args={[0.12, 0.16, 0.03]} />
          <meshStandardMaterial color="#5d84ae" />
        </mesh>
        <mesh position={[0.26, 0.13, 0]}>
          <boxGeometry args={[0.12, 0.16, 0.03]} />
          <meshStandardMaterial color="#5d84ae" />
        </mesh>
      </group>
      {/* a sunny towel */}
      <mesh position={[-3.7, 0.02, 2.3]}>
        <boxGeometry args={[0.34, 0.52, 0.03]} />
        <meshStandardMaterial color="#e8c94a" side={DoubleSide} />
      </mesh>
    </group>
  )
}

/** The letterbox by the gate, flag up — something nice might have arrived. */
function Mailbox() {
  return (
    <group position={[1.7, 0, 6.0]}>
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[0.09, 0.8, 0.09]} />
        <meshStandardMaterial color={TRUNK} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.3, 0.22, 0.4]} />
        <meshStandardMaterial color={DOOR} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[0.32, 0.06, 0.42]} />
        <meshStandardMaterial color="#a34f40" />
      </mesh>
      <mesh position={[0.18, 0.12, 0.1]}>
        <boxGeometry args={[0.03, 0.18, 0.05]} />
        <meshStandardMaterial color="#e8c94a" />
      </mesh>
    </group>
  )
}

/** Wild sunflowers peeking over the east fence from the meadow beyond. */
function Sunflowers() {
  const stalks: [number, number, number][] = [
    [6.55, 1.4, 0.95],
    [6.6, 2.9, 1.15],
    [6.5, 4.5, 0.85],
  ]
  return (
    <group>
      {stalks.map(([x, z, h]) => (
        <group key={z} position={[x, -0.89, z]}>
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[0.06, h, 0.06]} />
            <meshStandardMaterial color={palette.stem} />
          </mesh>
          <mesh position={[0.02, h * 0.55, 0.06]} rotation-z={0.4}>
            <boxGeometry args={[0.16, 0.06, 0.04]} />
            <meshStandardMaterial color={LEAF} />
          </mesh>
          <mesh position={[0, h + 0.08, 0]}>
            <boxGeometry args={[0.26, 0.26, 0.08]} />
            <meshStandardMaterial color="#e8c94a" />
          </mesh>
          <mesh position={[0, h + 0.08, 0.045]}>
            <boxGeometry args={[0.12, 0.12, 0.04]} />
            <meshStandardMaterial color="#7a5a3a" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Little tufts of longer grass, so the lawn reads as grown, not painted. */
function LawnTufts() {
  const tufts: [number, number][] = [
    [-4.6, 0.6],
    [-2.1, 4.9],
    [-0.9, 1.7],
    [-1.6, 5.9],
    [2.4, 3.3],
    [3.4, 5.7],
    [4.7, 2.4],
    [-4.9, 4.1],
    [2.9, 1.1],
    [5.5, 5.8],
  ]
  return (
    <group>
      {tufts.map(([x, z]) => (
        <group key={`${x}:${z}`} position={[x, -0.89, z]}>
          <mesh position={[-0.03, 0.07, 0]} rotation-z={0.15}>
            <boxGeometry args={[0.035, 0.16, 0.035]} />
            <meshStandardMaterial color={LEAF} />
          </mesh>
          <mesh position={[0.04, 0.06, 0.02]} rotation-z={-0.2}>
            <boxGeometry args={[0.035, 0.13, 0.035]} />
            <meshStandardMaterial color={LEAF_DARK} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** The owned greenhouse, seen from the garden — walk into its door to enter. */
function GardenGreenhouse() {
  return (
    <group position={[4.6, 0, -0.075]}>
      {/* brick base — the front leaves the doorway gap */}
      <mesh position={[0, -0.69, -0.79]}>
        <boxGeometry args={[2.7, 0.4, 0.12]} />
        <meshStandardMaterial color={BRICK} />
      </mesh>
      {[-1.29, 1.29].map((x) => (
        <mesh key={x} position={[x, -0.69, 0]}>
          <boxGeometry args={[0.12, 0.4, 1.7]} />
          <meshStandardMaterial color={BRICK} />
        </mesh>
      ))}
      {[-0.775, 0.775].map((x) => (
        <mesh key={x} position={[x, -0.69, 0.79]}>
          <boxGeometry args={[1.15, 0.4, 0.12]} />
          <meshStandardMaterial color={BRICK} />
        </mesh>
      ))}
      {/* glass walls */}
      {(
        [
          [0, 0.06, -0.79, 2.6, 1.16, 0],
          [-1.29, 0.06, 0, 1.7, 1.16, Math.PI / 2],
          [1.29, 0.06, 0, 1.7, 1.16, Math.PI / 2],
          [-0.75, 0.06, 0.79, 0.9, 1.16, 0],
          [0.75, 0.06, 0.79, 0.9, 1.16, 0],
        ] as const
      ).map(([x, y, z, w, h, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation-y={rot}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color={GH_GLASS} transparent opacity={0.22} side={DoubleSide} />
        </mesh>
      ))}
      {/* corner and door posts */}
      {(
        [
          [-1.29, -0.79],
          [1.29, -0.79],
          [-1.29, 0.79],
          [1.29, 0.79],
          [-0.32, 0.79],
          [0.32, 0.79],
        ] as const
      ).map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, -0.1, z]}>
          <boxGeometry args={[0.09, 1.6, 0.09]} />
          <meshStandardMaterial color={GH_FRAME} />
        </mesh>
      ))}
      {/* the door itself, standing invitingly ajar */}
      <group position={[-0.13, -0.14, 0.84]} rotation-y={0.5}>
        <mesh position={[0.16, 0, 0]}>
          <boxGeometry args={[0.36, 1.5, 0.05]} />
          <meshStandardMaterial color={GH_FRAME} />
        </mesh>
        <mesh position={[0.16, 0.1, 0.01]}>
          <boxGeometry args={[0.26, 1.1, 0.05]} />
          <meshStandardMaterial color={GH_GLASS} transparent opacity={0.35} />
        </mesh>
      </group>
      {/* eaves and gable roof */}
      {[-0.79, 0.79].map((z) => (
        <mesh key={z} position={[0, 0.68, z]}>
          <boxGeometry args={[2.75, 0.1, 0.1]} />
          <meshStandardMaterial color={GH_FRAME} />
        </mesh>
      ))}
      <mesh position={[0, 1.18, 0]}>
        <boxGeometry args={[2.8, 0.11, 0.11]} />
        <meshStandardMaterial color="#cfc7b2" />
      </mesh>
      <mesh position={[0, 0.95, -0.44]} rotation-x={-0.52}>
        <planeGeometry args={[2.7, 1.02]} />
        <meshStandardMaterial color={GH_GLASS} transparent opacity={0.22} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.95, 0.44]} rotation-x={0.52}>
        <planeGeometry args={[2.7, 1.02]} />
        <meshStandardMaterial color={GH_GLASS} transparent opacity={0.22} side={DoubleSide} />
      </mesh>
      {/* stepping stones up to the door */}
      <mesh position={[0, -0.885, 1.1]}>
        <cylinderGeometry args={[0.26, 0.26, 0.03, 7]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>
    </group>
  )
}

/* --------------------------------- weather ----------------------------------- */

const SKY_BASE = { sun: palette.sky, clouds: palette.skyDim, rain: '#87a0b4' } as const
const NIGHT_SKY = new Color('#28324f')
const RAIN_DROPS = 220
const RAIN_TOP = 3.6

/** The sky drum is centered on the lawn — dress it in cylinder coordinates:
 * azimuth 0° faces north (toward the house), +90° east, ±180° south. */
const SKY_CENTER_Z = 2.4
const onSky = (azDeg: number, y: number, r: number): [number, number, number] => {
  const az = (azDeg * Math.PI) / 180
  return [Math.sin(az) * r, y, SKY_CENTER_Z - Math.cos(az) * r]
}
const faceCenter = (azDeg: number) => (-azDeg * Math.PI) / 180

/** Cloud banks all the way round the drum — [azimuth°, y, scale]. */
const CLOUD_BANKS: [number, number, number][] = [
  [-14, 5.6, 1],
  [62, 5.0, 0.8],
  [138, 5.9, 1.1],
  [-118, 5.2, 0.9],
  [-64, 6.3, 0.7],
]

/** Hand-placed stars around the whole sky — [azimuth°, y]; deterministic, so
 * HMR and tests agree. */
const STARS: [number, number][] = [
  [-38, 5.9],
  [-29, 4.4],
  [-21, 6.6],
  [-12, 5.0],
  [-4, 6.2],
  [5, 4.6],
  [13, 5.7],
  [24, 4.9],
  [33, 6.4],
  [48, 5.2],
  [69, 6.0],
  [88, 4.7],
  [107, 5.8],
  [128, 4.9],
  [149, 6.3],
  [168, 5.1],
  [-171, 5.9],
  [-150, 4.6],
  [-128, 6.1],
  [-107, 5.0],
  [-88, 5.9],
  [-64, 4.8],
  [-51, 6.5],
]

/** The sky drum, sun/clouds/stars dressed around it, and rain over the lawn. */
function GardenWeather() {
  const weather = useSceneState((s) => currentWeather(s, s.lastTickAt))
  const skyMat = useRef<MeshStandardMaterial>(null)
  const sun = useRef<Mesh>(null)
  const clouds = useRef<Group>(null)
  const stars = useRef<Group>(null)
  const rain = useRef<InstancedMesh>(null)
  const drops = useRef<{ x: number; y: number; z: number; speed: number }[] | null>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const targetSky = useMemo(() => new Color(), [])
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useFrame((frame, delta) => {
    const daylight = daylightFactor(sceneNow())
    const ease = Math.min(1, delta * 2)
    if (skyMat.current) {
      targetSky.set(SKY_BASE[weather]).lerp(NIGHT_SKY, 1 - daylight)
      skyMat.current.color.lerp(targetSky, ease)
    }
    if (sun.current) sun.current.visible = weather === 'sun' && daylight > 0.5
    if (clouds.current) clouds.current.visible = weather !== 'sun'
    const starGroup = stars.current
    if (starGroup) {
      starGroup.visible = weather === 'sun' && daylight < 0.45
      if (starGroup.visible) {
        starGroup.children.forEach((star, i) => {
          const s = 0.8 + Math.abs(Math.sin(frame.clock.elapsedTime * 0.9 + i * 1.7)) * 0.5
          star.scale.setScalar(s)
        })
      }
    }

    const rainMesh = rain.current
    if (rainMesh) {
      const active = weather === 'rain' && !reduceMotion
      rainMesh.visible = active
      if (active) {
        drops.current ??= Array.from({ length: RAIN_DROPS }, () => ({
          x: -6 + Math.random() * 12,
          y: Math.random() * RAIN_TOP,
          z: -0.9 + Math.random() * 7.3,
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
      {/* the sky: a drum around the whole lawn, so every direction has weather
          now that the camera orbits freely — not just the side with the house */}
      <mesh position={[0, 0.5, SKY_CENTER_Z]}>
        <cylinderGeometry args={[15.5, 15.5, 15, 14, 1, true]} />
        <meshStandardMaterial ref={skyMat} color={palette.sky} side={BackSide} />
      </mesh>
      {/* the sun keeps its spot over the house — there's only one of it */}
      <mesh ref={sun} position={onSky(-35, 6.2, 13.8)} rotation={[0, faceCenter(-35), 0.5]}>
        <boxGeometry args={[1.3, 1.3, 0.1]} />
        <meshStandardMaterial color={palette.sun} />
      </mesh>
      {/* cloud banks hang all around the drum, not just over the house */}
      <group ref={clouds}>
        {CLOUD_BANKS.map(([az, y, s]) => (
          <group key={az} position={onSky(az, y, 13.5)} rotation-y={faceCenter(az)} scale={s}>
            <mesh>
              <boxGeometry args={[2.6, 0.72, 0.12]} />
              <meshStandardMaterial color="#f2f4f0" />
            </mesh>
            <mesh position={[-2.1, 0.75, 0]}>
              <boxGeometry args={[1.9, 0.62, 0.12]} />
              <meshStandardMaterial color="#f2f4f0" />
            </mesh>
            <mesh position={[2.6, -0.5, 0]}>
              <boxGeometry args={[1.6, 0.55, 0.12]} />
              <meshStandardMaterial color="#f2f4f0" />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={stars} visible={false}>
        {STARS.map(([az, y], i) => (
          <mesh key={i} position={onSky(az, y, 15.0)} rotation-y={faceCenter(az)}>
            <boxGeometry args={[0.09, 0.09, 0.02]} />
            <meshStandardMaterial color="#fdf6dd" emissive="#f2e6b8" emissiveIntensity={0.9} />
          </mesh>
        ))}
      </group>
      <instancedMesh ref={rain} args={[undefined, undefined, RAIN_DROPS]} visible={false}>
        <boxGeometry args={[0.014, 0.12, 0.014]} />
        <meshStandardMaterial color="#7fa8c9" transparent opacity={0.55} />
      </instancedMesh>
      {/* golden drops fall in the open — no roof out here to sneak through */}
      <GoldenDrop area={{ x0: -1.2, x1: 2.4, z: 2.3, yTop: 2.8, yBottom: -0.55 }} />
    </group>
  )
}
