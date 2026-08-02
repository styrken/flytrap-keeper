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

interface GameStore {
  state: GameState
  dispatch: (action: Action) => void
  tickNow: () => void
}

export const useGame = create<GameStore>()((set, get) => ({
  state: createInitialState(Date.now(), Date.now() >>> 0),
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
  state = state ? tick(state, now) : createInitialState(now, now >>> 0)
  useGame.setState({ state })
  persist(state)

  window.setInterval(() => useGame.getState().tickNow(), 30_000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) useGame.getState().tickNow()
  })
}
