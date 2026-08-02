// Friends/chat/visit client: thin fetch wrappers in the same spirit as sync.ts.
// Every call resolves to a typed result and never throws.

/** Mirrors the server's cap (api/_lib/social.ts) — the server has the final say. */
export const MAX_MESSAGE_LENGTH = 500

export interface FriendInfo {
  username: string
  /** Wall-clock time their save last changed — "last tended", or null. */
  lastTendedAt: number | null
}

export interface FriendLists {
  friends: FriendInfo[]
  incoming: string[]
  outgoing: string[]
}

export interface ChatMessage {
  id: string
  fromMe: boolean
  body: string
  at: number
}

export interface ThreadInfo {
  username: string
  lastAt: number
  lastFromMe: boolean
}

export type SocialResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function api<T>(
  path: string,
  parse: (data: Record<string, unknown>) => T | null,
  init?: RequestInit,
): Promise<SocialResult<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      credentials: 'same-origin',
    })
    let data: Record<string, unknown> = {}
    try {
      data = (await res.json()) as Record<string, unknown>
    } catch {
      // non-JSON (API not deployed) — falls through to the error below
    }
    if (res.status >= 200 && res.status < 300) {
      const parsed = parse(data)
      if (parsed !== null) return { ok: true, data: parsed }
    }
    return { ok: false, error: typeof data.error === 'string' ? data.error : 'unknown' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []

export function fetchFriends(): Promise<SocialResult<FriendLists>> {
  return api('/api/friends', (data) => ({
    friends: Array.isArray(data.friends)
      ? (data.friends as Record<string, unknown>[]).flatMap((entry) =>
          typeof entry.username === 'string'
            ? {
                username: entry.username,
                lastTendedAt: typeof entry.lastTendedAt === 'number' ? entry.lastTendedAt : null,
              }
            : [],
        )
      : [],
    incoming: asStringArray(data.incoming),
    outgoing: asStringArray(data.outgoing),
  }))
}

export function addFriend(username: string): Promise<SocialResult<{ accepted: boolean }>> {
  return api('/api/friends', (data) => ({ accepted: data.accepted === true }), {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
}

export function removeFriendRemote(username: string): Promise<SocialResult<true>> {
  return api('/api/friends', () => true as const, {
    method: 'DELETE',
    body: JSON.stringify({ username }),
  })
}

export function fetchFriendSave(
  username: string,
): Promise<SocialResult<{ username: string; blob: string | null }>> {
  return api(`/api/friends?visit=${encodeURIComponent(username)}`, (data) => {
    if (typeof data.username !== 'string') return null
    const save = data.save as Record<string, unknown> | null
    return {
      username: data.username,
      blob: save && typeof save.blob === 'string' ? save.blob : null,
    }
  })
}

export function fetchThreads(): Promise<SocialResult<ThreadInfo[]>> {
  return api('/api/chat', (data) =>
    Array.isArray(data.threads)
      ? (data.threads as Record<string, unknown>[]).flatMap((entry) =>
          typeof entry.username === 'string' && typeof entry.lastAt === 'number'
            ? {
                username: entry.username,
                lastAt: entry.lastAt,
                lastFromMe: entry.lastFromMe === true,
              }
            : [],
        )
      : [],
  )
}

const asMessages = (value: unknown): ChatMessage[] =>
  Array.isArray(value)
    ? (value as Record<string, unknown>[]).flatMap((entry) =>
        typeof entry.id === 'string' &&
        typeof entry.body === 'string' &&
        typeof entry.at === 'number'
          ? { id: entry.id, fromMe: entry.fromMe === true, body: entry.body, at: entry.at }
          : [],
      )
    : []

export function fetchChat(username: string, since = 0): Promise<SocialResult<ChatMessage[]>> {
  const query = since > 0 ? `&since=${since}` : ''
  return api(`/api/chat?with=${encodeURIComponent(username)}${query}`, (data) =>
    asMessages(data.messages),
  )
}

export function sendChatMessage(to: string, body: string): Promise<SocialResult<ChatMessage>> {
  return api(
    '/api/chat',
    (data) => {
      const [message] = asMessages([data.message])
      return message ?? null
    },
    { method: 'POST', body: JSON.stringify({ to, body }) },
  )
}
