import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { activePlant } from '../sim'
import { useGame } from '../store'

export function Onboarding() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showOnboarding)
  const plant = useGame((s) => activePlant(s.state))
  const dispatch = useGame((s) => s.dispatch)
  const finishOnboarding = useGame((s) => s.finishOnboarding)
  const [name, setName] = useState('')
  if (!show || !plant) return null

  const finish = () => {
    if (name.trim()) dispatch({ type: 'rename', nickname: name })
    finishOnboarding()
  }

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-card">
        <h2>🪴 {t('app.title')}</h2>
        <p className="onboarding-welcome">{t('onboarding.welcome')}</p>
        <label className="onboarding-name">
          {t('onboarding.namePrompt')}
          <input
            value={name}
            placeholder={plant.nickname}
            maxLength={20}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && finish()}
          />
        </label>
        <ul className="onboarding-tips">
          <li>💧 {t('onboarding.tip1')}</li>
          <li>🪤 {t('onboarding.tip2')}</li>
          <li>☀️ {t('onboarding.tip3')}</li>
        </ul>
        <button type="button" className="onboarding-start" onClick={finish}>
          {t('onboarding.start')}
        </button>
      </div>
    </div>
  )
}
