// The dollhouse trick, generalized. Side walls are single-sided planes and
// simply vanish when seen from outside, but solid backdrops — the bedroom's
// window wall, the garden facade — have real faces on both sides. This wrapper
// hides them the moment the orbit camera crosses to their far side, so a full
// 360° spin always looks INTO the scene instead of at the back of a wall.
import { useFrame } from '@react-three/fiber'
import { type ReactNode, useRef } from 'react'
import type { Group } from 'three'

/**
 * Hides its children while the camera is outside the z = `z` wall plane.
 * `outside` names the wall's far side: 'north' (hidden while camera z < z —
 * the window wall, the garden facade) or 'south' (hidden while camera z > z —
 * the bedroom's fourth wall, on stage only when the camera looks back).
 */
export function DollhouseWall({
  z,
  outside = 'north',
  children,
}: {
  z: number
  outside?: 'north' | 'south'
  children: ReactNode
}) {
  const group = useRef<Group>(null)
  useFrame(({ camera }) => {
    const g = group.current
    if (g) g.visible = outside === 'north' ? camera.position.z > z : camera.position.z < z
  })
  return <group ref={group}>{children}</group>
}
