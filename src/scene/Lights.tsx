import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { AmbientLight, DirectionalLight } from 'three'
import { activePlant, currentWeather } from '../sim'
import { useGame } from '../store'
import { daylightFactor } from './daylight'

const WEATHER_DIM = { sun: 1, clouds: 0.78, rain: 0.68 } as const

/** Lighting follows window spot, weather, and time of day. */
export function Lights() {
  const placement = useGame((s) => activePlant(s.state)?.placement ?? 'south-window')
  const weather = useGame((s) => currentWeather(s.state, s.state.lastTickAt))
  const dir = useRef<DirectionalLight>(null)
  const amb = useRef<AmbientLight>(null)

  useFrame((_, delta) => {
    const daylight = daylightFactor(Date.now())
    const sunny = placement === 'south-window'
    const dim = WEATHER_DIM[weather]
    const targetDir = (sunny ? 1.4 : 0.8) * dim * (0.25 + 0.75 * daylight)
    const targetAmb = (sunny ? 0.85 : 0.65) * (0.55 + 0.45 * dim) * (0.45 + 0.55 * daylight)
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
