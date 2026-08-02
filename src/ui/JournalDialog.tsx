import { useTranslation } from 'react-i18next'
import { activePlant } from '../sim'
import { useGame } from '../store'

/**
 * The plant's diary: every milestone of its little life, oldest first, told
 * in the plant's own gentle voice. Text lives in the locale files; the sim
 * only remembers what happened and when.
 */
export function JournalDialog() {
  const { t, i18n } = useTranslation()
  const show = useGame((s) => s.showJournal)
  const setShow = useGame((s) => s.setShowJournal)
  const state = useGame((s) => s.state)
  if (!show) return null
  const plant = activePlant(state)
  if (!plant) return null

  const fmt = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="dialog-backdrop" onClick={() => setShow(false)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>📔 {t('journal.title', { name: plant.nickname })}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setShow(false)}
          >
            ✕
          </button>
        </header>
        <ul className="journal-list">
          {plant.journal.map((entry, i) => (
            <li key={`${entry.at}:${i}`}>
              <span className="journal-date">{fmt.format(entry.at)}</span>
              <span>
                {t(`journal.${entry.kind}`, {
                  stage: entry.stage !== undefined ? t(`stage.${entry.stage}`) : '',
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
