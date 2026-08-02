import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initAudioUnlock, initMusic } from './audio'
import { initI18n } from './i18n'
import { initGame, useGame } from './store'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

void initI18n().then((i18n) => {
  initGame()
  initAudioUnlock()
  initMusic()
  const { locale } = useGame.getState().state.settings
  if (locale && locale !== i18n.language) void i18n.changeLanguage(locale)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
