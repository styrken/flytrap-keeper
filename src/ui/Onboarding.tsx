import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { activePlant } from '../sim'
import { useGame } from '../store'
import { FlytrapIcon } from './FlytrapIcon'

export function Onboarding() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showOnboarding)
  const plant = useGame((s) => activePlant(s.state))
  const dispatch = useGame((s) => s.dispatch)
  const finishOnboarding = useGame((s) => s.finishOnboarding)
  const setOnboardingPlanted = useGame((s) => s.setOnboardingPlanted)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  if (!show || !plant) return null

  const finish = () => {
    if (name.trim()) dispatch({ type: 'rename', nickname: name })
    finishOnboarding()
  }

  return (
    <div className={`onboarding-backdrop${step === 2 ? ' light' : ''}`}>
      <div className="onboarding-card">
        {step === 0 && (
          <>
            <h2>🪴 {t('app.title')}</h2>
            <p className="onboarding-welcome">{t('onboarding.welcome1')}</p>
            <ul className="onboarding-tips">
              <li>💧 {t('onboarding.tip1')}</li>
              <li>
                <FlytrapIcon size={15} /> {t('onboarding.tip2')}
              </li>
              <li>☀️ {t('onboarding.tip3')}</li>
            </ul>
            <button type="button" className="onboarding-start" onClick={() => setStep(1)}>
              {t('onboarding.seeTheSeed')} →
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h2>🌱 {t('onboarding.seeTheSeed')}</h2>
            <div className="seed-packet">
              <span className="seed-art" aria-hidden="true">
                <FlytrapIcon size={46} />
              </span>
              <div className="seed-text">
                <strong>{t('onboarding.packetName')}</strong>
                <span className="muted">{t('onboarding.packetDesc')}</span>
              </div>
              <span className="seed-price">0 🫧 · {t('onboarding.onTheHouse')}</span>
            </div>
            <button
              type="button"
              className="onboarding-start"
              onClick={() => {
                setOnboardingPlanted()
                setStep(2)
              }}
            >
              {t('onboarding.plant')}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>✏️ {t('onboarding.namePrompt')}</h2>
            <label className="onboarding-name">
              <input
                value={name}
                placeholder={plant.nickname}
                maxLength={20}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && finish()}
              />
            </label>
            <button type="button" className="onboarding-start" onClick={finish}>
              {t('onboarding.start')}
            </button>
          </>
        )}

        <div className="onboarding-dots" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
      </div>
    </div>
  )
}
