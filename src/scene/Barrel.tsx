import { playSplash } from '../audio'
import { SIM, canRainWater } from '../sim'
import { useIsVisiting, useSceneDispatch, useSceneState } from '../sceneView'

/** The rain barrel: its water level is visible at a glance, and tapping it waters the plant. */
export function RainBarrel({ position }: { position: [number, number, number] }) {
  const rainBarrel = useSceneState((s) => s.weather.rainBarrel)
  const visiting = useIsVisiting()
  const waterable = useSceneState(canRainWater) && !visiting
  const dispatch = useSceneDispatch()

  const fillHeight = Math.max(0.02, 0.3 * (rainBarrel / SIM.BARREL_CAP))

  return (
    <group
      position={position}
      onPointerDown={(e) => {
        if (!waterable) return
        e.stopPropagation()
        dispatch({ type: 'water' })
        playSplash()
      }}
      onPointerOver={() => {
        if (waterable) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh position={[0, 0.19, 0]}>
        <cylinderGeometry args={[0.17, 0.15, 0.38, 8]} />
        <meshStandardMaterial color="#5d7d8a" flatShading />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.185, 0.185, 0.04, 8]} />
        <meshStandardMaterial color="#4c6773" flatShading />
      </mesh>
      <mesh position={[0, 0.06 + fillHeight / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.13, 0.13, fillHeight, 8]} />
        <meshStandardMaterial color="#4f9dd0" flatShading />
      </mesh>
    </group>
  )
}
