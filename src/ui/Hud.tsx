import { useTranslation } from 'react-i18next'

export function Hud() {
  const { t } = useTranslation()
  return (
    <div className="hud">
      <header className="hud-top">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="tagline">{t('app.tagline')}</p>
        </div>
        <span className="chip">{t('app.stage')}</span>
      </header>
      <p className="hint">
        {t('scene.hintDrag')} · {t('scene.hintSnap')}
      </p>
    </div>
  )
}
