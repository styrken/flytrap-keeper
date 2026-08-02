// The pets: a metamorphosing tadpole on the desk, a greenhouse frog, the
// rainy-day cat, and the world's calmest snail. None of them have needs —
// the plants are the ones that need you. Pets are company, and they render
// on friend visits too (read-only, like everything else).
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { playCatch, playCroak, playMeow, playPurr } from '../audio'
import { SIM, catAtWindow, frogStage, snailAbout } from '../sim'
import { useIsVisiting, useSceneDispatch, useSceneState } from '../sceneView'
import type { RoomView } from '../store'
import { POT_SLOTS, plantsInRoom } from './plantLayout'

export function Pets({ room }: { room: RoomView }) {
  const pets = useSceneState((s) => s.pets)
  const now = useSceneState((s) => s.lastTickAt)
  const stage = frogStage(pets, now)

  if (room === 'greenhouse') {
    return stage >= 4 ? <Frog /> : null
  }
  return (
    <group>
      {pets.tadpoleSince !== null && stage < 4 && <TadpoleJar stage={stage} />}
      {pets.cat && <SleepingCat />}
      <WetCat />
      <SillSnail />
      {pets.snail && <SnailJar />}
    </group>
  )
}

/** A float label that pops near a pet for a moment. */
function useLabel(): [string | null, (text: string) => void] {
  const [label, setLabel] = useState<string | null>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const pop = (text: string) => {
    setLabel(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setLabel(null), 1100)
  }
  return [label, pop]
}

/* -------------------------------- tadpole jar -------------------------------- */

const JAR_GLASS = '#d8ecef'
const POND_WATER = '#7fb6c9'
const FROG_GREEN = '#69a844'
const FROG_BELLY = '#cfe3a8'

/** On the desk: egg dots → wiggling tadpole → legs → froglet on a stone. */
function TadpoleJar({ stage }: { stage: number }) {
  const swimmer = useRef<Group>(null)
  useFrame((frame) => {
    const g = swimmer.current
    if (!g) return
    const t = frame.clock.elapsedTime
    if (stage >= 3) {
      // the froglet sits on its stone, breathing
      g.position.set(0, 0.065, 0)
      g.scale.y = 1 + Math.sin(t * 3) * 0.05
      return
    }
    g.position.set(Math.sin(t * 1.3) * 0.035, 0.02 + Math.sin(t * 2.1) * 0.015, 0)
    g.rotation.y = Math.sin(t * 1.3) > 0 ? 0 : Math.PI
  })
  return (
    <group position={[3.25, -0.145, 1.15]}>
      {/* water first, glass last — transparency plays nicer that way */}
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.09, 8]} />
        <meshStandardMaterial color={POND_WATER} transparent opacity={0.55} flatShading />
      </mesh>
      {stage === 0 &&
        [-0.02, 0.015, 0].map((x, i) => (
          <mesh key={i} position={[x, 0.03 + i * 0.012, i * 0.015]}>
            <boxGeometry args={[0.018, 0.018, 0.018]} />
            <meshStandardMaterial color="#3c4436" />
          </mesh>
        ))}
      {stage >= 1 && (
        <group ref={swimmer} position={[0, 0.05, 0]}>
          <mesh>
            <boxGeometry args={[0.035, 0.026, 0.026]} />
            <meshStandardMaterial color={stage >= 3 ? FROG_GREEN : '#5a6b48'} />
          </mesh>
          {stage < 3 && (
            <mesh position={[-0.028, 0, 0]}>
              <boxGeometry args={[0.026, 0.012, 0.008]} />
              <meshStandardMaterial color="#5a6b48" />
            </mesh>
          )}
          {stage >= 2 && (
            <>
              <mesh position={[0.008, -0.016, 0.014]}>
                <boxGeometry args={[0.01, 0.014, 0.008]} />
                <meshStandardMaterial color={stage >= 3 ? FROG_GREEN : '#5a6b48'} />
              </mesh>
              <mesh position={[0.008, -0.016, -0.014]}>
                <boxGeometry args={[0.01, 0.014, 0.008]} />
                <meshStandardMaterial color={stage >= 3 ? FROG_GREEN : '#5a6b48'} />
              </mesh>
            </>
          )}
          {stage >= 3 && (
            <mesh position={[0.012, 0.016, 0]}>
              <boxGeometry args={[0.014, 0.012, 0.024]} />
              <meshStandardMaterial color={FROG_GREEN} />
            </mesh>
          )}
        </group>
      )}
      {stage >= 3 && (
        <mesh position={[0, 0.028, 0]}>
          <boxGeometry args={[0.05, 0.045, 0.05]} />
          <meshStandardMaterial color="#9b9284" flatShading />
        </mesh>
      )}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.16, 8]} />
        <meshStandardMaterial color={JAR_GLASS} transparent opacity={0.22} flatShading />
      </mesh>
    </group>
  )
}

/* ----------------------------------- frog ----------------------------------- */

/**
 * The grown frog lives in the greenhouse: on the tomato planter by default —
 * or beside a trumpet pitcher's pot, the way real frogs stake out real
 * pitcher plants to ambush their prey.
 */
function Frog() {
  const visiting = useIsVisiting()
  const plants = useSceneState((s) => s.plants)
  const [label, pop] = useLabel()
  const body = useRef<Group>(null)
  const hopAt = useRef(6)

  const benchMate = plantsInRoom(plants, 'greenhouse').findIndex(
    (plant) => plant.speciesId === 'sarracenia' && !plant.dead,
  )
  const spot: [number, number, number] =
    benchMate >= 0
      ? [POT_SLOTS[benchMate][0] + 0.5, 0.06, POT_SLOTS[benchMate][2] + 0.16]
      : [-2.45, -0.6, -0.42]

  useFrame((frame) => {
    const g = body.current
    if (!g) return
    const t = frame.clock.elapsedTime
    // a little idle hop every now and then; otherwise just breathe
    const sinceHop = t - hopAt.current
    if (sinceHop > 8 + (hopAt.current % 5)) hopAt.current = t
    const hop = sinceHop >= 0 && sinceHop < 0.4 ? Math.sin((sinceHop / 0.4) * Math.PI) : 0
    g.position.y = hop * 0.09
    g.scale.y = 1 + Math.sin(t * 2.6) * 0.04 + hop * 0.15
  })

  return (
    <group
      position={spot}
      onPointerDown={(e) => {
        if (visiting) return
        e.stopPropagation()
        playCroak()
        pop('🐸')
      }}
      onPointerOver={() => {
        if (!visiting) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <group ref={body}>
        <mesh position={[0, 0.045, 0]}>
          <boxGeometry args={[0.13, 0.09, 0.11]} />
          <meshStandardMaterial color={FROG_GREEN} />
        </mesh>
        <mesh position={[0, 0.02, 0.045]}>
          <boxGeometry args={[0.1, 0.05, 0.03]} />
          <meshStandardMaterial color={FROG_BELLY} />
        </mesh>
        {[-0.04, 0.04].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.1, 0.025]}>
              <boxGeometry args={[0.035, 0.035, 0.035]} />
              <meshStandardMaterial color={FROG_GREEN} />
            </mesh>
            <mesh position={[x, 0.105, 0.045]}>
              <boxGeometry args={[0.016, 0.016, 0.01]} />
              <meshStandardMaterial color="#26221c" />
            </mesh>
            <mesh position={[x + (x < 0 ? -0.035 : 0.035), 0.015, 0.02]}>
              <boxGeometry args={[0.045, 0.03, 0.05]} />
              <meshStandardMaterial color="#578c38" />
            </mesh>
          </group>
        ))}
      </group>
      {label && (
        <Html position={[0, 0.28, 0]} center zIndexRange={[10, 0]}>
          <div className="float-label">{label}</div>
        </Html>
      )}
    </group>
  )
}

/* ----------------------------------- cat ------------------------------------ */

const CAT_GREY = '#8a8a94'
const CAT_DARK = '#6e6e78'

/** Curled up on the bed, breathing slowly. Tap for a purr. */
function SleepingCat() {
  const visiting = useIsVisiting()
  const [label, pop] = useLabel()
  const body = useRef<Group>(null)
  useFrame((frame) => {
    const g = body.current
    if (g) g.scale.y = 1 + Math.sin(frame.clock.elapsedTime * 1.6) * 0.045
  })
  return (
    <group
      position={[-2.95, -0.41, 0.5]}
      onPointerDown={(e) => {
        if (visiting) return
        e.stopPropagation()
        playPurr()
        pop('💚')
      }}
      onPointerOver={() => {
        if (!visiting) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <group ref={body}>
        <mesh position={[0, 0.055, 0]}>
          <boxGeometry args={[0.34, 0.11, 0.24]} />
          <meshStandardMaterial color={CAT_GREY} />
        </mesh>
        {/* head resting on the body's edge */}
        <mesh position={[0.15, 0.11, 0.05]}>
          <boxGeometry args={[0.13, 0.1, 0.13]} />
          <meshStandardMaterial color={CAT_GREY} />
        </mesh>
        {[0.02, 0.08].map((z) => (
          <mesh key={z} position={[0.15, 0.175, z]}>
            <cylinderGeometry args={[0.004, 0.028, 0.045, 4]} />
            <meshStandardMaterial color={CAT_DARK} flatShading />
          </mesh>
        ))}
        {/* tail curled around the body */}
        <mesh position={[-0.16, 0.045, 0.1]} rotation-y={0.6}>
          <boxGeometry args={[0.2, 0.05, 0.05]} />
          <meshStandardMaterial color={CAT_DARK} />
        </mesh>
        {/* closed eyes — two sleepy lines */}
        {[0.015, 0.085].map((z) => (
          <mesh key={z} position={[0.215, 0.115, z]}>
            <boxGeometry args={[0.006, 0.008, 0.032]} />
            <meshStandardMaterial color="#3c3c44" />
          </mesh>
        ))}
      </group>
      {label && (
        <Html position={[0, 0.35, 0]} center zIndexRange={[10, 0]}>
          <div className="float-label">{label}</div>
        </Html>
      )}
    </group>
  )
}

/**
 * The rainy-day event: a soaked little cat sitting in the window opening,
 * meowing now and then. Tapping it lets it in (the HUD banner works too).
 */
function WetCat() {
  const dispatch = useSceneDispatch()
  const visiting = useIsVisiting()
  const waiting = useSceneState((s) => catAtWindow(s, s.lastTickAt))
  const sway = useRef<Group>(null)

  useEffect(() => {
    if (!waiting || visiting) return
    let timer = 0
    const meow = () => {
      playMeow()
      timer = window.setTimeout(meow, 9_000 + Math.random() * 9_000)
    }
    timer = window.setTimeout(meow, 2_500)
    return () => window.clearTimeout(timer)
  }, [waiting, visiting])

  useFrame((frame) => {
    const g = sway.current
    if (g) g.rotation.z = Math.sin(frame.clock.elapsedTime * 1.1) * 0.05
  })

  if (!waiting) return null
  return (
    <group
      position={[0.78, 0.17, -0.475]}
      onPointerDown={(e) => {
        if (visiting) return
        e.stopPropagation()
        dispatch({ type: 'letCatIn' })
        playMeow()
      }}
      onPointerOver={() => {
        if (!visiting) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <group ref={sway}>
        {/* sitting silhouette, darker for the soaked look */}
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.13, 0.18, 0.09]} />
          <meshStandardMaterial color="#565660" />
        </mesh>
        <mesh position={[0, 0.225, 0.005]}>
          <boxGeometry args={[0.11, 0.09, 0.08]} />
          <meshStandardMaterial color="#565660" />
        </mesh>
        {[-0.035, 0.035].map((x) => (
          <mesh key={x} position={[x, 0.285, 0]}>
            <cylinderGeometry args={[0.003, 0.024, 0.04, 4]} />
            <meshStandardMaterial color="#464650" flatShading />
          </mesh>
        ))}
        {/* big hopeful eyes catching the room's light */}
        {[-0.026, 0.026].map((x) => (
          <mesh key={x} position={[x, 0.23, 0.042]}>
            <boxGeometry args={[0.022, 0.028, 0.008]} />
            <meshStandardMaterial color="#e8e46a" emissive="#c8c24a" emissiveIntensity={0.6} />
          </mesh>
        ))}
        <mesh position={[0.09, 0.03, 0]} rotation-z={-0.5}>
          <boxGeometry args={[0.1, 0.035, 0.035]} />
          <meshStandardMaterial color="#464650" />
        </mesh>
      </group>
      {/* generous invisible hit area */}
      <mesh visible={false} position={[0, 0.15, 0]}>
        <boxGeometry args={[0.3, 0.4, 0.2]} />
        <meshStandardMaterial />
      </mesh>
    </group>
  )
}

/* ----------------------------------- snail ----------------------------------- */

const SNAIL_SHELL = '#c9873f'
const SNAIL_BODY = '#d8b98a'

/**
 * While it rains, a snail may come crawling across the sill — at a snail's
 * pace, naturally. Tap to lift it gently back outside (real slugs and snails
 * really do nibble carnivorous plants). Enough rescues and it moves in.
 */
function SillSnail() {
  const dispatch = useSceneDispatch()
  const visiting = useIsVisiting()
  const mayShow = useSceneState((s) => snailAbout(s, s.lastTickAt))
  const [crawling, setCrawling] = useState(false)
  const [label, setLabel] = useState<{ x: number } | null>(null)
  const group = useRef<Group>(null)
  const x = useRef(1.75)

  const active = mayShow && !visiting

  useEffect(() => {
    if (!active || crawling) return
    const timer = window.setTimeout(
      () => {
        x.current = 1.75
        setCrawling(true)
      },
      15_000 + Math.random() * 25_000,
    )
    return () => window.clearTimeout(timer)
  }, [active, crawling])

  useEffect(() => {
    if (!label) return
    const timer = window.setTimeout(() => setLabel(null), 1200)
    return () => window.clearTimeout(timer)
  }, [label])

  useFrame((frame, delta) => {
    if (!crawling) return
    if (!active) {
      setCrawling(false) // rain stopped (or it was adopted) — off it goes
      return
    }
    const g = group.current
    if (!g) return
    x.current -= delta * 0.012 // a snail's pace: the sill takes ~5 minutes
    if (x.current < -1.75) {
      setCrawling(false) // made it across — see you next rain
      return
    }
    g.position.x = x.current
    g.scale.x = 1 + Math.sin(frame.clock.elapsedTime * 2.2) * 0.06
  })

  return (
    <group>
      {crawling && (
        <group
          ref={group}
          position={[1.75, 0.06, 0.42]}
          onPointerDown={(e) => {
            if (visiting) return
            e.stopPropagation()
            dispatch({ type: 'rescueSnail' })
            playCatch()
            setLabel({ x: x.current })
            setCrawling(false)
          }}
          onPointerOver={() => {
            if (!visiting) document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <SnailShape />
          <mesh visible={false} position={[0, 0.04, 0]}>
            <boxGeometry args={[0.25, 0.2, 0.25]} />
            <meshStandardMaterial />
          </mesh>
        </group>
      )}
      {label && (
        <Html position={[label.x, 0.3, 0.42]} center zIndexRange={[10, 0]}>
          <div className="float-label">🐌 +{SIM.SNAIL_RESCUE_DEWDROPS} 🫧</div>
        </Html>
      )}
    </group>
  )
}

function SnailShape({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.018, 0]}>
        <boxGeometry args={[0.11, 0.03, 0.045]} />
        <meshStandardMaterial color={SNAIL_BODY} />
      </mesh>
      <mesh position={[-0.01, 0.055, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.038, 0.038, 0.04, 8]} />
        <meshStandardMaterial color={SNAIL_SHELL} flatShading />
      </mesh>
      <mesh position={[-0.01, 0.055, 0.021]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.018, 0.018, 0.004, 8]} />
        <meshStandardMaterial color="#a86a2e" flatShading />
      </mesh>
      {[-0.012, 0.012].map((z) => (
        <mesh key={z} position={[0.052, 0.05, z]} rotation-z={-0.25}>
          <boxGeometry args={[0.006, 0.035, 0.006]} />
          <meshStandardMaterial color={SNAIL_BODY} />
        </mesh>
      ))}
    </group>
  )
}

/** The kept snail's jar on the desk — air holes included, hurry not. */
function SnailJar() {
  const visiting = useIsVisiting()
  const [label, pop] = useLabel()
  return (
    <group
      position={[3.25, -0.145, -0.05]}
      onPointerDown={(e) => {
        if (visiting) return
        e.stopPropagation()
        pop('🐌💤')
      }}
      onPointerOver={() => {
        if (!visiting) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.15, 0.02, 0.15]} />
        <meshStandardMaterial color="#8a9a58" />
      </mesh>
      <group position={[0, 0.02, 0]}>
        <SnailShape scale={0.9} />
      </group>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.15, 8]} />
        <meshStandardMaterial color={JAR_GLASS} transparent opacity={0.22} flatShading />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.088, 0.088, 0.018, 8]} />
        <meshStandardMaterial color="#b0a894" flatShading />
      </mesh>
      {label && (
        <Html position={[0, 0.3, 0]} center zIndexRange={[10, 0]}>
          <div className="float-label">{label}</div>
        </Html>
      )}
    </group>
  )
}
