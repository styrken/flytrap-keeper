import { useTranslation } from 'react-i18next'
import { SIM, mailLetterIndex, mailToday } from '../sim'
import { gameNow, useGame } from '../store'

/**
 * Today's letter from the letterbox, unfolded. The sender and text come from
 * a little pool in the locale files — which letter arrives on which day is
 * as deterministic as the weather, so the family reads the same post.
 */
export function MailDialog() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showMail)
  const setShow = useGame((s) => s.setShowMail)
  const seed = useGame((s) => s.state.rngSeed)
  if (!show) return null

  const now = gameNow()
  if (!mailToday(seed, now)) {
    // The box was empty after all (midnight slipped past) — nothing to read.
    return null
  }
  const letter = mailLetterIndex(seed, now)

  return (
    <div className="dialog-backdrop" onClick={() => setShow(false)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>✉️ {t('mail.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setShow(false)}
          >
            ✕
          </button>
        </header>
        <p className="muted">{t(`mail.letters.${letter}.from`)}</p>
        <p className="mail-letter">{t(`mail.letters.${letter}.text`)}</p>
        <div className="dialog-section">
          <p className="muted">🫧 {t('mail.collected', { n: SIM.MAIL_DEWDROPS })}</p>
        </div>
      </div>
    </div>
  )
}
