import { create } from 'zustand'
import { type GameState, loadFromString, tick } from './sim'
import {
  type ChatMessage,
  type FriendInfo,
  type ThreadInfo,
  addFriend,
  fetchChat,
  fetchFriendSave,
  fetchFriends,
  fetchThreads,
  removeFriendRemote,
  sendChatMessage,
} from './social'
import { useGame } from './store'

const SEEN_KEY = 'flytrap-keeper:chat-seen'

function loadSeen(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (typeof parsed !== 'object' || parsed === null) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number',
      ),
    )
  } catch {
    return {}
  }
}

/** Threads with a message from the friend newer than what we've opened. */
export function countUnread(threads: ThreadInfo[], lastSeen: Record<string, number>): number {
  return threads.filter(
    (thread) => !thread.lastFromMe && thread.lastAt > (lastSeen[thread.username] ?? 0),
  ).length
}

/** Unread chats + pending requests — the HUD pip runs on this. */
export function useFriendsPip(): boolean {
  const threads = useSocial((s) => s.threads)
  const lastSeen = useSocial((s) => s.lastSeen)
  const incoming = useSocial((s) => s.incoming)
  return incoming.length > 0 || countUnread(threads, lastSeen) > 0
}

export interface Visiting {
  username: string
  state: GameState
}

interface SocialStore {
  loaded: boolean
  friends: FriendInfo[]
  incoming: string[]
  outgoing: string[]
  threads: ThreadInfo[]
  lastSeen: Record<string, number>
  showFriends: boolean
  /** Username of the open chat thread inside the dialog, if any. */
  chatWith: string | null
  messages: Record<string, ChatMessage[]>
  visiting: Visiting | null
  visitLoading: string | null
  setShowFriends: (show: boolean) => void
  refreshFriends: () => Promise<void>
  refreshThreads: () => Promise<void>
  /** Send (or accept) a friend request; resolves to an error key or null. */
  submitAdd: (username: string) => Promise<string | null>
  removeFriend: (username: string) => Promise<void>
  openChat: (username: string | null) => void
  /** Pull new messages for the open thread (append-only, deduplicated). */
  pollChat: () => Promise<void>
  sendMessage: (body: string) => Promise<string | null>
  markSeen: (username: string) => void
  startVisit: (username: string) => Promise<string | null>
  endVisit: () => void
  /** Advance the visited garden's clock so meters stay honest during long stays. */
  retickVisit: () => void
}

const signedIn = () => useGame.getState().sync.kind === 'signedIn'

export const useSocial = create<SocialStore>()((set, get) => ({
  loaded: false,
  friends: [],
  incoming: [],
  outgoing: [],
  threads: [],
  lastSeen: loadSeen(),
  showFriends: false,
  chatWith: null,
  messages: {},
  visiting: null,
  visitLoading: null,
  setShowFriends: (show) => {
    set({ showFriends: show, ...(show ? {} : { chatWith: null }) })
    if (show && signedIn()) {
      void get().refreshFriends()
      void get().refreshThreads()
    }
  },
  refreshFriends: async () => {
    const result = await fetchFriends()
    if (result.ok) set({ ...result.data, loaded: true })
  },
  refreshThreads: async () => {
    const result = await fetchThreads()
    if (result.ok) set({ threads: result.data })
  },
  submitAdd: async (username) => {
    const name = username.trim()
    if (!name) return null
    const result = await addFriend(name)
    if (!result.ok) return result.error
    await get().refreshFriends()
    return null
  },
  removeFriend: async (username) => {
    await removeFriendRemote(username)
    if (get().chatWith === username) set({ chatWith: null })
    await get().refreshFriends()
  },
  openChat: (username) => {
    set({ chatWith: username })
    if (username) {
      get().markSeen(username)
      void get().pollChat()
    }
  },
  pollChat: async () => {
    const username = get().chatWith
    if (!username) return
    const existing = get().messages[username] ?? []
    const since = existing[existing.length - 1]?.at ?? 0
    const result = await fetchChat(username, since)
    if (!result.ok || get().chatWith !== username) return
    if (result.data.length > 0) {
      const known = new Set(existing.map((message) => message.id))
      const fresh = result.data.filter((message) => !known.has(message.id))
      if (fresh.length > 0) {
        set({ messages: { ...get().messages, [username]: [...existing, ...fresh] } })
      }
      get().markSeen(username)
    }
  },
  sendMessage: async (body) => {
    const username = get().chatWith
    const trimmed = body.trim()
    if (!username || !trimmed) return null
    const result = await sendChatMessage(username, trimmed)
    if (!result.ok) return result.error
    const existing = get().messages[username] ?? []
    set({ messages: { ...get().messages, [username]: [...existing, result.data] } })
    get().markSeen(username)
    return null
  },
  markSeen: (username) => {
    const lastSeen = { ...get().lastSeen, [username]: Date.now() }
    set({ lastSeen })
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(lastSeen))
    } catch {
      // ignore
    }
  },
  startVisit: async (username) => {
    set({ visitLoading: username })
    const result = await fetchFriendSave(username)
    if (get().visitLoading !== username) return null // visit was abandoned meanwhile
    set({ visitLoading: null })
    if (!result.ok) return result.error
    if (!result.data.blob) return 'empty'
    const parsed = loadFromString(result.data.blob)
    if (!parsed) return 'unreadable'
    set({
      visiting: { username: result.data.username, state: tick(parsed, Date.now()) },
      showFriends: false,
    })
    useGame.getState().setRoomView('bedroom')
    return null
  },
  endVisit: () => {
    set({ visiting: null })
    useGame.getState().setRoomView('bedroom')
  },
  retickVisit: () => {
    const visiting = get().visiting
    if (!visiting) return
    set({ visiting: { ...visiting, state: tick(visiting.state, Date.now()) } })
  },
}))

let pollTimer: number | undefined

/** Wire the social layer to sign-in state and keep the unread badge fresh. */
export function initSocial() {
  const refreshAll = () => {
    void useSocial.getState().refreshFriends()
    void useSocial.getState().refreshThreads()
  }
  useGame.subscribe((state, prev) => {
    if (state.sync.kind === 'signedIn' && prev.sync.kind !== 'signedIn') refreshAll()
    if (state.sync.kind !== 'signedIn' && prev.sync.kind === 'signedIn') {
      useSocial.setState({
        loaded: false,
        friends: [],
        incoming: [],
        outgoing: [],
        threads: [],
        messages: {},
        chatWith: null,
        visiting: null,
        showFriends: false,
      })
    }
  })
  if (signedIn()) refreshAll()

  window.clearInterval(pollTimer)
  pollTimer = window.setInterval(() => {
    if (!signedIn() || document.visibilityState !== 'visible') return
    void useSocial.getState().refreshThreads()
  }, 90_000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && signedIn()) void useSocial.getState().refreshThreads()
  })
}
