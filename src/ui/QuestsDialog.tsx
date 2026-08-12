import { useTranslation } from 'react-i18next'
import { SIM, type QuestId, type WeeklyQuestId } from '../sim'
import { useGame } from '../store'

const QUEST_ICON: Record<QuestId, string> = {
  water2: '💧',
  catch2: '🪰',
  weed2: '🌿',
  pet2: '💚',
  pour1: '✨',
  mist1: '💨',
}

const WEEKLY_ICON: Record<WeeklyQuestId, string> = {
  waterWeek: '💧',
  catchWeek: '🪰',
  weedWeek: '🌿',
  petWeek: '💚',
  pourWeek: '✨',
  greetWeek: '🐞',
}

export function QuestsDialog() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showQuests)
  const setShow = useGame((s) => s.setShowQuests)
  const quests = useGame((s) => s.state.quests)
  if (!show) return null

  const allDone = quests.items.length > 0 && quests.items.every((q) => q.progress >= q.target)
  const weekAllDone =
    quests.weekItems.length > 0 && quests.weekItems.every((q) => q.progress >= q.target)

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
        <header className="dialog-head">
          <h2>🗓️ {t('quests.weeklyTitle')}</h2>
        </header>
        <div className="shop-list">
          {quests.weekItems.map((quest) => {
            const done = quest.progress >= quest.target
            return (
              <div key={quest.id} className={`shop-item quest-row${done ? ' done' : ''}`}>
                <div className="shop-item-text">
                  <strong>
                    {WEEKLY_ICON[quest.id]}{' '}
                    {t(`quests.weekly.${quest.id}`, { target: quest.target })}
                  </strong>
                  <span className="muted">
                    {done ? '✅' : `${quest.progress}/${quest.target}`} · +{SIM.QUEST_WEEK_DEWDROPS}{' '}
                    🫧
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="muted">
          {weekAllDone
            ? t('quests.weekBonusDone')
            : t('quests.weekBonusRow', { n: SIM.QUEST_WEEK_ALL_BONUS })}{' '}
          · {t('quests.weekReset')}
        </p>
      </div>
    </div>
  )
}
