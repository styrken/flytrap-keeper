import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, InstancedMesh, Mesh, MeshStandardMaterial } from 'three'
import { Color, Object3D } from 'three'
import { setRainAmbience } from '../audio'
import { currentWeather } from '../sim'
import { useGame } from '../store'
import { daylightFactor } from './daylight'
import { palette } from './palette'

const SKY_BASE: Record<string, string> = {
  sun: palette.sky,
  clouds: palette.skyDim,
  rain: '#87a0b4',
}
const NIGHT_SKY = new Color('#28324f')
const DAY_BG = new Color('#ead9c2')
const NIGHT_BG = new Color('#57506a')
const RAIN_DROPS = 110

export function WeatherSky() {
  const weather = useGame((s) => currentWeather(s.state, s.state.lastTickAt))
  const soundOn = useGame((s) => s.state.settings.sound)
  const scene = useThree((s) => s.scene)
  const skyMat = useRef<MeshStandardMaterial>(null)
  const sun = useRef<Mesh>(null)
  const clouds = useRef<Group>(null)
  const rain = useRef<InstancedMesh>(null)
  const drops = useRef<{ x: number; y: number; z: number; speed: number }[] | null>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const targetSky = useMemo(() => new Color(), [])
  const targetBg = useMemo(() => new Color(), [])
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    setRainAmbience(weather === 'rain' && soundOn)
    return () => setRainAmbience(false)
  }, [weather, soundOn])

  useFrame((_, delta) => {
    const daylight = daylightFactor(Date.now())
    const ease = Math.min(1, delta * 2)

    if (skyMat.current) {
      targetSky.set(SKY_BASE[weather]).lerp(NIGHT_SKY, 1 - daylight)
      skyMat.current.color.lerp(targetSky, ease)
    }
    if (scene.background instanceof Color) {
      targetBg.copy(DAY_BG).lerp(NIGHT_BG, 1 - daylight)
      scene.background.lerp(targetBg, ease)
    }
    if (sun.current) sun.current.visible = weather === 'sun' && daylight > 0.5
    if (clouds.current) {
      clouds.current.visible = weather !== 'sun'
      clouds.current.position.x = Math.sin(Date.now() / 9000) * 0.25
      clouds.current.children.forEach((cloud) => {
        const mesh = cloud as Mesh
        const mat = mesh.material as MeshStandardMaterial
        mat.color.lerp(new Color(weather === 'rain' ? '#8d99a6' : '#f2f4f0'), ease)
      })
    }

    const rainMesh = rain.current
    if (rainMesh) {
      const active = weather === 'rain' && !reduceMotion
      rainMesh.visible = active
      if (active) {
        if (!drops.current) {
          drops.current = Array.from({ length: RAIN_DROPS }, () => ({
            x: -1.15 + Math.random() * 2.3,
            y: 0.2 + Math.random() * 1.85,
            z: -0.465 + Math.random() * 0.02,
            speed: 1.6 + Math.random() * 0.8,
          }))
        }
        for (let i = 0; i < RAIN_DROPS; i++) {
          const drop = drops.current[i]
          drop.y -= drop.speed * delta
          if (drop.y < 0.18) drop.y = 2.02
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
      <mesh position={[0, 1.11, -0.5]}>
        <planeGeometry args={[2.5, 1.95]} />
        <meshStandardMaterial ref={skyMat} color={palette.sky} />
      </mesh>
      <mesh ref={sun} position={[-0.7, 1.6, -0.47]} rotation-z={0.5}>
        <boxGeometry args={[0.3, 0.3, 0.04]} />
        <meshStandardMaterial color={palette.sun} />
      </mesh>
      <group ref={clouds} position={[0.35, 1.55, -0.48]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.55, 0.18, 0.05]} />
          <meshStandardMaterial color="#f2f4f0" />
        </mesh>
        <mesh position={[-0.55, 0.22, 0]}>
          <boxGeometry args={[0.4, 0.15, 0.05]} />
          <meshStandardMaterial color="#f2f4f0" />
        </mesh>
        <mesh position={[-1.2, -0.12, 0]}>
          <boxGeometry args={[0.45, 0.16, 0.05]} />
          <meshStandardMaterial color="#f2f4f0" />
        </mesh>
      </group>
      <instancedMesh ref={rain} args={[undefined, undefined, RAIN_DROPS]} visible={false}>
        <boxGeometry args={[0.012, 0.09, 0.012]} />
        <meshStandardMaterial color="#7fa8c9" transparent opacity={0.65} />
      </instancedMesh>
    </group>
  )
}
