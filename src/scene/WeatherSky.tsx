import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group, InstancedMesh, Mesh, MeshStandardMaterial } from 'three'
import { Color, Object3D } from 'three'
import { playCatch, setRainAmbience } from '../audio'
import { SIM, currentWeather } from '../sim'
import { sceneNow, useIsVisiting, useSceneDispatch, useSceneState } from '../sceneView'
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

/**
 * Room-independent atmosphere: the canvas background follows the displayed
 * garden's day/night, and the rain ambience follows its weather (with the
 * local device's sound setting). Mounted once, whichever room is on stage.
 */
export function SkyMood() {
  const weather = useSceneState((s) => currentWeather(s, s.lastTickAt))
  const soundOn = useGame((s) => s.state.settings.sound)
  const scene = useThree((s) => s.scene)
  const targetBg = useMemo(() => new Color(), [])

  useEffect(() => {
    setRainAmbience(weather === 'rain' && soundOn)
    return () => setRainAmbience(false)
  }, [weather, soundOn])

  useFrame((_, delta) => {
    if (scene.background instanceof Color) {
      const daylight = daylightFactor(sceneNow())
      targetBg.copy(DAY_BG).lerp(NIGHT_BG, 1 - daylight)
      scene.background.lerp(targetBg, Math.min(1, delta * 2))
    }
  })
  return null
}

/** The weather as seen through the bedroom window. */
export function WeatherSky() {
  const weather = useSceneState((s) => currentWeather(s, s.lastTickAt))
  const skyMat = useRef<MeshStandardMaterial>(null)
  const sun = useRef<Mesh>(null)
  const clouds = useRef<Group>(null)
  const rain = useRef<InstancedMesh>(null)
  const drops = useRef<{ x: number; y: number; z: number; speed: number }[] | null>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const targetSky = useMemo(() => new Color(), [])
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useFrame((_, delta) => {
    const daylight = daylightFactor(sceneNow())
    const ease = Math.min(1, delta * 2)

    if (skyMat.current) {
      targetSky.set(SKY_BASE[weather]).lerp(NIGHT_SKY, 1 - daylight)
      skyMat.current.color.lerp(targetSky, ease)
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
      <GoldenDrop area={{ x0: -1.05, x1: 1.05, z: -0.45, yTop: 2.0, yBottom: 0.2 }} />
    </group>
  )
}

export interface DropArea {
  x0: number
  x1: number
  z: number
  yTop: number
  yBottom: number
}

/**
 * A shiny raindrop worth catching before it lands — rain-only minigame.
 * The area says where it falls: down the window pane, or in through the
 * greenhouse roof vent. Guests don't get to catch them.
 */
export function GoldenDrop({ area }: { area: DropArea }) {
  const dispatch = useSceneDispatch()
  const visiting = useIsVisiting()
  const weather = useSceneState((s) => currentWeather(s, s.lastTickAt))
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const raining = weather === 'rain' && !reduceMotion && !visiting
  const [drop, setDrop] = useState<{ id: number; x: number } | null>(null)
  const [label, setLabel] = useState<{ x: number; y: number } | null>(null)
  const group = useRef<Group>(null)
  const y = useRef(area.yTop)

  useEffect(() => {
    if (!raining || drop) return
    const timer = window.setTimeout(
      () => {
        y.current = area.yTop
        setDrop({ id: Date.now(), x: area.x0 + Math.random() * (area.x1 - area.x0) })
      },
      7000 + Math.random() * 13000,
    )
    return () => window.clearTimeout(timer)
  }, [raining, drop, area])

  useEffect(() => {
    if (!label) return
    const timer = window.setTimeout(() => setLabel(null), 1200)
    return () => window.clearTimeout(timer)
  }, [label])

  useFrame((_, delta) => {
    if (!raining && drop) {
      setDrop(null)
      return
    }
    if (!drop || !group.current) return
    y.current -= delta * 0.4
    group.current.position.y = y.current
    if (y.current < area.yBottom) setDrop(null) // missed — it just joins the rain
  })

  return (
    <group>
      {drop && raining && (
        <group
          ref={group}
          position={[drop.x, area.yTop, area.z]}
          onPointerDown={(e) => {
            e.stopPropagation()
            dispatch({ type: 'catchRaindrop' })
            playCatch()
            setLabel({ x: drop.x, y: y.current })
            setDrop(null)
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <mesh>
            <boxGeometry args={[0.07, 0.11, 0.05]} />
            <meshStandardMaterial color="#f4c542" emissive="#e8a820" emissiveIntensity={0.65} />
          </mesh>
          {/* generous invisible hit area for phone thumbs */}
          <mesh visible={false}>
            <boxGeometry args={[0.3, 0.34, 0.2]} />
            <meshStandardMaterial />
          </mesh>
        </group>
      )}
      {label && (
        <Html position={[label.x, label.y + 0.1, area.z]} center zIndexRange={[10, 0]}>
          <div className="float-label">+{SIM.RAINDROP_DEWDROPS} 🫧</div>
        </Html>
      )}
    </group>
  )
}
