import { useGLTF } from '@react-three/drei'
import { playSplash } from '../audio'
import { canRainWater } from '../sim'
import { useGame } from '../store'
import { RainBarrel } from './Barrel'
import { FlytrapPlant } from './FlytrapPlant'
import { Insects } from './Insects'
import { palette } from './palette'
import { WeatherSky } from './WeatherSky'

const MODEL_WATERING_CAN = '/models/watering-can.glb'

export function Diorama() {
  return (
    <group>
      <Windowsill />
      <WindowFrame />
      <WeatherSky />
      <group position={[0, 0.06, 0.05]}>
        <Pot />
        <FlytrapPlant position={[0, 0.32, 0]} />
      </group>
      <WateringCan position={[0.72, 0.06, 0.3]} yaw={-0.7} />
      <RainBarrel position={[-0.62, 0.06, 0.28]} />
      <Insects />
    </group>
  )
}

function Windowsill() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[3.2, 0.12, 1.1]} />
      <meshStandardMaterial color={palette.sill} />
    </mesh>
  )
}

function WindowFrame() {
  const bars: { size: [number, number, number]; position: [number, number, number] }[] = [
    { size: [2.7, 0.1, 0.09], position: [0, 0.11, 0] },
    { size: [2.7, 0.1, 0.09], position: [0, 2.06, 0] },
    { size: [0.1, 2.05, 0.09], position: [-1.3, 1.085, 0] },
    { size: [0.1, 2.05, 0.09], position: [1.3, 1.085, 0] },
    { size: [0.06, 1.85, 0.06], position: [0, 1.085, 0] },
    { size: [2.6, 0.06, 0.06], position: [0, 1.2, 0] },
  ]
  return (
    <group position={[0, 0, -0.42]}>
      {bars.map((bar, i) => (
        <mesh key={i} position={bar.position}>
          <boxGeometry args={bar.size} />
          <meshStandardMaterial color={palette.frame} />
        </mesh>
      ))}
    </group>
  )
}

function Pot() {
  return (
    <group>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.28, 0.22, 0.26, 8]} />
        <meshStandardMaterial color={palette.pot} flatShading />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 8]} />
        <meshStandardMaterial color={palette.potRim} flatShading />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.05, 8]} />
        <meshStandardMaterial color={palette.soil} flatShading />
      </mesh>
    </group>
  )
}

function WateringCan({ position, yaw }: { position: [number, number, number]; yaw: number }) {
  const { scene } = useGLTF(MODEL_WATERING_CAN)
  const waterable = useGame((s) => canRainWater(s.state))
  const dispatch = useGame((s) => s.dispatch)
  return (
    <group
      position={position}
      rotation-y={yaw}
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
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(MODEL_WATERING_CAN)
