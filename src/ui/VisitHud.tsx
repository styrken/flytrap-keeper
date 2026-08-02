import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { mood, seasonAt } from '../sim'
import { useSocial } from '../socialStore'
import { useGame } from '../store'
import { roomOfPlant } from '../scene/plantLayout'
import { FlytrapIcon } from './FlytrapIcon'

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
const SPECIES_ICON = {
  dionaea: <FlytrapIcon size={14} />,
  drosera: '✨',
  nepenthes: '🏺',
  sarracenia: '🎺',
} as const

/** The whole HUD while visiting: a name tag, their plants, and the way home. */
export function VisitHud() {
  const { t } = useTranslation()
  const visiting = useSocial((s) => s.visiting)
  const endVisit = useSocial((s) => s.endVisit)
  const retickVisit = useSocial((s) => s.retickVisit)
  const openChat = useSocial((s) => s.openChat)
  const setShowFriends = useSocial((s) => s.setShowFriends)
  const roomView = useGame((s) => s.roomView)
  const setRoomView = useGame((s) => s.setRoomView)

  // Their garden keeps living while we stand around and admire it.
  useEffect(() => {
    const timer = window.setInterval(retickVisit, 30_000)
    return () => window.clearInterval(timer)
  }, [retickVisit])

  if (!visiting) return null
  const { state, username } = visiting
  const winter = seasonAt(state.lastTickAt) === 'winter'
  const showRooms = state.plants.some((plant) => roomOfPlant(plant) === 'greenhouse')

  return (
    <div className="hud">
      <header className="hud-top">
        <div className="visit-bar">
          <h1>🧑‍🌾 {t('visit.title', { name: username })}</h1>
          <p className="tagline">{t('visit.hint')}</p>
        </div>
      </header>

      <footer className="hud-bottom">
        {showRooms && (
          <div className="plant-switcher" role="group" aria-label={t('actions.spot')}>
            <button
              type="button"
              className={roomView === 'bedroom' ? 'active' : ''}
              onClick={() => setRoomView('bedroom')}
            >
              🛏️ {t('room.bedroom')}
            </button>
            <button
              type="button"
              className={roomView === 'greenhouse' ? 'active' : ''}
              onClick={() => setRoomView('greenhouse')}
            >
              🌿 {t('room.greenhouse')}
            </button>
          </div>
        )}
        {state.plants.length > 1 && (
          <div className="plant-switcher">
            {state.plants.map((plant) => (
              <button
                key={plant.id}
                type="button"
                className={roomOfPlant(plant) === roomView ? '' : 'other-room'}
                onClick={() => setRoomView(roomOfPlant(plant))}
              >
                {SPECIES_ICON[plant.speciesId]} {plant.nickname} {MOOD_ICON[mood(plant, winter)]}
              </button>
            ))}
          </div>
        )}
        <div className="actions">
          <button
            type="button"
            onClick={() => {
              setShowFriends(true)
              openChat(username)
            }}
          >
            💬 {t('friends.chat')}
          </button>
          <button type="button" className="visit-leave" onClick={endVisit}>
            🏠 {t('visit.leave')}
          </button>
        </div>
      </footer>
    </div>
  )
}
