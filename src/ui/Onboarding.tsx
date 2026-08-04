import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { activePlant, loadFromString } from '../sim'
import { useGame } from '../store'
import { loginAccount, registerAccount } from '../sync'
import { FlytrapIcon } from './FlytrapIcon'

type Step = 'welcome' | 'account' | 'seed' | 'name'

export function Onboarding() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showOnboarding)
  const plant = useGame((s) => activePlant(s.state))
  const dispatch = useGame((s) => s.dispatch)
  const finishOnboarding = useGame((s) => s.finishOnboarding)
  const setOnboardingPlanted = useGame((s) => s.setOnboardingPlanted)
  const syncKind = useGame((s) => s.sync.kind)
  const [step, setStep] = useState<Step>('welcome')
  // Latched when leaving the welcome step, so the flow (and its dot row) stays
  // put even if the session check resolves mid-onboarding.
  const [offerAccount, setOfferAccount] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  if (!show || !plant) return null

  // The account is an offer, never a wall: the step only appears for signed-out
  // players on a deployment where the cloud actually answers.
  const withAccount = offerAccount ?? syncKind === 'signedOut'
  const steps: Step[] = withAccount
    ? ['welcome', 'account', 'seed', 'name']
    : ['welcome', 'seed', 'name']

  const finish = () => {
    if (name.trim()) dispatch({ type: 'rename', nickname: name })
    finishOnboarding()
  }

  return (
    <div className={`onboarding-backdrop${step === 'name' ? ' light' : ''}`}>
      <div className="onboarding-card">
        {step === 'welcome' && (
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
            <button
              type="button"
              className="onboarding-start"
              onClick={() => {
                const offer = syncKind === 'signedOut'
                setOfferAccount(offer)
                setStep(offer ? 'account' : 'seed')
              }}
            >
              {t(withAccount ? 'onboarding.getStarted' : 'onboarding.seeTheSeed')} →
            </button>
          </>
        )}

        {step === 'account' && <AccountStep onContinue={() => setStep('seed')} />}

        {step === 'seed' && (
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
                setStep('name')
              }}
            >
              {t('onboarding.plant')}
            </button>
          </>
        )}

        {step === 'name' && (
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
          {steps.map((s) => (
            <span key={s} className={s === step ? 'on' : ''} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Create an account, sign in to bring an existing garden over, or skip. */
function AccountStep({ onContinue }: { onContinue: () => void }) {
  const { t } = useTranslation()
  const setSync = useGame((s) => s.setSync)
  const adoptState = useGame((s) => s.adoptState)
  const finishOnboarding = useGame((s) => s.finishOnboarding)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)

  const submit = (kind: 'create' | 'signIn') => {
    setBusy(true)
    setError(null)
    const request = kind === 'create' ? registerAccount : loginAccount
    void request(username, password).then((result) => {
      setBusy(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSync({ kind: 'signedIn', username: result.username })
      if (result.recoveryCode) {
        // Show the one-time recovery code before moving on.
        setRecoveryCode(result.recoveryCode)
        return
      }
      // Signing in over a seconds-old garden: the cloud save simply wins — no
      // keep-which dialog during onboarding — and the tour ends here.
      const cloudState = result.cloudSave ? loadFromString(result.cloudSave.blob) : null
      if (cloudState) {
        adoptState(cloudState)
        finishOnboarding()
        return
      }
      onContinue()
    })
  }

  if (recoveryCode) {
    return (
      <>
        <h2>🔑 {t('account.recoveryCode')}</h2>
        <p>{t('account.recoveryIntro')}</p>
        <p className="recovery-code">{recoveryCode}</p>
        <p className="muted">{t('account.recoveryWarning')}</p>
        <button type="button" className="onboarding-start" onClick={onContinue}>
          {t('account.recoverySaved')}
        </button>
      </>
    )
  }

  return (
    <>
      <h2>☁️ {t('onboarding.accountTitle')}</h2>
      <p className="muted">{t('onboarding.accountPitch')}</p>
      <input
        value={username}
        placeholder={t('account.username')}
        autoComplete="username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        value={password}
        placeholder={t('account.password')}
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p className="error">{t(`account.errors.${error}`, t('account.errors.unknown'))}</p>
      )}
      <div className="dialog-row">
        <button type="button" className="primary" disabled={busy} onClick={() => submit('create')}>
          {t('account.create')}
        </button>
        <button type="button" disabled={busy} onClick={() => submit('signIn')}>
          {t('account.signIn')}
        </button>
      </div>
      <button type="button" className="linklike" disabled={busy} onClick={onContinue}>
        {t('onboarding.accountSkip')}
      </button>
    </>
  )
}
