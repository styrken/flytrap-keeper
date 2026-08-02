// The dollhouse trick, generalized. Side walls are single-sided planes and
// simply vanish when seen from outside, but solid backdrops — the bedroom's
// window wall, the garden facade — have real faces on both sides. This wrapper
// hides them the moment the orbit camera crosses to their far side, so a full
// 360° spin always looks INTO the scene instead of at the back of a wall.
import { useFrame } from '@react-three/fiber'
import { type ReactNode, useRef } from 'react'
import type { Group } from 'three'

/** Hides its children while the camera is behind the wall plane (z < behindZ). */
export function DollhouseWall({ behindZ, children }: { behindZ: number; children: ReactNode }) {
  const group = useRef<Group>(null)
  useFrame(({ camera }) => {
    const g = group.current
    if (g) g.visible = camera.position.z > behindZ
  })
  return <group ref={group}>{children}</group>
}
