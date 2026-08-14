import { useTranslation } from 'react-i18next'
import { SIM, adventDayAt, adventGift, adventOpened } from '../sim'
import { gameNow, useGame } from '../store'

/**
 * December's advent calendar: twenty-four doors, one per day, and missed
 * doors patiently keep — catching up is half the tradition. Each holds a
 * little something; the sim pays and remembers.
 */
export function AdventDialog() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showAdvent)
  const setShow = useGame((s) => s.setShowAdvent)
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  if (!show) return null

  const now = gameNow()
  const latest = adventDayAt(now)
  if (latest === 0) return null
  const opened = new Set(adventOpened(state, now))

  return (
    <div className="dialog-backdrop" onClick={() => setShow(false)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>🎄 {t('advent.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setShow(false)}
          >
            ✕
          </button>
        </header>
        <p className="muted">{t('advent.hint')}</p>
        <div className="advent-grid">
          {Array.from({ length: 24 }, (_, i) => {
            const day = i + 1
            if (opened.has(day)) {
              return (
                <div key={day} className="advent-door open" aria-label={t('advent.day', { day })}>
                  <span className="advent-day">{day}</span>
                  <span>🫧 {adventGift(day)}</span>
                </div>
              )
            }
            if (day <= latest) {
              return (
                <button
                  key={day}
                  type="button"
                  className="advent-door waiting"
                  aria-label={t('advent.day', { day })}
                  onClick={() => dispatch({ type: 'openAdventDoor', day })}
                >
                  <span className="advent-day">{day}</span>
                  <span>🎁</span>
                </button>
              )
            }
            return (
              <div
                key={day}
                className="advent-door locked"
                aria-label={t('advent.day', { day })}
                title={t('advent.locked')}
              >
                <span className="advent-day">{day}</span>
                <span>❄️</span>
              </div>
            )
          })}
        </div>
        {opened.size >= 24 && (
          <p className="muted">🌟 {t('advent.done', { n: SIM.ACHIEVEMENT_DEWDROPS })}</p>
        )}
      </div>
    </div>
  )
}
