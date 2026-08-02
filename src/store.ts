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
import { type CloudSave, type SyncState, checkSession, logoutAccount, pushSave } from './sync'

const ONBOARDED_KEY = 'flytrap-keeper:onboarded'

interface GameStore {
  state: GameState
  showOnboarding: boolean
  showSettings: boolean
  showShop: boolean
  showLexicon: boolean
  sync: SyncState
  /** A cloud save awaiting a keep-local-or-take-cloud decision. */
  conflict: CloudSave | null
  dispatch: (action: Action) => void
  tickNow: () => void
  finishOnboarding: () => void
  setShowSettings: (show: boolean) => void
  setShowShop: (show: boolean) => void
  setShowLexicon: (show: boolean) => void
  setSync: (sync: SyncState) => void
  /** Replace the whole game state (cloud adopt / file import) and persist it. */
  adoptState: (state: GameState) => void
  resolveConflict: (choice: 'local' | 'cloud') => void
  signOut: () => void
}

export const useGame = create<GameStore>()((set, get) => ({
  state: createInitialState(Date.now(), Date.now() >>> 0),
  showOnboarding: false,
  showSettings: false,
  showShop: false,
  showLexicon: false,
  sync: { kind: 'unknown' },
  conflict: null,
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
  setShowSettings: (show) => set({ showSettings: show }),
  setShowShop: (show) => set({ showShop: show }),
  setShowLexicon: (show) => set({ showLexicon: show }),
  setSync: (sync) => set({ sync }),
  adoptState: (rawState) => {
    const state = tick(rawState, Date.now())
    set({ state, conflict: null })
    persist(state)
  },
  resolveConflict: (choice) => {
    const { conflict, state } = get()
    if (!conflict) return
    if (choice === 'cloud') {
      const cloudState = loadFromString(conflict.blob)
      if (cloudState) {
        get().adoptState(cloudState)
        return
      }
    }
    // keep local: push it as the new truth
    set({ conflict: null })
    schedulePush(state, 0)
  },
  signOut: () => {
    void logoutAccount()
    set({ sync: { kind: 'signedOut' }, conflict: null })
  },
}))

let pushTimer: number | undefined

function schedulePush(state: GameState, delayMs = 4000) {
  if (useGame.getState().sync.kind !== 'signedIn') return
  window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    void pushSave(saveToString(state), state.updatedAt).then((result) => {
      if (!result.ok && result.conflict) {
        // Another device pushed something newer — surface the choice.
        useGame.setState({ conflict: result.conflict })
      }
    })
  }, delayMs)
}

function persist(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, saveToString(state))
  } catch {
    // Storage unavailable (private mode, quota) — keep playing in memory.
  }
  schedulePush(state)
}

/** Adopt the newest of local vs cloud at startup; push if local wins. */
function reconcileAtStartup(cloud: CloudSave | null) {
  if (!cloud) {
    schedulePush(useGame.getState().state, 1000)
    return
  }
  const local = useGame.getState().state
  if (cloud.updatedAt > local.updatedAt) {
    const cloudState = loadFromString(cloud.blob)
    if (cloudState) {
      useGame.getState().adoptState(cloudState)
      return
    }
  }
  schedulePush(local, 1000)
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
  try {
    localStorage.setItem(SAVE_KEY, saveToString(state))
  } catch {
    // ignore
  }

  window.setInterval(() => useGame.getState().tickNow(), 30_000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) useGame.getState().tickNow()
    else schedulePush(useGame.getState().state, 0)
  })

  void checkSession().then(({ sync, save }) => {
    useGame.setState({ sync })
    if (sync.kind === 'signedIn') reconcileAtStartup(save)
  })
}
