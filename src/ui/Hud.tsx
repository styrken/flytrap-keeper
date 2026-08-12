import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { playBuzz, playSplash, playToast } from '../audio'
import { photoBus } from '../scene/photoBus'
import { roomOfPlant } from '../scene/plantLayout'
import {
  HOUR_MS,
  PACK_KINDS,
  type PackKind,
  SIM,
  activePlant,
  canFeedPlant,
  canMoveTo,
  catAtWindow,
  currentWeather,
  spiderAtCorner,
  firstReadyTrap,
  hasGreenhouse,
  hasWeed,
  mood,
  msToNextStage,
  nextTrapOpenAt,
  readyTrapCount,
  seasonAt,
  speciesOf,
  stageProgress,
  toGameTime,
} from '../sim'
import { useFriendsPip, useSocial } from '../socialStore'
import { gameNow, useGame } from '../store'
import { FlytrapIcon } from './FlytrapIcon'
import { Meter } from './Meter'
import { PourGame } from './PourGame'
import { composePostcard } from './postcard'

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
const SPECIES_ICON = {
  dionaea: <FlytrapIcon size={14} />,
  drosera: '✨',
  nepenthes: '🏺',
  sarracenia: '🎺',
  pinguicula: '🌸',
} as const
const PACK_ICON: Record<PackKind, string> = {
  fly: '🪰',
  mosquito: '🦟',
  moth: '🌙',
  spider: '🕷️',
}

export function Hud() {
  const { t, i18n } = useTranslation()
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  const setShowSettings = useGame((s) => s.setShowSettings)
  const setShowShop = useGame((s) => s.setShowShop)
  const setShowLexicon = useGame((s) => s.setShowLexicon)
  const setShowQuests = useGame((s) => s.setShowQuests)
  const setShowJournal = useGame((s) => s.setShowJournal)
  const setStatInfo = useGame((s) => s.setStatInfo)
  const setPhoto = useGame((s) => s.setPhoto)
  const roomView = useGame((s) => s.roomView)
  const setRoomView = useGame((s) => s.setRoomView)
  const setShowFriends = useSocial((s) => s.setShowFriends)
  const friendsPip = useFriendsPip()
  const queueInsects = useGame((s) => s.queueInsects)
  const plant = activePlant(state)
  const [editingName, setEditingName] = useState(false)
  const renameCancelled = useRef(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showPour, setShowPour] = useState(false)
  const prevAchievements = useRef<number | null>(null)
  const prevCareDays = useRef<number | null>(null)

  const achievementCount = state.achievements.length
  useEffect(() => {
    if (prevAchievements.current !== null && achievementCount > prevAchievements.current) {
      const latest = state.achievements[state.achievements.length - 1]
      setToast(`🏆 ${t('achievements.toast')}: ${t(`achievements.${latest}`)}`)
      playToast()
      const timer = window.setTimeout(() => setToast(null), 3500)
      prevAchievements.current = achievementCount
      return () => window.clearTimeout(timer)
    }
    prevAchievements.current = achievementCount
  }, [achievementCount, state.achievements, t])

  const questsDoneCount = state.quests.items.filter((q) => q.progress >= q.target).length
  const questsTotal = state.quests.items.length
  const questsKey = `${state.quests.day}:${questsDoneCount}`
  const prevQuestsKey = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevQuestsKey.current
    prevQuestsKey.current = questsKey
    if (prev === null) return
    const [prevDay, prevDone] = prev.split(':')
    if (prevDay !== state.quests.day) return
    if (questsDoneCount > Number(prevDone)) {
      setToast(
        questsDoneCount === questsTotal
          ? `🎉 ${t('quests.allDone', { n: SIM.QUEST_ALL_BONUS })}`
          : `📋 ${t('quests.done', { n: SIM.QUEST_DEWDROPS })}`,
      )
      playToast()
      const timer = window.setTimeout(() => setToast(null), 3500)
      return () => window.clearTimeout(timer)
    }
  }, [questsKey, questsDoneCount, questsTotal, state.quests.day, t])

  const careDays = state.careStreak.days
  useEffect(() => {
    if (prevCareDays.current !== null && careDays > prevCareDays.current) {
      setToast((current) => current ?? `🫧 ${t('status.dailyBonus')}`)
      const timer = window.setTimeout(() => setToast(null), 3500)
      prevCareDays.current = careDays
      return () => window.clearTimeout(timer)
    }
    prevCareDays.current = careDays
  }, [careDays, t])

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

  // Context line: always tell the player what's happening and when.
  const fmtDuration = (ms: number) => {
    const minutes = Math.max(1, Math.round(ms / 60_000))
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    const mins = minutes % 60
    if (days > 0) return `${days}${t('time.day')} ${hours}${t('time.hour')}`
    if (hours > 0) return `${hours}${t('time.hour')} ${mins}${t('time.min')}`
    return `${mins}${t('time.min')}`
  }
  const weedReady = hasWeed(plant, now)
  const statusLine = (() => {
    if (weedReady) return `🌿 ${t('status.weed', { name: plant.nickname })}`
    if (species.isSnapper) {
      if (ready > 0 && !plant.wilted && !plant.dormant && !plant.dead) return t('scene.hintSnap')
      const opensAt = nextTrapOpenAt(plant)
      if (opensAt && opensAt > now) {
        return `⏳ ${t('status.trapDigesting', { name: plant.nickname, time: fmtDuration(opensAt - now) })}`
      }
    } else if (!plant.wilted && !canFeedPlant(plant, now) && plant.lastFedAt !== null) {
      const fullUntil = plant.lastFedAt + SIM.FEED_PLANT_COOLDOWN_HOURS * HOUR_MS
      if (fullUntil > now) {
        return `⏳ ${t('status.fullFed', { name: plant.nickname, time: fmtDuration(fullUntil - now) })}`
      }
    }
    if (weather === 'rain' && state.weather.rainBarrel < SIM.BARREL_CAP - 1) {
      return `🌧️ ${t('status.rainFilling')}`
    }
    const eta = msToNextStage(plant)
    if (eta !== null) {
      return `🌱 ${t('status.growingEta', { stage: t(`stage.${plant.stage + 1}`), time: fmtDuration(eta) })}`
    }
    return species.isSnapper ? t('scene.hintSnap') : t('scene.hintCare')
  })()

  return (
    <div className="hud">
      <header className="hud-top">
        <div className="hud-id">
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
            <span className="hud-wide">
              · {t(`species.${plant.speciesId}.name`)}
              {plant.cultivar && <> ‘{t(`cultivar.${plant.cultivar}.name`)}’</>} ·{' '}
              {t(`stage.${plant.stage}`)}
            </span>{' '}
            {MOOD_ICON[mood(plant, season === 'winter')]} ·{' '}
            <span title={t(`weather.${weather}`)}>{WEATHER_ICON[weather]}</span>{' '}
            <span title={t(`season.${season}`)}>{SEASON_ICON[season]}</span> · <GameClock />
          </p>
        </div>
        <div className="meters">
          <Meter
            icon="💧"
            label={t('stats.water')}
            value={plant.water}
            kind="water"
            onInfo={() => setStatInfo('water')}
          />
          <Meter
            icon="🪰"
            label={t('stats.nutrition')}
            value={plant.nutrition}
            kind="nutrition"
            onInfo={() => setStatInfo('nutrition')}
          />
          <Meter
            icon="❤️"
            label={t('stats.health')}
            value={plant.health}
            kind="health"
            onInfo={() => setStatInfo('health')}
          />
          {species.needsMisting && (
            <Meter
              icon="💨"
              label={t('stats.humidity')}
              value={plant.humidity}
              kind="humidity"
              onInfo={() => setStatInfo('humidity')}
            />
          )}
          <Meter
            icon="🌱"
            label={t('stage.next')}
            value={progress.fraction * 100}
            kind="growth"
            onInfo={() => setStatInfo('growth')}
          />
          <Meter
            icon="🛢️"
            label={t('stats.rainBarrel')}
            value={state.weather.rainBarrel}
            kind="barrel"
            onInfo={() => setStatInfo('barrel')}
          />
          <div className="meters-foot">
            <button
              type="button"
              className="dew-count"
              aria-label={t('stats.dewdrops')}
              title={t('stats.dewdrops')}
              onClick={() => setStatInfo('dewdrops')}
            >
              🫧 {state.inventory.dewdrops}
            </button>
            <span>
              <button
                type="button"
                className={`icon-btn${questsDoneCount < questsTotal ? ' has-pip' : ''}`}
                aria-label={t('quests.title')}
                onClick={() => setShowQuests(true)}
              >
                📋
              </button>
              <button
                type="button"
                className={`icon-btn${friendsPip ? ' has-pip' : ''}`}
                aria-label={t('friends.title')}
                onClick={() => setShowFriends(true)}
              >
                👥
              </button>
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
                aria-label={t('journal.open')}
                title={t('journal.open')}
                onClick={() => setShowJournal(true)}
              >
                📔
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('photo.take')}
                title={t('photo.take')}
                onClick={() => {
                  const raw = photoBus.capture?.()
                  if (!raw) return
                  const stamp = new Intl.DateTimeFormat(i18n.language, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }).format(gameNow())
                  void composePostcard(raw, plant.nickname, stamp).then(setPhoto)
                }}
              >
                📷
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
        {toast && <p className="toast">{toast}</p>}
        {catAtWindow(state, now) && (
          <div className="banner calm">
            <span>🐱 {t('status.catAtWindow')}</span>
            <button type="button" onClick={() => dispatch({ type: 'letCatIn' })}>
              {t('actions.letCatIn')}
            </button>
          </div>
        )}
        {spiderAtCorner(state, now) && (
          <div className="banner calm">
            <span>🕷️ {t('status.spiderAtCorner')}</span>
            <button type="button" onClick={() => dispatch({ type: 'adoptSpider' })}>
              {t('actions.letSpiderStay')}
            </button>
          </div>
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
        <div className="plant-switcher room-switcher" role="group" aria-label={t('actions.spot')}>
          <button
            type="button"
            className={roomView === 'bedroom' ? 'active' : ''}
            onClick={() => setRoomView('bedroom')}
          >
            🛏️ {t('room.bedroom')}
          </button>
          <button
            type="button"
            className={roomView === 'garden' ? 'active' : ''}
            onClick={() => setRoomView('garden')}
          >
            🌳 {t('room.garden')}
          </button>
          {hasGreenhouse(state) && (
            <button
              type="button"
              className={roomView === 'greenhouse' ? 'active' : ''}
              onClick={() => setRoomView('greenhouse')}
            >
              🌿 {t('room.greenhouse')}
            </button>
          )}
        </div>
        {state.plants.length > 1 && (
          <div className="plant-switcher">
            {state.plants.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className={candidate.id === plant.id ? 'active' : ''}
                onClick={() => {
                  dispatch({ type: 'selectPlant', plantId: candidate.id })
                  // Tapping a plant in the other room walks you over there.
                  setRoomView(roomOfPlant(candidate))
                }}
              >
                {SPECIES_ICON[candidate.speciesId]} {candidate.nickname}
              </button>
            ))}
          </div>
        )}
        <p className="hint">{statusLine}</p>
        <div className="actions">
          <button
            type="button"
            aria-label={t('actions.water')}
            title={t('actions.water')}
            onClick={() => setShowPour(true)}
            disabled={!needsWater || barrelLow}
          >
            💧 <span className="act-label">{t('actions.water')}</span>
          </button>
          {weedReady && (
            <button
              type="button"
              aria-label={t('actions.pullWeed')}
              title={t('actions.pullWeed')}
              onClick={() => dispatch({ type: 'pullWeed', plantId: plant.id })}
            >
              🌿 <span className="act-label">{t('actions.pullWeed')}</span>
            </button>
          )}
          {barrelLow && needsWater && (
            <button
              type="button"
              className="warn"
              aria-label={t('actions.tapWater')}
              title={t('status.tapWaterWarning')}
              onClick={() => {
                dispatch({ type: 'tapWater' })
                playSplash()
              }}
            >
              🚰 <span className="act-label">{t('actions.tapWater')}</span>
            </button>
          )}
          {species.needsMisting && (
            <button
              type="button"
              aria-label={t('actions.mist')}
              title={t('actions.mist')}
              onClick={() => dispatch({ type: 'mist' })}
              disabled={plant.humidity >= 99.5 || plant.dormant || plant.dead}
            >
              💨 <span className="act-label">{t('actions.mist')}</span>
            </button>
          )}
          {PACK_KINDS.filter((kind) => state.inventory.packs[kind] > 0).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-label={t(`actions.release.${kind}`)}
              title={t(`actions.release.${kind}`)}
              onClick={() => {
                // Only send insects into the room if the sim really opened a pack.
                const before = useGame.getState().state.inventory.packs[kind]
                dispatch({ type: 'releasePack', insect: kind })
                if (useGame.getState().state.inventory.packs[kind] < before) {
                  queueInsects(kind, SIM.PACK_INSECTS)
                  playBuzz()
                }
              }}
            >
              📦{PACK_ICON[kind]} <span className="act-label">{t(`actions.release.${kind}`)}</span>
              <span className="badge">{state.inventory.packs[kind]}</span>
            </button>
          ))}
          {species.isSnapper ? (
            <button
              type="button"
              aria-label={t('actions.feed')}
              title={t('actions.feed')}
              onClick={() => {
                const trap = firstReadyTrap(plant, gameNow())
                if (trap) dispatch({ type: 'feedTrap', plantId: plant.id, trapId: trap.id })
              }}
              disabled={ready === 0 || plant.wilted || plant.dormant || plant.dead}
            >
              🪰 <span className="act-label">{t('actions.feed')}</span>
              {ready > 0 && !plant.wilted && <span className="badge">{ready}</span>}
            </button>
          ) : (
            <button
              type="button"
              aria-label={t('actions.feed')}
              title={t('actions.feed')}
              onClick={() => dispatch({ type: 'feedPlant' })}
              disabled={!canFeedPlant(plant, now) || plant.dormant || plant.dead}
            >
              🪰 <span className="act-label">{t('actions.feed')}</span>
            </button>
          )}
          <div className="segmented" role="group" aria-label={t('actions.spot')}>
            <button
              type="button"
              className={plant.placement === 'south-window' ? 'active' : ''}
              disabled={
                plant.placement !== 'south-window' && !canMoveTo(state, plant, 'south-window')
              }
              aria-label={t('placement.south-window')}
              title={t('placement.south-window')}
              onClick={() => {
                dispatch({ type: 'move', placement: 'south-window' })
                setRoomView('bedroom')
              }}
            >
              ☀️ <span className="seg-label">{t('placement.south-window')}</span>
            </button>
            <button
              type="button"
              className={plant.placement === 'north-window' ? 'active' : ''}
              disabled={
                plant.placement !== 'north-window' && !canMoveTo(state, plant, 'north-window')
              }
              aria-label={t('placement.north-window')}
              title={t('placement.north-window')}
              onClick={() => {
                dispatch({ type: 'move', placement: 'north-window' })
                setRoomView('bedroom')
              }}
            >
              ⛅ <span className="seg-label">{t('placement.north-window')}</span>
            </button>
            {state.inventory.items.includes('growlight') && (
              <button
                type="button"
                className={plant.placement === 'growlight' ? 'active' : ''}
                disabled={plant.placement !== 'growlight' && !canMoveTo(state, plant, 'growlight')}
                aria-label={t('placement.growlight')}
                title={t('placement.growlight')}
                onClick={() => {
                  dispatch({ type: 'move', placement: 'growlight' })
                  setRoomView('bedroom')
                }}
              >
                💡 <span className="seg-label">{t('placement.growlight')}</span>
              </button>
            )}
            {hasGreenhouse(state) && (
              <button
                type="button"
                className={plant.placement === 'greenhouse' ? 'active' : ''}
                disabled={
                  plant.placement !== 'greenhouse' && !canMoveTo(state, plant, 'greenhouse')
                }
                aria-label={t('placement.greenhouse')}
                title={t('placement.greenhouse')}
                onClick={() => {
                  dispatch({ type: 'move', placement: 'greenhouse' })
                  setRoomView('greenhouse')
                }}
              >
                🌿 <span className="seg-label">{t('placement.greenhouse')}</span>
              </button>
            )}
          </div>
        </div>
      </footer>
      {showPour && (
        <PourGame
          onDone={(perfect) => {
            setShowPour(false)
            dispatch({ type: 'water', perfect })
            playSplash()
          }}
        />
      )}
    </div>
  )
}

/**
 * The in-game date and time. It matches the wall clock until speed mode gives
 * the game clock its own (much faster) life — then the ⏩ badge shows why.
 */
function GameClock() {
  const { t, i18n } = useTranslation()
  const time = useGame((s) => s.state.time)
  const [realNow, setRealNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setRealNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const stamp = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(toGameTime(time, realNow))
  return (
    <span className="game-clock" title={t('time.clock')}>
      🕰️ {stamp}
      {time.scale > 1 && <span className="speed-badge">⏩×{time.scale}</span>}
    </span>
  )
}
