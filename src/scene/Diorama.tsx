import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import type { Group } from 'three'

const palette = {
  sill: '#c99e6d',
  frame: '#f6f1e6',
  sky: '#9fd3ea',
  sun: '#f7d154',
  pot: '#c96f4a',
  potRim: '#b35c3a',
  soil: '#4a3527',
  stem: '#3f9b4f',
  trap: '#58b862',
  mouth: '#d4506e',
} as const

const MODEL_WATERING_CAN = '/models/watering-can.glb'

export function Diorama() {
  return (
    <group>
      <Windowsill />
      <WindowFrame />
      <SkyBackdrop />
      <group position={[0, 0.06, 0.05]}>
        <Pot />
        <Flytrap position={[0, 0.32, 0]} />
      </group>
      <WateringCan position={[1.05, 0.06, 0.28]} yaw={-0.7} />
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

function SkyBackdrop() {
  return (
    <group>
      <mesh position={[0, 1.11, -0.5]}>
        <planeGeometry args={[2.5, 1.95]} />
        <meshStandardMaterial color={palette.sky} />
      </mesh>
      <mesh position={[-0.7, 1.6, -0.47]} rotation-z={0.5}>
        <boxGeometry args={[0.3, 0.3, 0.04]} />
        <meshStandardMaterial color={palette.sun} />
      </mesh>
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

function Flytrap({ position }: { position: [number, number, number] }) {
  const sway = useRef<Group>(null)
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  useFrame((state) => {
    const g = sway.current
    if (!g || reduceMotion) return
    g.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.025
  })
  return (
    <group position={position}>
      <group ref={sway}>
        <StemWithTrap tilt={0} height={0.34} trapYaw={0.25} trapScale={1} />
        <StemWithTrap tilt={0.55} height={0.28} trapYaw={0.9} trapScale={0.8} />
        <StemWithTrap tilt={-0.5} height={0.3} trapYaw={-0.8} trapScale={0.85} />
      </group>
    </group>
  )
}

function StemWithTrap({
  tilt,
  height,
  trapYaw,
  trapScale,
}: {
  tilt: number
  height: number
  trapYaw: number
  trapScale: number
}) {
  return (
    <group rotation-z={tilt}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.045, height, 0.045]} />
        <meshStandardMaterial color={palette.stem} />
      </mesh>
      <Trap position={[0, height + 0.02, 0]} yaw={trapYaw} scale={trapScale} />
    </group>
  )
}

const TRAP_OPEN = -0.85
const TRAP_CLOSED = -0.06

function Trap({
  position,
  yaw,
  scale,
}: {
  position: [number, number, number]
  yaw: number
  scale: number
}) {
  const upper = useRef<Group>(null)
  const [snapped, setSnapped] = useState(false)
  useFrame((_, delta) => {
    const g = upper.current
    if (!g) return
    const target = snapped ? TRAP_CLOSED : TRAP_OPEN
    const speed = snapped ? 16 : 5
    g.rotation.x += (target - g.rotation.x) * Math.min(1, delta * speed)
  })
  return (
    <group
      position={position}
      rotation-y={yaw}
      scale={scale}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (snapped) return
        setSnapped(true)
        window.setTimeout(() => setSnapped(false), 1100)
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh position={[0, 0.028, 0.09]}>
        <boxGeometry args={[0.26, 0.056, 0.24]} />
        <meshStandardMaterial color={palette.trap} />
      </mesh>
      <mesh position={[0, 0.058, 0.09]}>
        <boxGeometry args={[0.2, 0.014, 0.18]} />
        <meshStandardMaterial color={palette.mouth} />
      </mesh>
      <group ref={upper} position={[0, 0.06, -0.03]} rotation-x={TRAP_OPEN}>
        <mesh position={[0, 0.03, 0.12]}>
          <boxGeometry args={[0.26, 0.06, 0.24]} />
          <meshStandardMaterial color={palette.trap} />
        </mesh>
      </group>
    </group>
  )
}

function WateringCan({ position, yaw }: { position: [number, number, number]; yaw: number }) {
  const { scene } = useGLTF(MODEL_WATERING_CAN)
  return (
    <group position={position} rotation-y={yaw}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(MODEL_WATERING_CAN)
