import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { playSplash, playToast } from '../audio'
import {
  SIM,
  activePlant,
  canFeedPlant,
  currentWeather,
  firstReadyTrap,
  mood,
  readyTrapCount,
  seasonAt,
  speciesOf,
  stageProgress,
} from '../sim'
import { useGame } from '../store'
import { Meter } from './Meter'

const MOOD_ICON = {
  happy: '😊',
  thirsty: '🥵',
  hungry: '😋',
  dry: '🏜️',
  sleepy: '😴',
  wilted: '🥀',
  dormant: '💤',
  dead: '🪦',
} as const
const WEATHER_ICON = { sun: '☀️', clouds: '☁️', rain: '🌧️' } as const
const SEASON_ICON = { spring: '🌸', summer: '🌻', autumn: '🍂', winter: '❄️' } as const
const SPECIES_ICON = { dionaea: '🪤', drosera: '✨', nepenthes: '🏺', sarracenia: '🎺' } as const

export function Hud() {
  const { t } = useTranslation()
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const setShowSettings = useGame((s) => s.setShowSettings)
  const setShowShop = useGame((s) => s.setShowShop)
  const setShowLexicon = useGame((s) => s.setShowLexicon)
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
  const species = speciesOf(plant)
  const ready = readyTrapCount(plant, now)
  const progress = stageProgress(plant)
  const weather = currentWeather(state, now)
  const season = seasonAt(now)
  const barrelLow = state.weather.rainBarrel < SIM.WATER_COST
  const needsWater = plant.water < 99.5 && !plant.dormant && !plant.dead
  const winterRest = season === 'winter' && species.needsDormancy

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
            · {t(`species.${plant.speciesId}.name`)} · {t(`stage.${plant.stage}`)}{' '}
            {MOOD_ICON[mood(plant, season === 'winter')]} ·{' '}
            <span title={t(`weather.${weather}`)}>{WEATHER_ICON[weather]}</span>{' '}
            <span title={t(`season.${season}`)}>{SEASON_ICON[season]}</span>
          </p>
        </div>
        <div className="meters">
          <Meter icon="💧" label={t('stats.water')} value={plant.water} kind="water" />
          <Meter icon="🪰" label={t('stats.nutrition')} value={plant.nutrition} kind="nutrition" />
          <Meter icon="❤️" label={t('stats.health')} value={plant.health} kind="health" />
          {species.needsMisting && (
            <Meter icon="💨" label={t('stats.humidity')} value={plant.humidity} kind="humidity" />
          )}
          <Meter icon="🌱" label={t('stage.next')} value={progress.fraction * 100} kind="growth" />
          <Meter
            icon="🛢️"
            label={t('stats.rainBarrel')}
            value={state.weather.rainBarrel}
            kind="barrel"
          />
          <div className="meters-foot">
            <span aria-label={t('stats.dewdrops')}>🫧 {state.inventory.dewdrops}</span>
            <span>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('shop.title')}
                onClick={() => setShowShop(true)}
              >
                🛍️
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('lexicon.title')}
                onClick={() => setShowLexicon(true)}
              >
                📖
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('actions.sound')}
                onClick={() => dispatch({ type: 'setSound', on: !state.settings.sound })}
              >
                {state.settings.sound ? '🔊' : '🔇'}
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('settings.title')}
                onClick={() => setShowSettings(true)}
              >
                ⚙️
              </button>
            </span>
          </div>
        </div>
      </header>

      <div className="hud-middle">
        {toast && (
          <p className="toast">
            🏆 {t('achievements.toast')}: {t(`achievements.${toast}`)}
          </p>
        )}
        {plant.dead ? (
          <div className="banner">
            <span>{t('status.dead', { name: plant.nickname })}</span>
            {state.plants.length > 1 && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'removePlant', plantId: plant.id })}
              >
                {t('actions.removePlant')}
              </button>
            )}
          </div>
        ) : plant.dormant ? (
          <div className="banner calm">
            <span>{t('status.dormant', { name: plant.nickname })}</span>
            <button type="button" onClick={() => dispatch({ type: 'setDormant', on: false })}>
              {t('actions.wake')}
            </button>
          </div>
        ) : plant.flowering && !plant.flowering.blooming ? (
          <div className="banner flower">
            <span>{t('status.flowerChoice', { name: plant.nickname })}</span>
            <button type="button" onClick={() => dispatch({ type: 'cutFlower' })}>
              ✂️ {t('actions.cutFlower')}
            </button>
            <button type="button" onClick={() => dispatch({ type: 'letBloom' })}>
              🌼 {t('actions.letBloom')}
            </button>
          </div>
        ) : plant.flowering?.blooming ? (
          <p className="banner calm">{t('status.blooming', { name: plant.nickname })}</p>
        ) : plant.wilted ? (
          <p className="banner">{t('status.wilted', { name: plant.nickname })}</p>
        ) : winterRest ? (
          <div className="banner calm">
            <span>{t('status.winterHint', { name: plant.nickname })}</span>
            <button type="button" onClick={() => dispatch({ type: 'setDormant', on: true })}>
              😴 {t('actions.dormancy')}
            </button>
          </div>
        ) : null}
      </div>

      <footer className="hud-bottom">
        {state.plants.length > 1 && (
          <div className="plant-switcher">
            {state.plants.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className={candidate.id === plant.id ? 'active' : ''}
                onClick={() => dispatch({ type: 'selectPlant', plantId: candidate.id })}
              >
                {SPECIES_ICON[candidate.speciesId]} {candidate.nickname}
              </button>
            ))}
          </div>
        )}
        <p className="hint">{species.isSnapper ? t('scene.hintSnap') : t('scene.hintCare')}</p>
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
          {species.needsMisting && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'mist' })}
              disabled={plant.humidity >= 99.5 || plant.dormant || plant.dead}
            >
              💨 {t('actions.mist')}
            </button>
          )}
          {species.isSnapper ? (
            <button
              type="button"
              onClick={() => {
                const trap = firstReadyTrap(plant, Date.now())
                if (trap) dispatch({ type: 'feedTrap', plantId: plant.id, trapId: trap.id })
              }}
              disabled={ready === 0 || plant.wilted || plant.dormant || plant.dead}
            >
              🪰 {t('actions.feed')}
              {ready > 0 && !plant.wilted && <span className="badge">{ready}</span>}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: 'feedPlant' })}
              disabled={!canFeedPlant(plant, now) || plant.dormant || plant.dead}
            >
              🪰 {t('actions.feed')}
            </button>
          )}
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
            {state.inventory.items.includes('growlight') && (
              <button
                type="button"
                className={plant.placement === 'growlight' ? 'active' : ''}
                onClick={() => dispatch({ type: 'move', placement: 'growlight' })}
              >
                💡 {t('placement.growlight')}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
