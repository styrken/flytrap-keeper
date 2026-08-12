import { useTranslation } from 'react-i18next'
import { SIM, type QuestId } from '../sim'
import { useGame } from '../store'

const QUEST_ICON: Record<QuestId, string> = {
  water2: '💧',
  catch2: '🪰',
  weed2: '🌿',
  pet2: '💚',
  pour1: '✨',
  mist1: '💨',
}

export function QuestsDialog() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showQuests)
  const setShow = useGame((s) => s.setShowQuests)
  const quests = useGame((s) => s.state.quests)
  if (!show) return null

  const allDone = quests.items.length > 0 && quests.items.every((q) => q.progress >= q.target)

  return (
    <div className="dialog-backdrop" onClick={() => setShow(false)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>📋 {t('quests.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setShow(false)}
          >
            ✕
          </button>
        </header>
        <div className="shop-list">
          {quests.items.map((quest) => {
            const done = quest.progress >= quest.target
            return (
              <div key={quest.id} className={`shop-item quest-row${done ? ' done' : ''}`}>
                <div className="shop-item-text">
                  <strong>
                    {QUEST_ICON[quest.id]}{' '}
                    {/* count picks the singular form when a young plant gets target 1 */}
                    {t(`quests.items.${quest.id}`, { target: quest.target, count: quest.target })}
                  </strong>
                  <span className="muted">
                    {done ? '✅' : `${quest.progress}/${quest.target}`} · +{SIM.QUEST_DEWDROPS} 🫧
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="muted">
          {allDone ? t('quests.bonusDone') : t('quests.bonusRow', { n: SIM.QUEST_ALL_BONUS })} ·{' '}
          {t('quests.reset')}
        </p>
      </div>
    </div>
  )
}
