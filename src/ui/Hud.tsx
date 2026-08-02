import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { playSplash, playToast } from '../audio'
import {
  SIM,
  activePlant,
  currentWeather,
  firstReadyTrap,
  mood,
  readyTrapCount,
  stageProgress,
} from '../sim'
import { useGame } from '../store'
import { Meter } from './Meter'

const MOOD_ICON = { happy: '😊', thirsty: '🥵', hungry: '😋', wilted: '🥀' } as const
const WEATHER_ICON = { sun: '☀️', clouds: '☁️', rain: '🌧️' } as const

export function Hud() {
  const { t } = useTranslation()
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const plant = activePlant(state)
  const [editingName, setEditingName] = useState(false)
  const renameCancelled = useRef(false)
  const [toast, setToast] = useState<string | null>(null)
  const prevAchievements = useRef<number | null>(null)

  const achievementCount = state.achievements.length
  useEffect(() => {
    if (prevAchievements.current !== null && achievementCount > prevAchievements.current) {
      const latest = state.achievements[state.achievements.length - 1]
      setToast(latest)
      playToast()
      const timer = window.setTimeout(() => setToast(null), 3500)
      prevAchievements.current = achievementCount
      return () => window.clearTimeout(timer)
    }
    prevAchievements.current = achievementCount
  }, [achievementCount, state.achievements])

  if (!plant) return null

  const now = state.lastTickAt
  const ready = readyTrapCount(plant, now)
  const progress = stageProgress(plant)
  const weather = currentWeather(state, now)
  const barrelLow = state.weather.rainBarrel < SIM.WATER_COST
  const needsWater = plant.water < 99.5

  return (
    <div className="hud">
      <header className="hud-top">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="tagline">
            {editingName ? (
              <input
                className="name-input"
                defaultValue={plant.nickname}
                maxLength={20}
                autoFocus
                aria-label={t('actions.rename')}
                onBlur={(e) => {
                  if (!renameCancelled.current) {
                    dispatch({ type: 'rename', nickname: e.target.value })
                  }
                  renameCancelled.current = false
                  setEditingName(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') {
                    renameCancelled.current = true
                    e.currentTarget.blur()
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="name-button"
                aria-label={t('actions.rename')}
                onClick={() => setEditingName(true)}
              >
                {plant.nickname} ✏️
              </button>
            )}{' '}
            · {t(`stage.${plant.stage}`)} {MOOD_ICON[mood(plant)]} ·{' '}
            <span title={t(`weather.${weather}`)}>{WEATHER_ICON[weather]}</span>
          </p>
        </div>
        <div className="meters">
          <Meter icon="💧" label={t('stats.water')} value={plant.water} kind="water" />
          <Meter icon="🪰" label={t('stats.nutrition')} value={plant.nutrition} kind="nutrition" />
          <Meter icon="❤️" label={t('stats.health')} value={plant.health} kind="health" />
          <Meter icon="🌱" label={t('stage.next')} value={progress.fraction * 100} kind="growth" />
          <Meter
            icon="🛢️"
            label={t('stats.rainBarrel')}
            value={state.weather.rainBarrel}
            kind="barrel"
          />
          <div className="meters-foot">
            <span aria-label={t('stats.dewdrops')}>🫧 {state.inventory.dewdrops}</span>
            <button
              type="button"
              className="icon-btn"
              aria-label={t('actions.sound')}
              onClick={() => dispatch({ type: 'setSound', on: !state.settings.sound })}
            >
              {state.settings.sound ? '🔊' : '🔇'}
            </button>
          </div>
        </div>
      </header>

      <div className="hud-middle">
        {toast && (
          <p className="toast">
            🏆 {t('achievements.toast')}: {t(`achievements.${toast}`)}
          </p>
        )}
        {plant.wilted && <p className="banner">{t('status.wilted', { name: plant.nickname })}</p>}
      </div>

      <footer className="hud-bottom">
        <p className="hint">{t('scene.hintSnap')}</p>
        <div className="actions">
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'water' })
              playSplash()
            }}
            disabled={!needsWater || barrelLow}
          >
            💧 {t('actions.water')}
          </button>
          {barrelLow && needsWater && (
            <button
              type="button"
              className="warn"
              title={t('status.tapWaterWarning')}
              onClick={() => {
                dispatch({ type: 'tapWater' })
                playSplash()
              }}
            >
              🚰 {t('actions.tapWater')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const trap = firstReadyTrap(plant, Date.now())
              if (trap) dispatch({ type: 'feedTrap', trapId: trap.id })
            }}
            disabled={ready === 0 || plant.wilted}
          >
            🪰 {t('actions.feed')}
            {ready > 0 && !plant.wilted && <span className="badge">{ready}</span>}
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
