import { create } from 'zustand'
import {
  type Action,
  type GameState,
  SAVE_KEY,
  apply,
  createInitialState,
  loadFromString,
  saveToString,
  tick,
} from './sim'

const ONBOARDED_KEY = 'flytrap-keeper:onboarded'

interface GameStore {
  state: GameState
  showOnboarding: boolean
  dispatch: (action: Action) => void
  tickNow: () => void
  finishOnboarding: () => void
}

export const useGame = create<GameStore>()((set, get) => ({
  state: createInitialState(Date.now(), Date.now() >>> 0),
  showOnboarding: false,
  dispatch: (action) => {
    const next = apply(get().state, action, Date.now())
    if (next !== get().state) {
      set({ state: next })
      persist(next)
    }
  },
  tickNow: () => {
    const next = tick(get().state, Date.now())
    if (next !== get().state) {
      set({ state: next })
      persist(next)
    }
  },
  finishOnboarding: () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1')
    } catch {
      // ignore
    }
    set({ showOnboarding: false })
  },
}))

function persist(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, saveToString(state))
  } catch {
    // Storage unavailable (private mode, quota) — keep playing in memory.
  }
}

/** Hydrate from localStorage, run offline catch-up, and start the tick loop. */
export function initGame(now = Date.now()) {
  let state: GameState | null = null
  let raw: string | null
  try {
    raw = localStorage.getItem(SAVE_KEY)
  } catch {
    raw = null
  }
  if (raw) {
    state = loadFromString(raw)
    if (!state) {
      // Keep the unreadable save around instead of silently destroying it.
      try {
        localStorage.setItem(`${SAVE_KEY}:backup`, raw)
      } catch {
        // ignore
      }
    }
  }
  const isFresh = state === null
  state = state ? tick(state, now) : createInitialState(now, now >>> 0)

  let onboarded = false
  try {
    onboarded = localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    // ignore
  }

  useGame.setState({ state, showOnboarding: isFresh && !onboarded })
  persist(state)

  window.setInterval(() => useGame.getState().tickNow(), 30_000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) useGame.getState().tickNow()
  })
}
