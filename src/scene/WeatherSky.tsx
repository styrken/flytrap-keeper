import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group, InstancedMesh, Mesh, MeshStandardMaterial } from 'three'
import { Color, Object3D } from 'three'
import { playCatch, playToast, setRainAmbience } from '../audio'
import { currentWeather, isFireflyNight } from '../sim'
import {
  luckLabel,
  luckLeftNow,
  sceneNow,
  useIsVisiting,
  useRewardDispatch,
  useSceneDispatch,
  useSceneState,
} from '../sceneView'
import { useGame } from '../store'
import { daylightFactor } from './daylight'
import { palette } from './palette'

/** True after dusk — polled so React trees (timers, mounts) can follow the clock. */
function useNight(threshold = 0.5): boolean {
  const [night, setNight] = useState(() => daylightFactor(sceneNow()) < threshold)
  useEffect(() => {
    // 5s keeps up even when speed mode races the game clock through a night.
    const id = window.setInterval(() => setNight(daylightFactor(sceneNow()) < threshold), 5_000)
    return () => window.clearInterval(id)
  }, [threshold])
  return night
}

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
      <NightSky clear={weather === 'sun'} raining={weather === 'rain'} />
    </group>
  )
}

/* --------------------------------- night life --------------------------------- */

/** Hand-placed stars on the window sky — no randomness, so HMR and tests agree. */
const STARS: [number, number][] = [
  [-1.05, 1.86],
  [-0.72, 1.52],
  [-0.98, 1.12],
  [-0.45, 1.9],
  [-0.2, 1.38],
  [0.05, 1.75],
  [0.34, 1.24],
  [0.55, 1.88],
  [0.82, 1.5],
  [1.05, 1.05],
  [0.95, 1.92],
  [-0.6, 0.72],
  [0.25, 0.62],
  [0.72, 0.8],
]

/** Stars, the occasional shooting star, and fireflies on lucky summer nights. */
function NightSky({ clear, raining }: { clear: boolean; raining: boolean }) {
  const night = useNight()
  return (
    <group>
      {night && clear && <Stars />}
      {night && clear && <ShootingStar />}
      {night && !raining && <Fireflies />}
    </group>
  )
}

function Stars() {
  const twinkle = useRef<Group>(null)
  useFrame((frame) => {
    const g = twinkle.current
    if (!g) return
    g.children.forEach((star, i) => {
      const s = 0.8 + Math.abs(Math.sin(frame.clock.elapsedTime * 0.9 + i * 1.7)) * 0.5
      star.scale.setScalar(s)
    })
  })
  return (
    <group ref={twinkle}>
      {STARS.map(([x, y], i) => (
        <mesh key={i} position={[x, y, -0.46]}>
          <boxGeometry args={[0.028, 0.028, 0.01]} />
          <meshStandardMaterial color="#fdf6dd" emissive="#f2e6b8" emissiveIntensity={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * A rare streak across the window — tap it to make a wish (a few dewdrops).
 * Same trust model as the golden drop: the view decides when one appears,
 * the sim bounds how often a wish can pay out.
 */
function ShootingStar() {
  const rewardDispatch = useRewardDispatch()
  const visiting = useIsVisiting()
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const active = !visiting && !reduceMotion
  const [star, setStar] = useState<{ id: number; x0: number; y0: number } | null>(null)
  const [label, setLabel] = useState<{ x: number; y: number; text: string } | null>(null)
  const group = useRef<Group>(null)
  const age = useRef(0)
  // Synchronous, so a burst of taps (extra fingers!) claims the star once —
  // state alone flips too late to stop the second pointer event.
  const claimed = useRef(false)

  useEffect(() => {
    if (!active || star) return
    const timer = window.setTimeout(
      () => {
        age.current = 0
        claimed.current = false
        setStar({ id: Date.now(), x0: 0.55 + Math.random() * 0.5, y0: 1.75 + Math.random() * 0.2 })
      },
      25_000 + Math.random() * 65_000,
    )
    return () => window.clearTimeout(timer)
  }, [active, star])

  useEffect(() => {
    if (!label) return
    const timer = window.setTimeout(() => setLabel(null), 1400)
    return () => window.clearTimeout(timer)
  }, [label])

  useFrame((_, delta) => {
    if (!star || !group.current) return
    age.current += delta
    const x = star.x0 - age.current * 1.35
    const y = star.y0 - age.current * 0.5
    group.current.position.set(x, y, -0.455)
    if (x < -1.15 || y < 0.35) setStar(null) // burned out — wish another time
  })

  return (
    <group>
      {star && (
        <group
          ref={group}
          position={[star.x0, star.y0, -0.455]}
          onPointerDown={(e) => {
            e.stopPropagation()
            if (claimed.current) return
            claimed.current = true
            const gained = rewardDispatch({ type: 'wishOnStar' })
            playToast()
            setLabel({
              x: group.current?.position.x ?? star.x0,
              y: group.current?.position.y ?? star.y0,
              text: luckLabel('🌠', gained, luckLeftNow('star'), '✨'),
            })
            setStar(null)
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <mesh>
            <boxGeometry args={[0.055, 0.055, 0.012]} />
            <meshStandardMaterial color="#fff7e0" emissive="#ffe9a8" emissiveIntensity={1.4} />
          </mesh>
          {/* tail pointing back along the flight path */}
          <mesh position={[0.16, 0.06, 0]} rotation-z={-0.35}>
            <boxGeometry args={[0.3, 0.02, 0.01]} />
            <meshStandardMaterial color="#f6e6b0" transparent opacity={0.55} />
          </mesh>
          {/* generous invisible hit area for phone thumbs */}
          <mesh visible={false}>
            <boxGeometry args={[0.42, 0.42, 0.2]} />
            <meshStandardMaterial />
          </mesh>
        </group>
      )}
      {label && (
        <Html position={[label.x, label.y + 0.12, -0.455]} center zIndexRange={[10, 0]}>
          <div className="float-label">{label.text}</div>
        </Html>
      )}
    </group>
  )
}

/** Blocky fireflies drifting past the window on deterministic summer nights. */
const FIREFLY_COUNT = 6

function Fireflies() {
  const seed = useSceneState((s) => s.rngSeed)
  const dispatch = useSceneDispatch()
  const group = useRef<Group>(null)
  const marked = useRef(false)
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  // Re-render on weather/night changes re-evaluates the calendar's verdict.
  const glowNight = isFireflyNight(seed, sceneNow())

  useEffect(() => {
    marked.current = false
  }, [glowNight])

  useFrame((frame) => {
    const g = group.current
    if (!g) return
    if (!marked.current) {
      // Tell the sim the player is watching — it re-checks the calendar.
      marked.current = true
      dispatch({ type: 'markFireflies' })
    }
    const t = reduceMotion ? 0 : frame.clock.elapsedTime
    g.children.forEach((firefly, i) => {
      const phase = i * 2.4
      firefly.position.set(
        -0.85 + (i % 3) * 0.75 + Math.sin(t * 0.5 + phase) * 0.28,
        0.62 + (i % 2) * 0.4 + Math.sin(t * 0.8 + phase * 2) * 0.16,
        -0.45,
      )
      const mesh = firefly as Mesh
      const mat = mesh.material as MeshStandardMaterial
      // Slow pulse like the real thing — mostly dim, then a bright blink.
      mat.emissiveIntensity = 0.25 + Math.max(0, Math.sin(t * 1.1 + phase * 3)) ** 3 * 1.6
    })
  })

  if (!glowNight) return null
  return (
    <group ref={group}>
      {Array.from({ length: FIREFLY_COUNT }, (_, i) => (
        <mesh key={i} position={[-0.85 + (i % 3) * 0.75, 0.62 + (i % 2) * 0.4, -0.45]}>
          <boxGeometry args={[0.035, 0.035, 0.012]} />
          <meshStandardMaterial color="#e6f0a0" emissive="#d8e86a" emissiveIntensity={0.4} />
        </mesh>
      ))}
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
  const rewardDispatch = useRewardDispatch()
  const visiting = useIsVisiting()
  const weather = useSceneState((s) => currentWeather(s, s.lastTickAt))
  const reduceMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const raining = weather === 'rain' && !reduceMotion && !visiting
  const [drop, setDrop] = useState<{ id: number; x: number } | null>(null)
  const [label, setLabel] = useState<{ x: number; y: number; text: string } | null>(null)
  const group = useRef<Group>(null)
  const y = useRef(area.yTop)
  // Synchronous, so a burst of taps (extra fingers!) claims the drop once —
  // state alone flips too late to stop the second pointer event.
  const claimed = useRef(false)

  useEffect(() => {
    if (!raining || drop) return
    const timer = window.setTimeout(
      () => {
        y.current = area.yTop
        claimed.current = false
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
            if (claimed.current) return
            claimed.current = true
            const gained = rewardDispatch({ type: 'catchRaindrop' })
            playCatch()
            setLabel({
              x: drop.x,
              y: y.current,
              text: luckLabel('💧', gained, luckLeftNow('raindrop')),
            })
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
          <div className="float-label">{label.text}</div>
        </Html>
      )}
    </group>
  )
}
