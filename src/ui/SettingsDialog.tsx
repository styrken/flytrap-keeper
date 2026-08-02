import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadFromString, saveToString } from '../sim'
import { useGame } from '../store'
import { deleteAccountRemote, loginAccount, registerAccount, resetAccountPassword } from '../sync'

export function SettingsDialog() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showSettings)
  const setShow = useGame((s) => s.setShowSettings)
  if (!show) return null
  return (
    <div className="dialog-backdrop" onClick={() => setShow(false)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>⚙️ {t('settings.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setShow(false)}
          >
            ✕
          </button>
        </header>
        <SoundSection />
        <AccountSection />
        <DataSection />
      </div>
    </div>
  )
}

function SoundSection() {
  const { t, i18n } = useTranslation()
  const settings = useGame((s) => s.state.settings)
  const dispatch = useGame((s) => s.dispatch)
  const switchLocale = (locale: string) => {
    dispatch({ type: 'setLocale', locale })
    void i18n.changeLanguage(locale)
  }
  return (
    <section className="dialog-section">
      <h3>{t('settings.general')}</h3>
      <button type="button" onClick={() => dispatch({ type: 'setSound', on: !settings.sound })}>
        {settings.sound ? '🔊' : '🔇'} {t('settings.sound')}:{' '}
        {settings.sound ? t('settings.on') : t('settings.off')}
      </button>
      <div className="dialog-row">
        <button
          type="button"
          className={settings.locale === 'en' ? 'primary' : ''}
          onClick={() => switchLocale('en')}
        >
          🇬🇧 English
        </button>
        <button
          type="button"
          className={settings.locale === 'da' ? 'primary' : ''}
          onClick={() => switchLocale('da')}
        >
          🇩🇰 Dansk
        </button>
      </div>
      <button
        type="button"
        className={settings.hardMode ? 'danger' : ''}
        title={t('settings.hardModeHint')}
        onClick={() => dispatch({ type: 'setHardMode', on: !settings.hardMode })}
      >
        💀 {t('settings.hardMode')}: {settings.hardMode ? t('settings.on') : t('settings.off')}
      </button>
      <p className="muted">{t('settings.hardModeHint')}</p>
    </section>
  )
}

function AccountSection() {
  const { t } = useTranslation()
  const sync = useGame((s) => s.sync)
  const state = useGame((s) => s.state)
  const setSync = useGame((s) => s.setSync)
  const signOut = useGame((s) => s.signOut)
  const [mode, setMode] = useState<'signin' | 'reset'>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [recovery, setRecovery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (sync.kind === 'offline' || sync.kind === 'unknown') {
    return (
      <section className="dialog-section">
        <h3>{t('account.title')}</h3>
        <p className="muted">{t('account.unavailable')}</p>
      </section>
    )
  }

  if (recoveryCode) {
    return (
      <section className="dialog-section">
        <h3>{t('account.title')}</h3>
        <p>{t('account.recoveryIntro')}</p>
        <p className="recovery-code">{recoveryCode}</p>
        <p className="muted">{t('account.recoveryWarning')}</p>
        <button type="button" className="primary" onClick={() => setRecoveryCode(null)}>
          {t('account.recoverySaved')}
        </button>
      </section>
    )
  }

  if (sync.kind === 'signedIn') {
    return (
      <section className="dialog-section">
        <h3>{t('account.title')}</h3>
        <p>
          {t('account.signedInAs')} <strong>{sync.username}</strong> ☁️
        </p>
        <div className="dialog-row">
          <button type="button" onClick={signOut}>
            {t('account.signOut')}
          </button>
          <button
            type="button"
            className={confirmDelete ? 'danger' : ''}
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true)
                return
              }
              void deleteAccountRemote().then((ok) => {
                if (ok) {
                  setConfirmDelete(false)
                  setSync({ kind: 'signedOut' })
                }
              })
            }}
          >
            {confirmDelete ? t('account.deleteConfirm') : t('account.delete')}
          </button>
        </div>
      </section>
    )
  }

  const finishAuth = (username2: string, code: string | undefined, cloudSave: unknown) => {
    setSync({ kind: 'signedIn', username: username2 })
    if (code) setRecoveryCode(code)
    if (cloudSave && typeof cloudSave === 'object') {
      const save = cloudSave as { blob: string; updatedAt: number }
      // Cloud already has a save and this device has one too: let the player pick.
      if (Math.abs(save.updatedAt - state.updatedAt) > 60_000) {
        useGame.setState({ conflict: save })
        return
      }
      if (save.updatedAt > state.updatedAt) {
        const cloudState = loadFromString(save.blob)
        if (cloudState) useGame.getState().adoptState(cloudState)
      }
    }
  }

  const submit = (kind: 'register' | 'login' | 'reset') => {
    setBusy(true)
    setError(null)
    const done = (result: Awaited<ReturnType<typeof loginAccount>>) => {
      setBusy(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      finishAuth(
        result.username,
        'recoveryCode' in result ? result.recoveryCode : undefined,
        result.cloudSave,
      )
    }
    if (kind === 'register') void registerAccount(username, password).then(done)
    else if (kind === 'login') void loginAccount(username, password).then(done)
    else void resetAccountPassword(username, recovery, password).then(done)
  }

  return (
    <section className="dialog-section">
      <h3>{t('account.title')}</h3>
      <p className="muted">{t('account.pitch')}</p>
      <input
        value={username}
        placeholder={t('account.username')}
        autoComplete="username"
        onChange={(e) => setUsername(e.target.value)}
      />
      {mode === 'reset' && (
        <input
          value={recovery}
          placeholder={t('account.recoveryCode')}
          onChange={(e) => setRecovery(e.target.value)}
        />
      )}
      <input
        type="password"
        value={password}
        placeholder={mode === 'reset' ? t('account.newPassword') : t('account.password')}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p className="error">{t(`account.errors.${error}`, t('account.errors.unknown'))}</p>
      )}
      {mode === 'signin' ? (
        <>
          <div className="dialog-row">
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => submit('login')}
            >
              {t('account.signIn')}
            </button>
            <button type="button" disabled={busy} onClick={() => submit('register')}>
              {t('account.create')}
            </button>
          </div>
          <button type="button" className="linklike" onClick={() => setMode('reset')}>
            {t('account.forgot')}
          </button>
        </>
      ) : (
        <div className="dialog-row">
          <button type="button" className="primary" disabled={busy} onClick={() => submit('reset')}>
            {t('account.resetAction')}
          </button>
          <button type="button" onClick={() => setMode('signin')}>
            {t('account.back')}
          </button>
        </div>
      )}
    </section>
  )
}

function DataSection() {
  const { t } = useTranslation()
  const state = useGame((s) => s.state)
  const adoptState = useGame((s) => s.adoptState)
  const fileInput = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState(false)

  const exportSave = () => {
    const blob = new Blob([saveToString(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flytrap-keeper-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importSave = (file: File) => {
    void file.text().then((text) => {
      const loaded = loadFromString(text)
      if (!loaded) {
        setImportError(true)
        return
      }
      setImportError(false)
      adoptState(loaded)
    })
  }

  return (
    <section className="dialog-section">
      <h3>{t('data.title')}</h3>
      <div className="dialog-row">
        <button type="button" onClick={exportSave}>
          ⬇️ {t('data.export')}
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          ⬆️ {t('data.import')}
        </button>
      </div>
      {importError && <p className="error">{t('data.importError')}</p>}
      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) importSave(file)
          e.target.value = ''
        }}
      />
    </section>
  )
}

export function ConflictDialog() {
  const { t } = useTranslation()
  const conflict = useGame((s) => s.conflict)
  const resolveConflict = useGame((s) => s.resolveConflict)
  if (!conflict) return null
  return (
    <div className="dialog-backdrop">
      <div className="dialog-card">
        <h2>☁️ {t('conflict.title')}</h2>
        <p>{t('conflict.body', { date: new Date(conflict.updatedAt).toLocaleString() })}</p>
        <div className="dialog-row">
          <button type="button" className="primary" onClick={() => resolveConflict('cloud')}>
            {t('conflict.useCloud')}
          </button>
          <button type="button" onClick={() => resolveConflict('local')}>
            {t('conflict.keepLocal')}
          </button>
        </div>
      </div>
    </div>
  )
}
