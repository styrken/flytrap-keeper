import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { hasMoved, onFirstMove } from '../scene/playerInput'
import { useGame } from '../store'

/**
 * A small "how do I walk?" hint over the scene. Disappears the moment the
 * player moves for the first time (or after a while on its own).
 */
export function MoveHint() {
  const { t } = useTranslation()
  const onboarding = useGame((s) => s.showOnboarding)
  const [dismissed, setDismissed] = useState(() => hasMoved())
  const [coarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )

  useEffect(() => onFirstMove(() => setDismissed(true)), [])

  useEffect(() => {
    if (onboarding || dismissed) return
    const timer = window.setTimeout(() => setDismissed(true), 15_000)
    return () => window.clearTimeout(timer)
  }, [onboarding, dismissed])

  if (onboarding || dismissed) return null
  return <p className="move-hint">🧭 {t(coarse ? 'scene.hintMoveTouch' : 'scene.hintMoveKeys')}</p>
}
