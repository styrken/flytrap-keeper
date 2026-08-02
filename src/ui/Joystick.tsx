import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { queueJump, setJoystick } from '../scene/playerInput'

const DEAD_ZONE = 0.18

/**
 * On-screen controls for walking and jumping on touch devices: a thumbstick
 * on the left, a Hop button on the right. Only renders on coarse pointers;
 * keyboard players never see them. Writes into the shared player-input
 * state, which the avatar reads every frame.
 */
export function TouchControls() {
  const [coarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  if (!coarse) return null
  return (
    <>
      <Joystick />
      <JumpButton />
    </>
  )
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)

  // If the joystick unmounts mid-drag, don't leave the avatar walking.
  useEffect(() => () => setJoystick(0, 0), [])

  const moveKnob = (dx: number, dy: number) => {
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
  }

  const track = (clientX: number, clientY: number) => {
    const el = base.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const max = rect.width / 2 - 10
    let dx = clientX - (rect.left + rect.width / 2)
    let dy = clientY - (rect.top + rect.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > max) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    moveKnob(dx, dy)
    const mag = Math.hypot(dx / max, dy / max)
    if (mag < DEAD_ZONE) {
      setJoystick(0, 0)
      return
    }
    const scale = (mag - DEAD_ZONE) / (1 - DEAD_ZONE) / mag
    // Screen up = forward, so the y-axis flips.
    setJoystick((dx / max) * scale, (-dy / max) * scale)
  }

  const release = (pointerId: number) => {
    if (activePointer.current !== pointerId) return
    activePointer.current = null
    moveKnob(0, 0)
    setJoystick(0, 0)
  }

  return (
    <div
      ref={base}
      className="joystick"
      role="presentation"
      onPointerDown={(e) => {
        activePointer.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        track(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (activePointer.current === e.pointerId) track(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
    >
      <div ref={knob} className="joystick-knob" />
    </div>
  )
}

function JumpButton() {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className="jump-btn"
      aria-label={t('actions.jump')}
      onPointerDown={(e) => {
        e.preventDefault()
        queueJump()
      }}
    >
      {t('actions.jump')}
    </button>
  )
}
