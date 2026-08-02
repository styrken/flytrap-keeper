import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initAudioUnlock } from './audio'
import { initI18n } from './i18n'
import { initGame } from './store'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

void initI18n().then(() => {
  initGame()
  initAudioUnlock()
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
