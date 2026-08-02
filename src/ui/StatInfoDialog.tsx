import { useTranslation } from 'react-i18next'
import { activePlant, stageProgress } from '../sim'
import { type StatInfoId, useGame } from '../store'

const STAT_ICON: Record<StatInfoId, string> = {
  water: '💧',
  nutrition: '🪰',
  health: '❤️',
  humidity: '💨',
  growth: '🌱',
  barrel: '🛢️',
  dewdrops: '🫧',
}

/**
 * A little field guide to the HUD: tap any stat meter and this dialog says
 * what the number means and which actions move it.
 */
export function StatInfoDialog() {
  const { t } = useTranslation()
  const stat = useGame((s) => s.statInfo)
  const setStatInfo = useGame((s) => s.setStatInfo)
  const state = useGame((s) => s.state)
  if (!stat) return null

  const plant = activePlant(state)
  const label = stat === 'growth' ? t('stage.next') : t(`stats.${stat}`)
  const value = (() => {
    switch (stat) {
      case 'water':
        return plant?.water ?? null
      case 'nutrition':
        return plant?.nutrition ?? null
      case 'health':
        return plant?.health ?? null
      case 'humidity':
        return plant?.humidity ?? null
      case 'growth':
        return plant ? stageProgress(plant).fraction * 100 : null
      case 'barrel':
        return state.weather.rainBarrel
      case 'dewdrops':
        return null
    }
  })()

  return (
    <div className="dialog-backdrop" onClick={() => setStatInfo(null)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>
            {STAT_ICON[stat]} {label}
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setStatInfo(null)}
          >
            ✕
          </button>
        </header>
        {stat === 'dewdrops' ? (
          <p className="stat-info-value">🫧 {state.inventory.dewdrops}</p>
        ) : value !== null ? (
          <div className="stat-info-meter">
            <div className="bar">
              <div className={`fill ${stat}`} style={{ width: `${Math.round(value)}%` }} />
            </div>
            <span className="stat-info-pct">{Math.round(value)}%</span>
          </div>
        ) : null}
        <div className="dialog-section">
          <h3>{t('statInfo.whatTitle')}</h3>
          <p className="muted">{t(`statInfo.${stat}.what`)}</p>
        </div>
        <div className="dialog-section">
          <h3>{t('statInfo.howTitle')}</h3>
          <p className="muted">{t(`statInfo.${stat}.how`)}</p>
        </div>
      </div>
    </div>
  )
}
