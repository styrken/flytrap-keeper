// The room around the windowsill — pure set dressing, all static primitives.
import { palette } from './palette'

export function Room() {
  return (
    <group>
      {/* floor and skirting board */}
      <mesh position={[0, -0.94, 1.4]}>
        <boxGeometry args={[8.5, 0.1, 5.2]} />
        <meshStandardMaterial color="#a8804f" />
      </mesh>
      <mesh position={[0, -0.78, -0.52]}>
        <boxGeometry args={[7.5, 0.22, 0.07]} />
        <meshStandardMaterial color="#f0e6d4" />
      </mesh>

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

      {/* a little flytrap painting on the wall */}
      <group position={[-2.35, 1.45, -0.5]} rotation-z={0.02}>
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
    </group>
  )
}
