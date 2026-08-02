import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { Vector3 } from 'three'
import { playCatch, playOuch } from '../audio'
import { type InsectKind, INSECTS, SPECIES, insectKindFromRoll, isTrapReady } from '../sim'
import { type RoomView, gameNow, useGame } from '../store'
import { insectBus } from './insectBus'
import { plantsInRoom, trapApproachPoint } from './plantLayout'

const INSECT_STYLE: Record<InsectKind, { size: number; color: string; wing: string }> = {
  fly: { size: 1, color: '#3b3b3b', wing: '#bcd4de' },
  mosquito: { size: 0.65, color: '#6b6b6b', wing: '#d8e4ea' },
  spider: { size: 1.25, color: '#5a3a2e', wing: '#5a3a2e' },
  beetle: { size: 1.6, color: '#2e6b5a', wing: '#245448' },
}

interface FloatLabel {
  id: number
  text: string
  position: [number, number, number]
}

/** Any open trap on any healthy flytrap in the shown room, with its slot. */
function snapperTargets(room: RoomView) {
  const state = useGame.getState().state
  const now = gameNow()
  const targets: { plantId: string; trapIndex: number; slot: number; stage: number }[] = []
  plantsInRoom(state.plants, room).forEach((plant, slot) => {
    if (!SPECIES[plant.speciesId].isSnapper) return
    if (plant.wilted || plant.dormant || plant.dead) return
    plant.traps.forEach((trap, trapIndex) => {
      if (isTrapReady(trap, now)) {
        targets.push({ plantId: plant.id, trapIndex, slot, stage: plant.stage })
      }
    })
  })
  return targets
}

/** Mount with `key={room}` — switching rooms shoos the current guest out. */
export function Insects({ room }: { room: RoomView }) {
  const [visit, setVisit] = useState<{ id: number; kind: InsectKind } | null>(null)
  const [labels, setLabels] = useState<FloatLabel[]>([])
  const timers = useRef<number[]>([])
  const firstSpawn = useRef(true)

  const addLabel = (text: string, position: Vector3) => {
    const id = Date.now() + Math.random()
    setLabels((prev) => [
      ...prev.slice(-2),
      { id, text, position: [position.x, position.y + 0.12, position.z] },
    ])
    timers.current.push(
      window.setTimeout(() => setLabels((prev) => prev.filter((l) => l.id !== id)), 1400),
    )
  }

  // Spawn loop: one visiting insect at a time, with pauses between visits.
  useEffect(() => {
    if (visit) return
    const delay = firstSpawn.current ? 8_000 : 22_000 + Math.random() * 48_000
    firstSpawn.current = false
    const trySpawn = () => {
      if (document.visibilityState !== 'visible' || snapperTargets(room).length === 0) {
        timers.current.push(window.setTimeout(trySpawn, 20_000))
        return
      }
      setVisit({ id: Date.now(), kind: insectKindFromRoll(Math.random()) })
    }
    timers.current.push(window.setTimeout(trySpawn, delay))
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current = []
    }
  }, [visit, room])

  // The traps report a successful snap through the bus.
  useEffect(() => {
    insectBus.onCaught = () => {
      const presence = insectBus.presence
      if (!presence || presence.slot === null || presence.trapIndex === null) return
      const state = useGame.getState().state
      const stage = state.plants.find((p) => p.id === presence.plantId)?.stage ?? 0
      const point = trapApproachPoint(presence.slot, presence.trapIndex, stage)
      if (presence.kind === 'beetle') {
        playOuch()
        addLabel('💥', point)
      } else {
        playCatch()
        const def = INSECTS[presence.kind]
        addLabel(`+${def.nutrition} 🪰  +${def.dewdrops} 🫧`, point)
      }
      setVisit(null)
    }
    return () => {
      insectBus.onCaught = null
    }
  }, [])

  return (
    <group>
      {visit && (
        <InsectVisit key={visit.id} kind={visit.kind} room={room} onDone={() => setVisit(null)} />
      )}
      {labels.map((label) => (
        <Html key={label.id} position={label.position} center zIndexRange={[10, 0]}>
          <div className="float-label">{label.text}</div>
        </Html>
      ))}
    </group>
  )
}

const ENTRY = new Vector3(2.6, 1.5, 0.55)
const EXIT = new Vector3(-2.6, 2.1, 0.4)
const ROAM_CENTER = new Vector3(0, 1.05, 0.4)
const VISIT_SECONDS = 16

function InsectVisit({
  kind,
  room,
  onDone,
}: {
  kind: InsectKind
  room: RoomView
  onDone: () => void
}) {
  const group = useRef<Group>(null)
  const wings = useRef<Group>(null)
  const age = useRef(0)
  const approach = useRef<{
    plantId: string
    trapIndex: number
    slot: number
    until: number
  } | null>(null)
  const nextApproachAt = useRef(-1)
  const phase = useRef(-1)
  const target = useRef(new Vector3())
  const style = INSECT_STYLE[kind]

  useEffect(() => {
    insectBus.presence = { kind, plantId: null, trapIndex: null, slot: null }
    return () => {
      insectBus.presence = null
    }
  }, [kind])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    if (phase.current < 0) {
      // Randomize per-visit flight parameters outside render (lint: purity).
      phase.current = Math.random() * Math.PI * 2
      nextApproachAt.current = 2.5 + Math.random() * 2
    }
    age.current += delta
    const t = age.current
    const p = phase.current

    if (wings.current) wings.current.scale.y = 0.6 + Math.abs(Math.sin(t * 40)) * 0.8

    if (t < 2) {
      // fly in
      target.current.lerpVectors(ENTRY, ROAM_CENTER, t / 2)
    } else if (t > VISIT_SECONDS) {
      // leave; done once far out
      target.current.lerp(EXIT, Math.min(1, delta * 1.2))
      if (t > VISIT_SECONDS + 2.5) {
        onDone()
        return
      }
    } else if (approach.current && t < approach.current.until) {
      // hover in front of a trap — the catch window
      const { slot, trapIndex, plantId } = approach.current
      const stage =
        useGame.getState().state.plants.find((plant) => plant.id === plantId)?.stage ?? 0
      trapApproachPoint(slot, trapIndex, stage, target.current)
      target.current.x += Math.sin(t * 9 + p) * 0.03
      target.current.y += Math.cos(t * 7 + p) * 0.03
      if (insectBus.presence) {
        insectBus.presence.plantId = plantId
        insectBus.presence.trapIndex = trapIndex
        insectBus.presence.slot = slot
      }
    } else {
      // roam in loose loops around the sill
      if (insectBus.presence) {
        insectBus.presence.plantId = null
        insectBus.presence.trapIndex = null
        insectBus.presence.slot = null
      }
      if (approach.current && t >= approach.current.until) approach.current = null
      target.current.set(
        ROAM_CENTER.x + Math.sin(t * 0.9 + p) * 0.85,
        ROAM_CENTER.y + Math.sin(t * 1.4 + p * 2) * 0.35,
        ROAM_CENTER.z + Math.cos(t * 1.1 + p) * 0.25,
      )
      if (t >= nextApproachAt.current) {
        const targets = snapperTargets(room)
        if (targets.length > 0) {
          const pick = targets[Math.floor(Math.random() * targets.length)]
          approach.current = { ...pick, until: t + 1.6 }
        }
        nextApproachAt.current = t + 3.5 + Math.random() * 2.5
      }
    }

    g.position.lerp(target.current, Math.min(1, delta * 3.2))
    g.position.x += Math.sin(t * 13 + p) * 0.004
    g.position.y += Math.cos(t * 17 + p) * 0.004
  })

  return (
    <group ref={group} position={ENTRY.toArray()} scale={0.11 * style.size}>
      <mesh>
        <boxGeometry args={[0.9, 0.5, 0.5]} />
        <meshStandardMaterial color={style.color} />
      </mesh>
      <mesh position={[0.55, 0.08, 0]}>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshStandardMaterial color={style.color} />
      </mesh>
      <group ref={wings} position={[-0.05, 0.32, 0]}>
        <mesh position={[0, 0, 0.3]} rotation-x={0.5}>
          <boxGeometry args={[0.6, 0.06, 0.45]} />
          <meshStandardMaterial color={style.wing} transparent opacity={0.75} />
        </mesh>
        <mesh position={[0, 0, -0.3]} rotation-x={-0.5}>
          <boxGeometry args={[0.6, 0.06, 0.45]} />
          <meshStandardMaterial color={style.wing} transparent opacity={0.75} />
        </mesh>
      </group>
    </group>
  )
}
