import { create } from 'zustand'
import {
  type Action,
  type GameState,
  SAVE_KEY,
  apply,
  createInitialState,
  hasGreenhouse,
  loadFromString,
  saveToString,
  tick,
  toGameTime,
} from './sim'
import { type CloudSave, type SyncState, checkSession, logoutAccount, pushSave } from './sync'

const ONBOARDED_KEY = 'flytrap-keeper:onboarded'

/**
 * Game-clock "now" — what scene and HUD code must compare against sim
 * timestamps (digestion, weeds, daylight), since speed mode runs the game
 * clock faster than `Date.now()`.
 */
export const gameNow = () => toGameTime(useGame.getState().state.time, Date.now())

export type RoomView = 'bedroom' | 'greenhouse' | 'garden'

/** The HUD stats a player can tap to open the little explainer dialog. */
export const STAT_INFO_IDS = [
  'water',
  'nutrition',
  'health',
  'humidity',
  'growth',
  'barrel',
  'dewdrops',
] as const
export type StatInfoId = (typeof STAT_INFO_IDS)[number]

interface GameStore {
  state: GameState
  showOnboarding: boolean
  /** During onboarding the pot starts empty; flips true at the planting step. */
  onboardingPlanted: boolean
  showSettings: boolean
  showShop: boolean
  showLexicon: boolean
  showQuests: boolean
  showJournal: boolean
  showArcade: boolean
  /** Stat whose explainer dialog is open — pure view state, never saved. */
  statInfo: StatInfoId | null
  /** A freshly composed postcard (data URL) awaiting save/share, or null. */
  photo: string | null
  /** Which room the camera is in — pure view state, never saved. */
  roomView: RoomView
  sync: SyncState
  /** A cloud save awaiting a keep-local-or-take-cloud decision. */
  conflict: CloudSave | null
  dispatch: (action: Action) => void
  tickNow: () => void
  finishOnboarding: () => void
  setOnboardingPlanted: () => void
  setShowSettings: (show: boolean) => void
  setShowShop: (show: boolean) => void
  setShowLexicon: (show: boolean) => void
  setShowQuests: (show: boolean) => void
  setShowJournal: (show: boolean) => void
  setShowArcade: (show: boolean) => void
  setStatInfo: (stat: StatInfoId | null) => void
  setPhoto: (photo: string | null) => void
  setRoomView: (room: RoomView) => void
  setSync: (sync: SyncState) => void
  /** Replace the whole game state (cloud adopt / file import) and persist it. */
  adoptState: (state: GameState) => void
  /** Wipe the garden and start over from onboarding. Overwrites the cloud save if signed in. */
  resetGame: () => void
  resolveConflict: (choice: 'local' | 'cloud') => void
  signOut: () => void
}

export const useGame = create<GameStore>()((set, get) => ({
  state: createInitialState(Date.now(), Date.now() >>> 0),
  showOnboarding: false,
  onboardingPlanted: false,
  showSettings: false,
  showShop: false,
  showLexicon: false,
  showQuests: false,
  showJournal: false,
  showArcade: false,
  statInfo: null,
  photo: null,
  roomView: 'bedroom',
  sync: { kind: 'unknown' },
  conflict: null,
  dispatch: (action) => {
    const prev = get().state
    const next = apply(prev, action, Date.now())
    if (next !== prev) {
      set({ state: next })
      persist(next)
      if (next.time.scale !== prev.time.scale) armTicker()
    }
  },
  tickNow: () => {
    const next = tick(get().state, Date.now())
    if (next !== get().state) {
      set({ state: next })
      persistThrottled(next)
    }
  },
  finishOnboarding: () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1')
    } catch {
      // ignore
    }
    set({ showOnboarding: false, onboardingPlanted: true })
  },
  setOnboardingPlanted: () => set({ onboardingPlanted: true }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowShop: (show) => set({ showShop: show }),
  setShowLexicon: (show) => set({ showLexicon: show }),
  setShowQuests: (show) => set({ showQuests: show }),
  setShowJournal: (show) => set({ showJournal: show }),
  setShowArcade: (show) => set({ showArcade: show }),
  setStatInfo: (statInfo) => set({ statInfo }),
  setPhoto: (photo) => set({ photo }),
  setRoomView: (room) => set({ roomView: room }),
  setSync: (sync) => set({ sync }),
  adoptState: (rawState) => {
    const state = tick(rawState, Date.now())
    set({ state, conflict: null })
    // An adopted save without a greenhouse can't leave the camera stranded
    // there. (The garden is always there — no guard needed.)
    if (get().roomView === 'greenhouse' && !hasGreenhouse(state)) set({ roomView: 'bedroom' })
    persist(state)
    armTicker()
  },
  resetGame: () => {
    const now = Date.now()
    const state = createInitialState(now, now >>> 0)
    try {
      localStorage.setItem(ONBOARDED_KEY, '0')
    } catch {
      // ignore
    }
    set({
      state,
      showOnboarding: true,
      onboardingPlanted: false,
      showSettings: false,
      showShop: false,
      showLexicon: false,
      showQuests: false,
      showJournal: false,
      showArcade: false,
      statInfo: null,
      photo: null,
      roomView: 'bedroom',
      conflict: null,
    })
    persist(state)
    armTicker()
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

let lastTickPersistAt = 0

/**
 * Pure time-advance updates are fully recomputable from `lastTickAt`, so the
 * fast-tick cadence of speed mode may write storage (and push to the cloud)
 * at the usual relaxed pace. Player actions always persist immediately.
 */
function persistThrottled(state: GameState) {
  const now = Date.now()
  if (now - lastTickPersistAt < 25_000) return
  lastTickPersistAt = now
  persist(state)
}

let tickTimer: number | undefined

/** Speed mode simulates in shorter strides so meters and clock stay smooth. */
function armTicker() {
  window.clearInterval(tickTimer)
  const fast = useGame.getState().state.time.scale > 1
  tickTimer = window.setInterval(() => useGame.getState().tickNow(), fast ? 5_000 : 30_000)
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

  // Onboarding flag: absent = pre-existing garden (or brand new), '0' = started
  // but unfinished (reset / interrupted), '1' = completed.
  let onboarded: string | null = null
  try {
    onboarded = localStorage.getItem(ONBOARDED_KEY)
  } catch {
    // ignore
  }

  const showOnboarding = isFresh ? onboarded !== '1' : onboarded === '0'
  if (showOnboarding && onboarded !== '0') {
    try {
      localStorage.setItem(ONBOARDED_KEY, '0')
    } catch {
      // ignore
    }
  }
  useGame.setState({ state, showOnboarding, onboardingPlanted: !showOnboarding })
  try {
    localStorage.setItem(SAVE_KEY, saveToString(state))
  } catch {
    // ignore
  }

  armTicker()
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      useGame.getState().tickNow()
    } else {
      // Leaving: write the freshest state (tick persists lazily) and push now.
      persist(useGame.getState().state)
      schedulePush(useGame.getState().state, 0)
    }
  })

  void checkSession().then(({ sync, save }) => {
    useGame.setState({ sync })
    if (sync.kind === 'signedIn') reconcileAtStartup(save)
  })
}
