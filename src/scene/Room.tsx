// The room around the windowsill. Static architecture + furniture in <Room />,
// purchasable decor in <RoomDecor />. Side walls are single-sided planes facing
// inward, so the camera can orbit outside the room and still see in (dollhouse
// trick) — only the window wall is solid boxes, since the camera never gets
// behind it.
import { useGame } from '../store'
import { daylightFactor } from './daylight'
import { palette } from './palette'

const WALL = '#f2e9da'
const WALL_SIDE = '#ece0cb'
const WOOD_DARK = '#8f6844'
const WOOD_MID = '#a97e52'

export function Room() {
  return (
    <group>
      {/* floor */}
      <mesh position={[0, -0.94, 1.7]}>
        <boxGeometry args={[7.5, 0.1, 4.7]} />
        <meshStandardMaterial color="#a8804f" />
      </mesh>

      {/* window wall: four segments around the opening */}
      <mesh position={[-2.525, 0.955, -0.56]}>
        <boxGeometry args={[2.45, 3.89, 0.12]} />
        <meshStandardMaterial color={WALL} />
      </mesh>
      <mesh position={[2.525, 0.955, -0.56]}>
        <boxGeometry args={[2.45, 3.89, 0.12]} />
        <meshStandardMaterial color={WALL} />
      </mesh>
      <mesh position={[0, 2.48, -0.56]}>
        <boxGeometry args={[2.6, 0.84, 0.12]} />
        <meshStandardMaterial color={WALL} />
      </mesh>
      <mesh position={[0, -0.44, -0.56]}>
        <boxGeometry args={[2.6, 1.1, 0.12]} />
        <meshStandardMaterial color={WALL} />
      </mesh>

      {/* side walls: inward-facing planes, invisible from outside */}
      <mesh position={[-3.65, 0.955, 1.655]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[4.55, 3.89]} />
        <meshStandardMaterial color={WALL_SIDE} />
      </mesh>
      <mesh position={[3.65, 0.955, 1.655]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[4.55, 3.89]} />
        <meshStandardMaterial color={WALL_SIDE} />
      </mesh>

      {/* skirting boards */}
      <mesh position={[0, -0.78, -0.49]}>
        <boxGeometry args={[7.3, 0.22, 0.07]} />
        <meshStandardMaterial color="#f0e6d4" />
      </mesh>
      <mesh position={[-3.61, -0.78, 1.65]}>
        <boxGeometry args={[0.07, 0.22, 4.5]} />
        <meshStandardMaterial color="#f0e6d4" />
      </mesh>
      <mesh position={[3.61, -0.78, 1.65]}>
        <boxGeometry args={[0.07, 0.22, 4.5]} />
        <meshStandardMaterial color="#f0e6d4" />
      </mesh>

      {/* frosted little window on the left wall, above the bed */}
      <group position={[-3.6, 1.55, 0.9]} rotation-y={Math.PI / 2}>
        <mesh>
          <boxGeometry args={[1.0, 1.2, 0.07]} />
          <meshStandardMaterial color={palette.frame} />
        </mesh>
        <mesh position={[0, 0, 0.015]}>
          <boxGeometry args={[0.86, 1.06, 0.06]} />
          <meshStandardMaterial color="#dcecf2" emissive="#bcd8e4" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <boxGeometry args={[0.05, 1.06, 0.03]} />
          <meshStandardMaterial color={palette.frame} />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <boxGeometry args={[0.86, 0.05, 0.03]} />
          <meshStandardMaterial color={palette.frame} />
        </mesh>
      </group>

      {/* curtain rod with knobs */}
      <mesh position={[0, 2.32, -0.3]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, 3.9, 8]} />
        <meshStandardMaterial color="#7a5a3a" flatShading />
      </mesh>
      {[-1.95, 1.95].map((x) => (
        <mesh key={x} position={[x, 2.32, -0.3]}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial color="#5f4630" />
        </mesh>
      ))}
      {/* curtains: two folded drapes */}
      {[-1.72, 1.72].map((x) => (
        <group key={x} position={[x, 1.12, -0.32]}>
          <mesh>
            <boxGeometry args={[0.34, 2.36, 0.09]} />
            <meshStandardMaterial color="#cb7a5e" />
          </mesh>
          <mesh position={[x < 0 ? 0.2 : -0.2, 0, 0.03]}>
            <boxGeometry args={[0.1, 2.36, 0.09]} />
            <meshStandardMaterial color="#b96a50" />
          </mesh>
        </group>
      ))}

      {/* radiator under the window */}
      <group position={[0, -0.42, -0.48]}>
        <mesh>
          <boxGeometry args={[1.7, 0.5, 0.07]} />
          <meshStandardMaterial color="#e3ddcf" />
        </mesh>
        {[-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].map((x) => (
          <mesh key={x} position={[x, 0, 0.05]}>
            <boxGeometry args={[0.13, 0.42, 0.05]} />
            <meshStandardMaterial color="#d6cfc0" />
          </mesh>
        ))}
        <mesh position={[0.78, 0.2, 0.03]}>
          <boxGeometry args={[0.06, 0.06, 0.06]} />
          <meshStandardMaterial color="#b0a894" />
        </mesh>
      </group>

      {/* a little flytrap painting on the window wall */}
      <group position={[-2.35, 1.45, -0.47]} rotation-z={0.02}>
        <mesh>
          <boxGeometry args={[0.56, 0.68, 0.05]} />
          <meshStandardMaterial color="#8a6a48" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.46, 0.58, 0.05]} />
          <meshStandardMaterial color="#f2e8d8" />
        </mesh>
        <mesh position={[0, -0.1, 0.05]}>
          <boxGeometry args={[0.05, 0.2, 0.04]} />
          <meshStandardMaterial color={palette.stem} />
        </mesh>
        <mesh position={[0, 0.06, 0.05]} rotation-z={0.3}>
          <boxGeometry args={[0.14, 0.1, 0.04]} />
          <meshStandardMaterial color={palette.trap} />
        </mesh>
        <mesh position={[0.02, 0.05, 0.07]} rotation-z={0.3}>
          <boxGeometry args={[0.08, 0.03, 0.02]} />
          <meshStandardMaterial color={palette.mouth} />
        </mesh>
      </group>

      {/* a small stack of books on the sill */}
      <group position={[-1.02, 0.06, -0.18]}>
        <mesh position={[0, 0.03, 0]} rotation-y={0.15}>
          <boxGeometry args={[0.3, 0.06, 0.22]} />
          <meshStandardMaterial color="#c9a44a" />
        </mesh>
        <mesh position={[0.02, 0.09, 0.01]} rotation-y={-0.1}>
          <boxGeometry args={[0.27, 0.06, 0.2]} />
          <meshStandardMaterial color="#5d84ae" />
        </mesh>
        <mesh position={[-0.01, 0.15, -0.01]} rotation-y={0.25}>
          <boxGeometry args={[0.24, 0.06, 0.18]} />
          <meshStandardMaterial color="#b25b4a" />
        </mesh>
      </group>

      {/* bed along the left wall */}
      <group position={[-2.95, 0, 0.95]}>
        <mesh position={[0, -0.76, 0]}>
          <boxGeometry args={[1.35, 0.26, 2.15]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        <mesh position={[0, -0.5, -1.03]}>
          <boxGeometry args={[1.35, 0.62, 0.09]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <boxGeometry args={[1.24, 0.16, 2.0]} />
          <meshStandardMaterial color="#f1ebdd" />
        </mesh>
        <mesh position={[0, -0.42, -0.68]} rotation-y={0.05}>
          <boxGeometry args={[0.72, 0.14, 0.42]} />
          <meshStandardMaterial color="#fbf7ee" />
        </mesh>
        <mesh position={[0, -0.47, 0.45]}>
          <boxGeometry args={[1.28, 0.12, 1.15]} />
          <meshStandardMaterial color="#cb7a5e" />
        </mesh>
        <mesh position={[0, -0.4, -0.1]}>
          <boxGeometry args={[1.28, 0.05, 0.18]} />
          <meshStandardMaterial color="#b96a50" />
        </mesh>
      </group>

      {/* desk and chair against the right wall */}
      <group position={[3.2, 0, 0.7]}>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.75, 0.07, 1.5]} />
          <meshStandardMaterial color={WOOD_MID} />
        </mesh>
        {[
          [-0.32, -0.68],
          [-0.32, 0.68],
          [0.32, -0.68],
          [0.32, 0.68],
        ].map(([x, z]) => (
          <mesh key={`${x}:${z}`} position={[x, -0.565, z]}>
            <boxGeometry args={[0.07, 0.7, 0.07]} />
            <meshStandardMaterial color={WOOD_DARK} />
          </mesh>
        ))}
      </group>
      <group position={[2.62, 0, 0.7]} rotation-y={0.15}>
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[0.42, 0.06, 0.42]} />
          <meshStandardMaterial color={WOOD_MID} />
        </mesh>
        {[
          [-0.17, -0.17],
          [-0.17, 0.17],
          [0.17, -0.17],
          [0.17, 0.17],
        ].map(([x, z]) => (
          <mesh key={`${x}:${z}`} position={[x, -0.7, z]}>
            <boxGeometry args={[0.05, 0.36, 0.05]} />
            <meshStandardMaterial color={WOOD_DARK} />
          </mesh>
        ))}
        <mesh position={[-0.2, -0.24, 0]}>
          <boxGeometry args={[0.06, 0.5, 0.42]} />
          <meshStandardMaterial color={WOOD_MID} />
        </mesh>
      </group>

      {/* wall shelf right of the window, with a tiny cactus and books */}
      <group position={[2.45, 1.3, -0.35]}>
        <mesh>
          <boxGeometry args={[1.15, 0.055, 0.3]} />
          <meshStandardMaterial color={WOOD_MID} />
        </mesh>
        {[-0.42, 0.42].map((x) => (
          <mesh key={x} position={[x, -0.11, -0.04]}>
            <boxGeometry args={[0.05, 0.18, 0.22]} />
            <meshStandardMaterial color={WOOD_DARK} />
          </mesh>
        ))}
        <group position={[-0.42, 0.03, 0]}>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.1, 0.09, 0.1]} />
            <meshStandardMaterial color={palette.potRim} />
          </mesh>
          <mesh position={[0, 0.17, 0]}>
            <boxGeometry args={[0.07, 0.13, 0.07]} />
            <meshStandardMaterial color={palette.stem} />
          </mesh>
          <mesh position={[0.06, 0.2, 0]}>
            <boxGeometry args={[0.05, 0.06, 0.04]} />
            <meshStandardMaterial color={palette.stem} />
          </mesh>
        </group>
        <mesh position={[-0.13, 0.17, 0]} rotation-z={0.05}>
          <boxGeometry args={[0.05, 0.28, 0.2]} />
          <meshStandardMaterial color="#5d84ae" />
        </mesh>
        <mesh position={[-0.07, 0.16, 0]} rotation-z={-0.12}>
          <boxGeometry args={[0.05, 0.26, 0.19]} />
          <meshStandardMaterial color="#c9a44a" />
        </mesh>
      </group>

      {/* wall clock on the right wall */}
      <group position={[3.62, 2.0, 1.9]} rotation-y={-Math.PI / 2}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 10]} />
          <meshStandardMaterial color="#7a5a3a" flatShading />
        </mesh>
        <mesh position={[0, 0, 0.011]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.18, 0.18, 0.03, 10]} />
          <meshStandardMaterial color="#f6f1e6" flatShading />
        </mesh>
        <mesh position={[0, 0.06, 0.03]}>
          <boxGeometry args={[0.018, 0.12, 0.012]} />
          <meshStandardMaterial color="#3c2f24" />
        </mesh>
        <mesh position={[0.045, 0.02, 0.03]} rotation-z={-1.1}>
          <boxGeometry args={[0.016, 0.1, 0.012]} />
          <meshStandardMaterial color="#3c2f24" />
        </mesh>
      </group>
    </group>
  )
}

/** Shop decor: each owned item pops up on its hand-picked spot in the room. */
export function RoomDecor() {
  const items = useGame((s) => s.state.inventory.items)
  const lastTickAt = useGame((s) => s.state.lastTickAt)
  const dark = daylightFactor(lastTickAt) < 0.6
  return (
    <group>
      {items.includes('rug') && <Rug />}
      {items.includes('poster') && <Poster />}
      {items.includes('radio') && <Radio />}
      {items.includes('lamp') && <Lamp dark={dark} />}
      {items.includes('computer') && <Computer dark={dark} />}
    </group>
  )
}

function Rug() {
  return (
    <group position={[0.4, -0.885, 1.75]} scale={[1.3, 1, 0.9]}>
      <mesh>
        <cylinderGeometry args={[1.05, 1.05, 0.025, 14]} />
        <meshStandardMaterial color="#d9a08c" flatShading />
      </mesh>
      <mesh position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.025, 14]} />
        <meshStandardMaterial color="#e8c9b0" flatShading />
      </mesh>
    </group>
  )
}

function Poster() {
  return (
    <group position={[3.63, 1.55, 0.7]} rotation-y={-Math.PI / 2}>
      <mesh>
        <boxGeometry args={[0.62, 0.85, 0.03]} />
        <meshStandardMaterial color="#2e3f55" />
      </mesh>
      <mesh position={[0, 0.31, 0.012]}>
        <boxGeometry args={[0.5, 0.11, 0.02]} />
        <meshStandardMaterial color="#e8c94a" />
      </mesh>
      <mesh position={[0.02, -0.16, 0.012]}>
        <boxGeometry args={[0.07, 0.34, 0.02]} />
        <meshStandardMaterial color={palette.stem} />
      </mesh>
      <mesh position={[0.02, 0.08, 0.014]} rotation-z={0.45}>
        <boxGeometry args={[0.24, 0.18, 0.02]} />
        <meshStandardMaterial color={palette.trap} />
      </mesh>
      <mesh position={[0.05, 0.06, 0.026]} rotation-z={0.45}>
        <boxGeometry args={[0.15, 0.05, 0.014]} />
        <meshStandardMaterial color={palette.mouth} />
      </mesh>
      <mesh position={[-0.19, -0.28, 0.012]}>
        <boxGeometry args={[0.06, 0.1, 0.02]} />
        <meshStandardMaterial color="#e8c49a" />
      </mesh>
      <mesh position={[-0.19, -0.21, 0.014]}>
        <boxGeometry args={[0.045, 0.045, 0.02]} />
        <meshStandardMaterial color="#f6d7ae" />
      </mesh>
      <mesh position={[0, -0.38, 0.012]}>
        <boxGeometry args={[0.44, 0.03, 0.02]} />
        <meshStandardMaterial color="#c8d4e4" />
      </mesh>
    </group>
  )
}

function Radio() {
  return (
    <group position={[2.68, 1.43, -0.36]}>
      <mesh>
        <boxGeometry args={[0.34, 0.2, 0.15]} />
        <meshStandardMaterial color="#b25b4a" />
      </mesh>
      <mesh position={[-0.07, 0, 0.075]}>
        <boxGeometry args={[0.13, 0.13, 0.02]} />
        <meshStandardMaterial color="#7a4438" />
      </mesh>
      {[0.08, 0.13].map((x) => (
        <mesh key={x} position={[x, -0.02, 0.075]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, 0.02, 8]} />
          <meshStandardMaterial color="#e8c49a" flatShading />
        </mesh>
      ))}
      <mesh position={[0.13, 0.2, 0]} rotation-z={-0.5}>
        <cylinderGeometry args={[0.008, 0.008, 0.28, 6]} />
        <meshStandardMaterial color="#3c2f24" flatShading />
      </mesh>
    </group>
  )
}

function Lamp({ dark }: { dark: boolean }) {
  return (
    <group position={[-3.15, 0, 2.75]}>
      <mesh position={[0, -0.87, 0]}>
        <cylinderGeometry args={[0.16, 0.19, 0.05, 10]} />
        <meshStandardMaterial color={WOOD_DARK} flatShading />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
        <meshStandardMaterial color="#5f4630" flatShading />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.15, 0.26, 0.32, 10]} />
        <meshStandardMaterial color="#e8c49a" flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.1]} />
        <meshStandardMaterial
          color="#ffe9c4"
          emissive="#ffd9a0"
          emissiveIntensity={dark ? 1.3 : 0.2}
        />
      </mesh>
      {dark && <pointLight position={[0, 0.6, 0]} intensity={0.5} distance={3} color="#ffd9a0" />}
    </group>
  )
}

function Computer({ dark }: { dark: boolean }) {
  return (
    <group position={[3.28, -0.145, 0.45]}>
      <mesh position={[0.06, 0.02, 0]}>
        <boxGeometry args={[0.14, 0.03, 0.14]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      <mesh position={[0.06, 0.09, 0]}>
        <boxGeometry args={[0.05, 0.12, 0.05]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      <mesh position={[0.08, 0.34, 0]}>
        <boxGeometry args={[0.06, 0.4, 0.56]} />
        <meshStandardMaterial color="#3c3c3c" />
      </mesh>
      <mesh position={[0.04, 0.34, 0]}>
        <boxGeometry args={[0.02, 0.32, 0.48]} />
        <meshStandardMaterial
          color="#eaf4f8"
          emissive={palette.sky}
          emissiveIntensity={dark ? 0.9 : 0.45}
        />
      </mesh>
      <mesh position={[0.028, 0.28, -0.08]}>
        <boxGeometry args={[0.012, 0.14, 0.1]} />
        <meshStandardMaterial
          color={palette.stem}
          emissive={palette.stem}
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[-0.16, 0.015, 0.02]} rotation-y={0.08}>
        <boxGeometry args={[0.16, 0.03, 0.4]} />
        <meshStandardMaterial color="#e3ddcf" />
      </mesh>
      <mesh position={[-0.14, 0.012, 0.3]}>
        <boxGeometry args={[0.06, 0.025, 0.09]} />
        <meshStandardMaterial color="#e3ddcf" />
      </mesh>
    </group>
  )
}
