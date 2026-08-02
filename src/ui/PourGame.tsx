import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SIM } from '../sim'

const PERFECT_ZONE = 0.07

/** A quick timing bar: stop the drop in the golden zone for a small bonus. */
export function PourGame({ onDone }: { onDone: (perfect: boolean) => void }) {
  const { t } = useTranslation()
  const [pos, setPos] = useState(0.5)
  const [result, setResult] = useState<'perfect' | 'good' | null>(null)
  const raf = useRef(0)
  const startedAt = useRef(0)
  const resolved = useRef(false)

  const resolve = (at: number | null) => {
    if (resolved.current) return
    resolved.current = true
    cancelAnimationFrame(raf.current)
    const perfect = at !== null && Math.abs(at - 0.5) < PERFECT_ZONE
    setResult(perfect ? 'perfect' : 'good')
    window.setTimeout(() => onDone(perfect), perfect ? 750 : 450)
  }
  const resolveRef = useRef(resolve)
  useEffect(() => {
    resolveRef.current = resolve
  })

  useEffect(() => {
    startedAt.current = performance.now()
    const loop = (now: number) => {
      setPos((Math.sin((now - startedAt.current) / 300) + 1) / 2)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    const timeout = window.setTimeout(() => resolveRef.current(null), 8000)
    return () => {
      cancelAnimationFrame(raf.current)
      window.clearTimeout(timeout)
    }
  }, [])

  return (
    <div className="dialog-backdrop">
      <div className="dialog-card pour-card">
        <h2>💧 {t('pour.title')}</h2>
        <p className="muted">{t('pour.hint')}</p>
        <div className="pour-bar">
          <div className="pour-zone" />
          <div className="pour-cursor" style={{ left: `${pos * 100}%` }} />
        </div>
        {result ? (
          <p className={`pour-result ${result}`}>
            {result === 'perfect'
              ? `✨ ${t('pour.perfect', { n: SIM.POUR_PERFECT_DEWDROPS })}`
              : `💧 ${t('pour.good')}`}
          </p>
        ) : (
          <>
            <button type="button" className="onboarding-start" onClick={() => resolve(pos)}>
              {t('pour.now')}
            </button>
            <button type="button" className="linklike" onClick={() => resolve(null)}>
              {t('pour.skip')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
