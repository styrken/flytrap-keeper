import { useGLTF } from '@react-three/drei'
import { playSplash } from '../audio'
import { canRainWater } from '../sim'
import { useGame } from '../store'
import { RainBarrel } from './Barrel'
import { Insects } from './Insects'
import { palette } from './palette'
import { PlantPot } from './PlantPot'
import { Room } from './Room'
import { WeatherSky } from './WeatherSky'

const MODEL_WATERING_CAN = '/models/watering-can.glb'

export function Diorama() {
  const plants = useGame((s) => s.state.plants)
  const hasGnome = useGame((s) => s.state.inventory.items.includes('gnome'))
  return (
    <group>
      <Room />
      <Windowsill />
      <WindowFrame />
      <WeatherSky />
      {plants.map((plant, slot) => (
        <PlantPot key={plant.id} plant={plant} slot={slot} />
      ))}
      <WateringCan position={[1.3, 0.06, 0.32]} yaw={-0.7} />
      <RainBarrel position={[-1.3, 0.06, 0.16]} />
      {hasGnome && <Gnome position={[1.34, 0.06, -0.12]} />}
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

function Gnome({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[0.11, 0.14, 0.09]} />
        <meshStandardMaterial color="#5d84ae" />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.09, 0.06, 0.08]} />
        <meshStandardMaterial color="#e8c49a" />
      </mesh>
      <mesh position={[0, 0.16, 0.045]}>
        <boxGeometry args={[0.05, 0.04, 0.02]} />
        <meshStandardMaterial color="#f6f1e6" />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.001, 0.06, 0.12, 4]} />
        <meshStandardMaterial color="#cb4a4a" flatShading />
      </mesh>
    </group>
  )
}

useGLTF.preload(MODEL_WATERING_CAN)
