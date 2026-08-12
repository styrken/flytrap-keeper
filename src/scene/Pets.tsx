// The pets: a metamorphosing tadpole on the desk, a greenhouse frog, the
// rainy-day cat, and the world's calmest snail. None of them have needs —
// the plants are the ones that need you. Pets are company, and they render
// on friend visits too (read-only, like everything else).
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { playCatch, playChirp, playCroak, playMeow, playPet, playPurr, playSnuffle } from '../audio'
import {
  catAtWindow,
  currentWeather,
  frogStage,
  seasonAt,
  snailAbout,
  spiderAtCorner,
  webLootReady,
} from '../sim'
import {
  sceneNow,
  useIsVisiting,
  useRewardDispatch,
  useSceneDispatch,
  useSceneState,
} from '../sceneView'
import type { RoomView } from '../store'
import { daylightFactor } from './daylight'
import { POT_SLOTS, STAGE_SCALE, plantsInRoom } from './plantLayout'

export function Pets({ room }: { room: RoomView }) {
  const pets = useSceneState((s) => s.pets)
  const now = useSceneState((s) => s.lastTickAt)
  const items = useSceneState((s) => s.inventory.items)
  const stage = frogStage(pets, now)

  if (room === 'greenhouse') {
    return (
      <group>
        {stage >= 4 && <Frog />}
        <Hedgehog />
      </group>
    )
  }
  if (room === 'garden') {
    // The lawn has its own life: the night hedgehog, the ladybirds patrolling
    // the flower bed (their one and only home — none indoors), and rain-day
    // snails out on the grass.
    return (
      <group>
        <Hedgehog />
        <Ladybird stroll={FLOWER_LADYBIRD_STROLL} />
        <Ladybird stroll={EDGE_LADYBIRD_STROLL} />
        <GardenSnail lane={0} />
        <GardenSnail lane={1} />
      </group>
    )
  }
  return (
    <group>
      {pets.tadpoleSince !== null && stage < 4 && <TadpoleJar stage={stage} />}
      {pets.cat && <SleepingCat />}
      <WetCat />
      <SillSnail />
      {pets.snail && <SnailJar />}
      <CornerSpider />
      {items.includes('bird-feeder') && <BirdFeeder />}
      <Butterfly />
    </group>
  )
}

/** Daylight as React state (polled), so guest timers can follow the clock. */
function useDaytime(threshold = 0.6): boolean {
  const [day, setDay] = useState(() => daylightFactor(sceneNow()) >= threshold)
  useEffect(() => {
    const id = window.setInterval(() => setDay(daylightFactor(sceneNow()) >= threshold), 5_000)
    return () => window.clearInterval(id)
  }, [threshold])
  return day
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
  const rewardDispatch = useRewardDispatch()
  const visiting = useIsVisiting()
  const mayShow = useSceneState((s) => snailAbout(s, s.lastTickAt))
  const [crawling, setCrawling] = useState(false)
  const [label, setLabel] = useState<{ x: number; gained: number } | null>(null)
  const group = useRef<Group>(null)
  const x = useRef(1.75)
  // Synchronous one-shot guard: a burst of taps rescues this snail once.
  const claimed = useRef(false)

  const active = mayShow && !visiting

  useEffect(() => {
    if (!active || crawling) return
    // Quick enough that speed-mode weather can't outrun the snail entirely.
    const timer = window.setTimeout(
      () => {
        x.current = 1.75
        claimed.current = false
        setCrawling(true)
      },
      9_000 + Math.random() * 13_000,
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
            if (visiting || claimed.current) return
            e.stopPropagation()
            claimed.current = true // extra fingers can't rescue it twice
            const gained = rewardDispatch({ type: 'rescueSnail' })
            playCatch()
            setLabel({ x: x.current, gained })
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
          <div className="float-label">{label.gained > 0 ? `🐌 +${label.gained} 🫧` : '🐌 💚'}</div>
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

/** Crawl lanes across the lawn — [fromX, toX, z]; two lanes, opposite ways. */
const GARDEN_SNAIL_LANES: [number, number, number][] = [
  [2.7, -1.1, 2.05],
  [-2.4, 1.2, 4.35],
]
const GARDEN_SNAIL_Y = -0.885

/**
 * Rain brings the garden snails out onto the lawn — they only crawl while it
 * actually rains. Lifting one gently is the same rescue as on the sill (and
 * pays the same way, cooldown and all — the label tells the truth about it).
 */
function GardenSnail({ lane }: { lane: number }) {
  const rewardDispatch = useRewardDispatch()
  const visiting = useIsVisiting()
  const raining = useSceneState((s) => currentWeather(s, s.lastTickAt) === 'rain')
  const [crawling, setCrawling] = useState(false)
  const [label, setLabel] = useState<{ x: number; gained: number } | null>(null)
  const group = useRef<Group>(null)
  const [fromX, toX, z] = GARDEN_SNAIL_LANES[lane % GARDEN_SNAIL_LANES.length]
  const dir = Math.sign(toX - fromX)
  const x = useRef(fromX)
  // Synchronous one-shot guard: a burst of taps rescues this snail once.
  const claimed = useRef(false)

  const active = raining && !visiting

  useEffect(() => {
    if (!active || crawling) return
    // Staggered per lane, so the two never march in step — and unhurried,
    // since every rescue now pays: the pace lives here, in the spawn timer.
    const timer = window.setTimeout(
      () => {
        x.current = fromX
        claimed.current = false
        setCrawling(true)
      },
      14_000 + lane * 9_000 + Math.random() * 22_000,
    )
    return () => window.clearTimeout(timer)
  }, [active, crawling, fromX, lane])

  useEffect(() => {
    if (!label) return
    const timer = window.setTimeout(() => setLabel(null), 1200)
    return () => window.clearTimeout(timer)
  }, [label])

  useFrame((frame, delta) => {
    if (!crawling) return
    if (!active) {
      setCrawling(false) // rain over — back under a leaf somewhere
      return
    }
    const g = group.current
    if (!g) return
    x.current += dir * delta * 0.03 // garden distances, still a snail's pace
    if (dir > 0 ? x.current > toX : x.current < toX) {
      setCrawling(false) // made it across the lawn — until the next shower
      return
    }
    g.position.x = x.current
    g.scale.x = 1.7 * (1 + Math.sin(frame.clock.elapsedTime * 2.2 + lane * 2) * 0.06)
  })

  return (
    <group>
      {crawling && (
        <group
          ref={group}
          position={[fromX, GARDEN_SNAIL_Y, z]}
          scale={1.7}
          rotation-y={dir < 0 ? Math.PI : 0} /* eye stalks point the way it crawls */
          onPointerDown={(e) => {
            if (visiting || claimed.current) return
            e.stopPropagation()
            claimed.current = true // extra fingers can't rescue it twice
            const gained = rewardDispatch({ type: 'rescueSnail' })
            playCatch()
            setLabel({ x: x.current, gained })
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
        <Html position={[label.x, GARDEN_SNAIL_Y + 0.45, z]} center zIndexRange={[10, 0]}>
          <div className="float-label">{label.gained > 0 ? `🐌 +${label.gained} 🫧` : '🐌 💚'}</div>
        </Html>
      )}
    </group>
  )
}

/* ---------------------------------- spider ----------------------------------- */

const WEB_STRAND = '#f2efe4'
const SPIDER_DARK = '#4a3a30'

/** Thin radial strands fanning out of the corner, plus cross threads. */
function Web({ full }: { full: boolean }) {
  const angles = full ? [0.12, 0.5, 0.95, 1.32] : [0.35, 1.05]
  return (
    <group>
      {angles.map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.19, -Math.sin(a) * 0.19, 0]} rotation-z={-a}>
          <boxGeometry args={[0.38, 0.006, 0.006]} />
          <meshStandardMaterial color={WEB_STRAND} transparent opacity={0.55} />
        </mesh>
      ))}
      {full &&
        [0.16, 0.28].map((r) => (
          <mesh key={r} position={[Math.cos(0.72) * r, -Math.sin(0.72) * r, 0]} rotation-z={0.85}>
            <boxGeometry args={[r * 1.3, 0.005, 0.005]} />
            <meshStandardMaterial color={WEB_STRAND} transparent opacity={0.45} />
          </mesh>
        ))}
    </group>
  )
}

function SpiderShape({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh>
        <boxGeometry args={[0.05, 0.045, 0.045]} />
        <meshStandardMaterial color={SPIDER_DARK} />
      </mesh>
      <mesh position={[0, -0.032, 0.012]}>
        <boxGeometry args={[0.032, 0.028, 0.028]} />
        <meshStandardMaterial color={SPIDER_DARK} />
      </mesh>
      {[-0.034, 0.034].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.008, 0]} rotation-z={x < 0 ? 0.45 : -0.45}>
            <boxGeometry args={[0.045, 0.006, 0.03]} />
            <meshStandardMaterial color={SPIDER_DARK} />
          </mesh>
          <mesh position={[x, -0.012, 0]} rotation-z={x < 0 ? -0.35 : 0.35}>
            <boxGeometry args={[0.045, 0.006, 0.03]} />
            <meshStandardMaterial color={SPIDER_DARK} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * Autumn's corner tenant. While the trial web hangs, tapping it (or the HUD
 * banner) lets the spider stay. Settled, it keeps a fuller web and now and
 * then leaves a wrapped bug to collect — rent, paid in dewdrops.
 */
function CornerSpider() {
  const dispatch = useSceneDispatch()
  const rewardDispatch = useRewardDispatch()
  const visiting = useIsVisiting()
  const trial = useSceneState((s) => spiderAtCorner(s, s.lastTickAt))
  const settled = useSceneState((s) => s.pets.spider)
  const loot = useSceneState((s) => webLootReady(s, s.lastTickAt))
  const [label, pop] = useLabel()
  const dangle = useRef<Group>(null)

  useFrame((frame) => {
    const g = dangle.current
    if (!g) return
    const t = frame.clock.elapsedTime
    // trial spider bobs on its thread; the settled one abseils now and then
    g.position.y = settled
      ? -0.16 - Math.max(0, Math.sin(t * 0.22)) * 0.18
      : -0.3 + Math.sin(t * 1.4) * 0.03
  })

  if (!trial && !settled) return null
  return (
    <group
      position={[-3.42, 2.62, -0.44]}
      onPointerDown={(e) => {
        if (visiting) return
        e.stopPropagation()
        if (!settled) {
          dispatch({ type: 'adoptSpider' })
          playPet()
          pop('🕷️💚')
          return
        }
        if (loot) {
          const gained = rewardDispatch({ type: 'lootWeb' })
          playCatch()
          pop(gained > 0 ? `🕸️ +${gained} 🫧` : '🕷️ 💚')
        } else {
          playPet()
          pop('🕷️')
        }
      }}
      onPointerOver={() => {
        if (!visiting) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <Web full={settled} />
      {/* the thread it hangs from */}
      <mesh position={[0.13, -0.18, 0]}>
        <boxGeometry args={[0.004, 0.42, 0.004]} />
        <meshStandardMaterial color={WEB_STRAND} transparent opacity={0.5} />
      </mesh>
      <group ref={dangle} position={[0.13, -0.3, 0]}>
        <SpiderShape />
      </group>
      {settled && loot && (
        <mesh position={[0.3, -0.24, 0]} rotation-z={0.4}>
          <boxGeometry args={[0.035, 0.05, 0.035]} />
          <meshStandardMaterial color="#f6f1e6" emissive="#e8dfc0" emissiveIntensity={0.5} />
        </mesh>
      )}
      {/* generous invisible hit area */}
      <mesh visible={false} position={[0.1, -0.2, 0]}>
        <boxGeometry args={[0.55, 0.7, 0.25]} />
        <meshStandardMaterial />
      </mesh>
      {label && (
        <Html position={[0.1, 0.15, 0]} center zIndexRange={[10, 0]}>
          <div className="float-label">{label}</div>
        </Html>
      )}
    </group>
  )
}

/* --------------------------------- ladybird ---------------------------------- */

const LADYBIRD_RED = '#d24545'

/** Where a ladybird strolls: along x at fixed height/depth, then flies off. */
interface LadybirdStroll {
  xFrom: number
  xTo: number
  y: number
  z: number
  scale: number
  speed: number
}

/** Among the flowers on the bed under the big window — aphid country. */
const FLOWER_LADYBIRD_STROLL: LadybirdStroll = {
  xFrom: -3.5,
  xTo: -1.3,
  y: -0.53,
  z: -0.74,
  scale: 1.7,
  speed: 0.06,
}

/** Along the front edge of the same bed — its own pace, its own errands. */
const EDGE_LADYBIRD_STROLL: LadybirdStroll = {
  xFrom: -3.4,
  xTo: -1.4,
  y: -0.53,
  z: -0.62,
  scale: 1.7,
  speed: 0.045,
}

/**
 * The guest that is never a pet: a ladybird out in the garden, strolling the
 * flower bed (never in winter — they hibernate, and never indoors — the
 * garden is their home). Greeting it with a tap brings a spot of luck before
 * it flies off. The traps never get a say: gardeners' best friend, and
 * famously terrible-tasting anyway.
 */
function Ladybird({ stroll }: { stroll: LadybirdStroll }) {
  const rewardDispatch = useRewardDispatch()
  const visiting = useIsVisiting()
  const winter = useSceneState((s) => seasonAt(s.lastTickAt) === 'winter')
  const [strolling, setStrolling] = useState(false)
  const [label, setLabel] = useState<{ x: number; gained: number } | null>(null)
  const group = useRef<Group>(null)
  const x = useRef(stroll.xFrom)
  const leaving = useRef(false)
  const age = useRef(0)

  const active = !winter && !visiting

  useEffect(() => {
    if (!active || strolling) return
    const timer = window.setTimeout(
      () => {
        x.current = stroll.xFrom
        leaving.current = false
        age.current = 0
        setStrolling(true)
      },
      40_000 + Math.random() * 80_000,
    )
    return () => window.clearTimeout(timer)
  }, [active, strolling, stroll])

  useEffect(() => {
    if (!label) return
    const timer = window.setTimeout(() => setLabel(null), 1200)
    return () => window.clearTimeout(timer)
  }, [label])

  useFrame((frame, delta) => {
    if (!strolling) return
    if (!active) {
      setStrolling(false)
      return
    }
    const g = group.current
    if (!g) return
    age.current += delta
    if (leaving.current || age.current > 22) {
      // wings out — up and away in a little arc
      g.position.y += delta * 1.1
      g.position.x += delta * 0.5
      if (g.position.y > stroll.y + 1.6) setStrolling(false)
      return
    }
    x.current += delta * stroll.speed
    if (x.current > stroll.xTo) {
      leaving.current = true
      return
    }
    g.position.x = x.current
    g.position.y = stroll.y + Math.abs(Math.sin(frame.clock.elapsedTime * 9)) * 0.004 * stroll.scale
  })

  return (
    <group>
      {strolling && (
        <group
          ref={group}
          position={[stroll.xFrom, stroll.y, stroll.z]}
          scale={stroll.scale}
          onPointerDown={(e) => {
            if (visiting || leaving.current) return
            e.stopPropagation()
            const gained = rewardDispatch({ type: 'greetLadybird' })
            playCatch()
            setLabel({ x: x.current, gained })
            leaving.current = true
          }}
          onPointerOver={() => {
            if (!visiting) document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <mesh position={[0, 0.014, 0]}>
            <boxGeometry args={[0.055, 0.028, 0.045]} />
            <meshStandardMaterial color={LADYBIRD_RED} />
          </mesh>
          <mesh position={[0.032, 0.012, 0]}>
            <boxGeometry args={[0.02, 0.022, 0.032]} />
            <meshStandardMaterial color="#26221c" />
          </mesh>
          {[
            [-0.012, 0.014],
            [0.006, -0.014],
            [-0.018, -0.01],
          ].map(([dx, dz]) => (
            <mesh key={`${dx}:${dz}`} position={[dx, 0.03, dz]}>
              <boxGeometry args={[0.012, 0.004, 0.012]} />
              <meshStandardMaterial color="#26221c" />
            </mesh>
          ))}
          {/* generous invisible hit area */}
          <mesh visible={false} position={[0, 0.05, 0]}>
            <boxGeometry args={[0.22, 0.18, 0.22]} />
            <meshStandardMaterial />
          </mesh>
        </group>
      )}
      {label && (
        <Html
          position={[label.x, stroll.y + 0.28 * stroll.scale, stroll.z]}
          center
          zIndexRange={[10, 0]}
        >
          <div className="float-label">{label.gained > 0 ? `🐞 +${label.gained} 🫧` : '🐞 💚'}</div>
        </Html>
      )}
    </group>
  )
}

/* ------------------------------ robin & feeder ------------------------------- */

const ROBIN_BROWN = '#8a6a4e'
const ROBIN_RED = '#d2653c'

/**
 * A seed tray outside the window. On good days a robin drops by, pecks a
 * little, and sings when greeted — the friend that keeps visiting right
 * through winter, when everyone else is asleep.
 */
function BirdFeeder() {
  const rewardDispatch = useRewardDispatch()
  const visiting = useIsVisiting()
  const day = useDaytime()
  const [perched, setPerched] = useState(false)
  const [label, pop] = useLabel()
  const bird = useRef<Group>(null)
  const age = useRef(0)
  // One paid hello per perch — drumming on the tray is not twenty hellos.
  const greetedVisit = useRef(false)

  const active = day && !visiting

  useEffect(() => {
    if (!active || perched) return
    const timer = window.setTimeout(
      () => {
        age.current = 0
        greetedVisit.current = false
        setPerched(true)
      },
      35_000 + Math.random() * 65_000,
    )
    return () => window.clearTimeout(timer)
  }, [active, perched])

  useFrame((frame, delta) => {
    if (!perched) return
    if (!active) {
      setPerched(false)
      return
    }
    const g = bird.current
    if (!g) return
    age.current += delta
    if (age.current > 16) {
      // off it flies
      g.position.y += delta * 1.4
      g.position.x -= delta * 0.9
      if (g.position.y > 2.2) setPerched(false)
      return
    }
    // little hops along the tray, pecking in between
    const t = frame.clock.elapsedTime
    g.position.x = Math.sin(t * 0.7) * 0.05
    g.position.y = Math.abs(Math.sin(t * 5)) * 0.012
    g.rotation.x = Math.max(0, Math.sin(t * 2.3)) * 0.5 // peck
  })

  return (
    <group position={[-0.85, 0, -0.478]}>
      {/* post and tray */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.035, 0.4, 0.03]} />
        <meshStandardMaterial color="#7a5a3a" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.34, 0.03, 0.05]} />
        <meshStandardMaterial color="#9a7b52" />
      </mesh>
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0.535, 0]}>
          <boxGeometry args={[0.02, 0.04, 0.05]} />
          <meshStandardMaterial color="#7a5a3a" />
        </mesh>
      ))}
      {/* scattered seeds */}
      {[-0.07, 0.01, 0.08].map((x, i) => (
        <mesh key={x} position={[x, 0.518, 0.008 - i * 0.008]}>
          <boxGeometry args={[0.015, 0.008, 0.015]} />
          <meshStandardMaterial color="#e8c49a" />
        </mesh>
      ))}
      {perched && (
        <group
          position={[0, 0.53, 0]}
          onPointerDown={(e) => {
            if (visiting) return
            e.stopPropagation()
            // One hello pays per perch — after that it just keeps singing.
            if (greetedVisit.current) {
              playChirp()
              pop('🐦 🎶')
              return
            }
            greetedVisit.current = true
            const gained = rewardDispatch({ type: 'greetRobin' })
            playChirp()
            pop(gained > 0 ? `🐦 +${gained} 🫧` : '🐦 🎶')
          }}
          onPointerOver={() => {
            if (!visiting) document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <group ref={bird}>
            <mesh position={[0, 0.035, 0]}>
              <boxGeometry args={[0.075, 0.06, 0.05]} />
              <meshStandardMaterial color={ROBIN_BROWN} />
            </mesh>
            <mesh position={[0.032, 0.03, 0]}>
              <boxGeometry args={[0.03, 0.04, 0.044]} />
              <meshStandardMaterial color={ROBIN_RED} />
            </mesh>
            <mesh position={[0.028, 0.075, 0]}>
              <boxGeometry args={[0.04, 0.04, 0.04]} />
              <meshStandardMaterial color={ROBIN_BROWN} />
            </mesh>
            <mesh position={[0.055, 0.072, 0]}>
              <boxGeometry args={[0.018, 0.012, 0.012]} />
              <meshStandardMaterial color="#e8b23c" />
            </mesh>
            <mesh position={[-0.05, 0.05, 0]} rotation-z={0.5}>
              <boxGeometry args={[0.045, 0.014, 0.03]} />
              <meshStandardMaterial color="#6e5540" />
            </mesh>
          </group>
          {/* generous invisible hit area */}
          <mesh visible={false} position={[0, 0.06, 0]}>
            <boxGeometry args={[0.28, 0.24, 0.2]} />
            <meshStandardMaterial />
          </mesh>
        </group>
      )}
      {label && (
        <Html position={[0, 0.85, 0]} center zIndexRange={[10, 0]}>
          <div className="float-label">{label}</div>
        </Html>
      )}
    </group>
  )
}

/* --------------------------------- butterfly --------------------------------- */

const BUTTERFLY_WING = '#e0813c'
const BUTTERFLY_EDGE = '#5a4030'

/**
 * Spring and summer's visitor. It flutters around the sill — and if a plant
 * is blooming, it rests on the flower. That tall stalk is the whole point:
 * carnivorous plants lift their blooms high so their pollinators never end
 * up on the menu. Safe landing, always.
 */
function Butterfly() {
  const rewardDispatch = useRewardDispatch()
  const visiting = useIsVisiting()
  const day = useDaytime()
  const summery = useSceneState((s) => {
    const season = seasonAt(s.lastTickAt)
    return season === 'spring' || season === 'summer'
  })
  const plants = useSceneState((s) => s.plants)
  const [fluttering, setFluttering] = useState(false)
  const [label, pop] = useLabel()
  const group = useRef<Group>(null)
  const wingL = useRef<Group>(null)
  const wingR = useRef<Group>(null)
  const age = useRef(0)
  // One paid hello per flutter-by — the wings stay pettable regardless.
  const greetedVisit = useRef(false)

  const active = summery && day && !visiting

  // The safe landing spot: a blooming flytrap's flower, held high on its stalk.
  const bloomer = plantsInRoom(plants, 'bedroom').findIndex(
    (plant) => plant.speciesId === 'dionaea' && plant.flowering?.blooming,
  )
  const rest =
    bloomer >= 0
      ? ([
          POT_SLOTS[bloomer][0],
          POT_SLOTS[bloomer][1] +
            0.32 +
            0.74 * STAGE_SCALE[Math.min(plants[bloomer]?.stage ?? 3, STAGE_SCALE.length - 1)],
          POT_SLOTS[bloomer][2] - 0.05,
        ] as const)
      : null

  useEffect(() => {
    if (!active || fluttering) return
    const timer = window.setTimeout(
      () => {
        age.current = 0
        greetedVisit.current = false
        setFluttering(true)
      },
      30_000 + Math.random() * 70_000,
    )
    return () => window.clearTimeout(timer)
  }, [active, fluttering])

  useFrame((_, delta) => {
    if (!fluttering) return
    if (!active) {
      setFluttering(false)
      return
    }
    const g = group.current
    if (!g) return
    age.current += delta
    const t = age.current
    if (t > 26) {
      g.position.y += delta * 1.2
      if (g.position.y > 2.4) setFluttering(false)
      return
    }
    // resting spells on the bloom, flutter loops in between
    const resting = rest !== null && Math.sin(t * 0.35) > 0.55
    const flap = resting ? 0.15 : 0.95
    if (wingL.current) wingL.current.rotation.y = -Math.abs(Math.sin(t * 16)) * flap
    if (wingR.current) wingR.current.rotation.y = Math.abs(Math.sin(t * 16)) * flap
    if (resting && rest) {
      g.position.x += (rest[0] - g.position.x) * Math.min(1, delta * 3)
      g.position.y += (rest[1] + 0.05 - g.position.y) * Math.min(1, delta * 3)
      g.position.z += (rest[2] - g.position.z) * Math.min(1, delta * 3)
    } else {
      g.position.set(
        Math.sin(t * 0.6) * 0.9,
        1.0 + Math.sin(t * 1.1) * 0.3 + Math.sin(t * 5) * 0.03,
        0.3 + Math.cos(t * 0.8) * 0.25,
      )
    }
  })

  return (
    <group>
      {fluttering && (
        <group
          ref={group}
          position={[0, 1.0, 0.3]}
          onPointerDown={(e) => {
            if (visiting) return
            e.stopPropagation()
            // One hello pays per flutter-by; the rest is pure affection.
            if (greetedVisit.current) {
              playPet()
              pop('🦋 💚')
              return
            }
            greetedVisit.current = true
            const gained = rewardDispatch({ type: 'greetButterfly' })
            playPet()
            pop(gained > 0 ? `🦋 +${gained} 🫧` : '🦋 💚')
          }}
          onPointerOver={() => {
            if (!visiting) document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <mesh>
            <boxGeometry args={[0.014, 0.05, 0.014]} />
            <meshStandardMaterial color={BUTTERFLY_EDGE} />
          </mesh>
          <group ref={wingL}>
            <mesh position={[-0.035, 0.008, 0]}>
              <boxGeometry args={[0.06, 0.045, 0.006]} />
              <meshStandardMaterial color={BUTTERFLY_WING} />
            </mesh>
            <mesh position={[-0.028, -0.024, 0]}>
              <boxGeometry args={[0.04, 0.03, 0.006]} />
              <meshStandardMaterial color={BUTTERFLY_EDGE} />
            </mesh>
          </group>
          <group ref={wingR}>
            <mesh position={[0.035, 0.008, 0]}>
              <boxGeometry args={[0.06, 0.045, 0.006]} />
              <meshStandardMaterial color={BUTTERFLY_WING} />
            </mesh>
            <mesh position={[0.028, -0.024, 0]}>
              <boxGeometry args={[0.04, 0.03, 0.006]} />
              <meshStandardMaterial color={BUTTERFLY_EDGE} />
            </mesh>
          </group>
          {/* generous invisible hit area */}
          <mesh visible={false}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial />
          </mesh>
        </group>
      )}
      {label && (
        <Html position={[0, 1.55, 0.3]} center zIndexRange={[10, 0]}>
          <div className="float-label">{label}</div>
        </Html>
      )}
    </group>
  )
}

/* --------------------------------- hedgehog ---------------------------------- */

const HEDGEHOG_SPIKES = '#5e4a38'
const HEDGEHOG_FACE = '#c9a87e'

/**
 * After dark, a hedgehog trundles across the greenhouse lawn — snuffling for
 * slugs, doing the garden a quiet favour. It sleeps the winter away, so this
 * is a three-season guest.
 */
function Hedgehog() {
  const rewardDispatch = useRewardDispatch()
  const visiting = useIsVisiting()
  const night = !useDaytime(0.5)
  const awake = useSceneState((s) => seasonAt(s.lastTickAt) !== 'winter')
  const [trundling, setTrundling] = useState(false)
  const [label, setLabel] = useState<{ x: number; gained: number } | null>(null)
  const group = useRef<Group>(null)
  const x = useRef(4.6)
  // One paid hello per trundle across the lawn.
  const greetedVisit = useRef(false)

  const active = night && awake && !visiting

  useEffect(() => {
    if (!active || trundling) return
    const timer = window.setTimeout(
      () => {
        x.current = 4.6
        greetedVisit.current = false
        setTrundling(true)
      },
      20_000 + Math.random() * 55_000,
    )
    return () => window.clearTimeout(timer)
  }, [active, trundling])

  useEffect(() => {
    if (!label) return
    const timer = window.setTimeout(() => setLabel(null), 1200)
    return () => window.clearTimeout(timer)
  }, [label])

  useFrame((frame, delta) => {
    if (!trundling) return
    if (!active) {
      setTrundling(false)
      return
    }
    const g = group.current
    if (!g) return
    x.current -= delta * 0.22
    if (x.current < -4.8) {
      setTrundling(false)
      return
    }
    g.position.x = x.current
    g.position.y = -0.885 + Math.abs(Math.sin(frame.clock.elapsedTime * 6)) * 0.008
    g.rotation.z = Math.sin(frame.clock.elapsedTime * 6) * 0.03
  })

  return (
    <group>
      {trundling && (
        <group
          ref={group}
          position={[4.6, -0.885, 3.85]}
          onPointerDown={(e) => {
            if (visiting) return
            e.stopPropagation()
            // One hello pays per trundle; after that it just snuffles along.
            if (greetedVisit.current) {
              playSnuffle()
              setLabel({ x: x.current, gained: 0 })
              return
            }
            greetedVisit.current = true
            const gained = rewardDispatch({ type: 'greetHedgehog' })
            playSnuffle()
            setLabel({ x: x.current, gained })
          }}
          onPointerOver={() => {
            if (!visiting) document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <mesh position={[0, 0.075, 0]}>
            <boxGeometry args={[0.26, 0.15, 0.17]} />
            <meshStandardMaterial color={HEDGEHOG_SPIKES} />
          </mesh>
          {/* spiky back rows */}
          {[-0.07, 0, 0.07].map((dx, i) => (
            <mesh key={dx} position={[dx, 0.155, i % 2 === 0 ? 0.03 : -0.03]} rotation-z={0.2}>
              <boxGeometry args={[0.05, 0.05, 0.1]} />
              <meshStandardMaterial color="#4c3a2a" />
            </mesh>
          ))}
          {/* pale snout, nose and feet */}
          <mesh position={[-0.15, 0.05, 0]} rotation-z={0.18}>
            <boxGeometry args={[0.09, 0.07, 0.1]} />
            <meshStandardMaterial color={HEDGEHOG_FACE} />
          </mesh>
          <mesh position={[-0.2, 0.035, 0]}>
            <boxGeometry args={[0.025, 0.025, 0.025]} />
            <meshStandardMaterial color="#3c2f24" />
          </mesh>
          {[-0.08, 0.08].map((dx) => (
            <mesh key={dx} position={[dx, 0.008, 0.06]}>
              <boxGeometry args={[0.05, 0.02, 0.03]} />
              <meshStandardMaterial color={HEDGEHOG_FACE} />
            </mesh>
          ))}
          {/* generous invisible hit area */}
          <mesh visible={false} position={[0, 0.12, 0]}>
            <boxGeometry args={[0.5, 0.4, 0.4]} />
            <meshStandardMaterial />
          </mesh>
        </group>
      )}
      {label && (
        <Html position={[label.x, -0.5, 3.85]} center zIndexRange={[10, 0]}>
          <div className="float-label">{label.gained > 0 ? `🦔 +${label.gained} 🫧` : '🦔 💚'}</div>
        </Html>
      )}
    </group>
  )
}
