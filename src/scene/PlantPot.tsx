import type { PlantState } from '../sim'
import { useGame } from '../store'
import { PlantKit } from './kits'
import { palette } from './palette'
import { POT_SLOTS } from './plantLayout'

export function PlantPot({ plant, slot }: { plant: PlantState; slot: number }) {
  const isActive = useGame((s) => s.state.activePlantId === plant.id)
  const dispatch = useGame((s) => s.dispatch)
  const position = POT_SLOTS[slot] ?? POT_SLOTS[0]
  const potColor = plant.potColor ?? palette.pot
  const rimColor = plant.potColor ?? palette.potRim

  return (
    <group
      position={position}
      onPointerDown={(e) => {
        if (isActive) return
        e.stopPropagation()
        dispatch({ type: 'selectPlant', plantId: plant.id })
      }}
      onPointerOver={() => {
        if (!isActive) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {isActive && (
        <mesh position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.37, 0.37, 0.02, 8]} />
          <meshStandardMaterial color="#f4c065" flatShading />
        </mesh>
      )}
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.28, 0.22, 0.26, 8]} />
        <meshStandardMaterial color={potColor} flatShading />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 8]} />
        <meshStandardMaterial color={rimColor} flatShading />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.05, 8]} />
        <meshStandardMaterial color={palette.soil} flatShading />
      </mesh>
      {plant.dead && (
        <mesh position={[0, 0.42, -0.12]} rotation-z={0.15}>
          <boxGeometry args={[0.16, 0.2, 0.04]} />
          <meshStandardMaterial color="#a9a9a9" flatShading />
        </mesh>
      )}
      <group position={[0, 0.32, 0]}>
        <PlantKit plant={plant} />
      </group>
      {plant.placement === 'growlight' && <GrowLamp />}
    </group>
  )
}

function GrowLamp() {
  return (
    <group position={[0.42, 0, -0.12]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.05, 1.1, 0.05]} />
        <meshStandardMaterial color="#4c4c56" />
      </mesh>
      <mesh position={[-0.22, 1.08, 0.06]}>
        <boxGeometry args={[0.5, 0.05, 0.05]} />
        <meshStandardMaterial color="#4c4c56" />
      </mesh>
      <mesh position={[-0.42, 1.02, 0.12]}>
        <boxGeometry args={[0.22, 0.08, 0.22]} />
        <meshStandardMaterial color="#d8a0ff" emissive="#b06ce8" emissiveIntensity={0.7} />
      </mesh>
      <pointLight position={[-0.42, 0.95, 0.12]} intensity={0.7} distance={1.4} color="#e0b0ff" />
    </group>
  )
}
