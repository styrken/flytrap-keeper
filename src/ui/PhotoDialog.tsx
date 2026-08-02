import { useTranslation } from 'react-i18next'
import { useGame } from '../store'

/** Preview of a freshly taken postcard, with save/share buttons. */
export function PhotoDialog() {
  const { t } = useTranslation()
  const photo = useGame((s) => s.photo)
  const setPhoto = useGame((s) => s.setPhoto)
  if (!photo) return null

  const download = () => {
    const a = document.createElement('a')
    a.href = photo
    a.download = 'flytrap-postcard.png'
    a.click()
  }

  const share = async () => {
    try {
      const blob = await (await fetch(photo)).blob()
      const file = new File([blob], 'flytrap-postcard.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        download()
      }
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  }

  return (
    <div className="dialog-backdrop" onClick={() => setPhoto(null)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>📷 {t('photo.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setPhoto(null)}
          >
            ✕
          </button>
        </header>
        <img className="photo-preview" src={photo} alt={t('photo.alt')} />
        <div className="dialog-section dialog-row photo-actions">
          <button type="button" className="primary" onClick={download}>
            💾 {t('photo.save')}
          </button>
          {typeof navigator.share === 'function' && (
            <button type="button" onClick={() => void share()}>
              📤 {t('photo.share')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
