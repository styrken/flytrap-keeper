import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { AmbientLight, DirectionalLight } from 'three'
import { activePlant } from '../sim'
import { useGame } from '../store'

/** Scene lighting follows the plant's window spot — south is sunny, north is soft. */
export function Lights() {
  const placement = useGame((s) => activePlant(s.state)?.placement ?? 'south-window')
  const dir = useRef<DirectionalLight>(null)
  const amb = useRef<AmbientLight>(null)
  const sunny = placement === 'south-window'
  const targetDir = sunny ? 1.4 : 0.8
  const targetAmb = sunny ? 0.85 : 0.65

  useFrame((_, delta) => {
    const ease = Math.min(1, delta * 3)
    if (dir.current) dir.current.intensity += (targetDir - dir.current.intensity) * ease
    if (amb.current) amb.current.intensity += (targetAmb - amb.current.intensity) * ease
  })

  return (
    <>
      <ambientLight ref={amb} intensity={0.85} />
      <directionalLight ref={dir} position={[3, 5, 2]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} />
    </>
  )
}
