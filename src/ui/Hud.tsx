import { useTranslation } from 'react-i18next'
import { activePlant, firstReadyTrap, mood, readyTrapCount, stageProgress } from '../sim'
import { useGame } from '../store'
import { Meter } from './Meter'

const MOOD_ICON = { happy: '😊', thirsty: '🥵', hungry: '😋', wilted: '🥀' } as const

export function Hud() {
  const { t } = useTranslation()
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const plant = activePlant(state)
  if (!plant) return null

  const now = state.lastTickAt
  const ready = readyTrapCount(plant, now)
  const progress = stageProgress(plant)

  return (
    <div className="hud">
      <header className="hud-top">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="tagline">
            {plant.nickname} · {t(`stage.${plant.stage}`)} {MOOD_ICON[mood(plant)]}
          </p>
        </div>
        <div className="meters">
          <Meter icon="💧" label={t('stats.water')} value={plant.water} kind="water" />
          <Meter icon="🪰" label={t('stats.nutrition')} value={plant.nutrition} kind="nutrition" />
          <Meter icon="❤️" label={t('stats.health')} value={plant.health} kind="health" />
          <Meter icon="🌱" label={t('stage.next')} value={progress.fraction * 100} kind="growth" />
        </div>
      </header>

      {plant.wilted && <p className="banner">{t('status.wilted', { name: plant.nickname })}</p>}

      <footer className="hud-bottom">
        <p className="hint">{t('scene.hintSnap')}</p>
        <div className="actions">
          <button
            type="button"
            onClick={() => dispatch({ type: 'water' })}
            disabled={plant.water >= 99.5}
          >
            💧 {t('actions.water')}
          </button>
          <button
            type="button"
            onClick={() => {
              const trap = firstReadyTrap(plant, Date.now())
              if (trap) dispatch({ type: 'feedTrap', trapId: trap.id })
            }}
            disabled={ready === 0}
          >
            🪰 {t('actions.feed')}
            {ready > 0 && <span className="badge">{ready}</span>}
          </button>
          <div className="segmented" role="group" aria-label={t('actions.spot')}>
            <button
              type="button"
              className={plant.placement === 'south-window' ? 'active' : ''}
              onClick={() => dispatch({ type: 'move', placement: 'south-window' })}
            >
              ☀️ {t('placement.south-window')}
            </button>
            <button
              type="button"
              className={plant.placement === 'north-window' ? 'active' : ''}
              onClick={() => dispatch({ type: 'move', placement: 'north-window' })}
            >
              ⛅ {t('placement.north-window')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
