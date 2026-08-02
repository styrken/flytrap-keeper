// Storage behind the account API. The game state itself is an opaque blob —
// the server stores it, it never interprets it (no anti-cheat by design).
import { neon } from '@neondatabase/serverless'

export interface UserRow {
  id: string
  username: string
  pwHash: string
  recoveryHash: string
  createdAt: number
}

export interface SaveRow {
  userId: string
  blob: string
  updatedAt: number
}

export type FriendLinkStatus = 'pending' | 'accepted'

/** A friendship or a pending request — one row per pair, from = who asked. */
export interface FriendLinkRow {
  id: string
  fromId: string
  toId: string
  status: FriendLinkStatus
  createdAt: number
}

export interface MessageRow {
  id: string
  fromId: string
  toId: string
  body: string
  sentAt: number
}

export interface Db {
  getUserByUsername(username: string): Promise<UserRow | null>
  getUserById(id: string): Promise<UserRow | null>
  getUsersByIds(ids: string[]): Promise<UserRow[]>
  /** Returns false when the username is already taken. */
  createUser(row: UserRow): Promise<boolean>
  updatePassword(userId: string, pwHash: string): Promise<void>
  getSave(userId: string): Promise<SaveRow | null>
  /** updatedAt per user (no blobs) — the friends list shows "last tended". */
  getSaveMeta(ids: string[]): Promise<{ userId: string; updatedAt: number }[]>
  putSave(row: SaveRow): Promise<void>
  deleteUser(userId: string): Promise<void>
  /** Every link (pending or accepted) that involves the user. */
  listFriendLinks(userId: string): Promise<FriendLinkRow[]>
  /** The link between two users in either direction, if any. */
  getFriendLink(userA: string, userB: string): Promise<FriendLinkRow | null>
  /** Returns false when a link between the pair already exists. */
  createFriendLink(row: FriendLinkRow): Promise<boolean>
  setFriendLinkStatus(id: string, status: FriendLinkStatus): Promise<void>
  deleteFriendLink(userA: string, userB: string): Promise<void>
  createMessage(row: MessageRow): Promise<void>
  /** Both directions between the pair, oldest first, after `afterTs`, capped. */
  listMessages(userA: string, userB: string, afterTs: number, limit: number): Promise<MessageRow[]>
  /** The newest message of each conversation the user is part of. */
  listLatestMessages(userId: string): Promise<MessageRow[]>
}

/** Postgres (Neon) implementation used in production. */
export function createNeonDb(databaseUrl: string): Db {
  const sql = neon(databaseUrl)
  let ready: Promise<void> | null = null
  const ensureSchema = () => {
    ready ??= (async () => {
      await sql`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        pw_hash TEXT NOT NULL,
        recovery_hash TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`
      await sql`CREATE TABLE IF NOT EXISTS saves (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        blob TEXT NOT NULL,
        updated_at BIGINT NOT NULL
      )`
      await sql`CREATE TABLE IF NOT EXISTS friend_links (
        id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS friend_links_pair
        ON friend_links (LEAST(from_id, to_id), GREATEST(from_id, to_id))`
      await sql`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        sent_at BIGINT NOT NULL
      )`
      await sql`CREATE INDEX IF NOT EXISTS messages_pair_time
        ON messages (LEAST(from_id, to_id), GREATEST(from_id, to_id), sent_at)`
    })()
    return ready
  }

  const toUser = (row: Record<string, unknown>): UserRow => ({
    id: row.id as string,
    username: row.username as string,
    pwHash: row.pw_hash as string,
    recoveryHash: row.recovery_hash as string,
    createdAt: Number(row.created_at),
  })

  const toLink = (row: Record<string, unknown>): FriendLinkRow => ({
    id: row.id as string,
    fromId: row.from_id as string,
    toId: row.to_id as string,
    status: row.status as FriendLinkStatus,
    createdAt: Number(row.created_at),
  })

  const toMessage = (row: Record<string, unknown>): MessageRow => ({
    id: row.id as string,
    fromId: row.from_id as string,
    toId: row.to_id as string,
    body: row.body as string,
    sentAt: Number(row.sent_at),
  })

  return {
    async getUserByUsername(username) {
      await ensureSchema()
      const rows = await sql`SELECT * FROM users WHERE username = ${username}`
      return rows[0] ? toUser(rows[0]) : null
    },
    async getUserById(id) {
      await ensureSchema()
      const rows = await sql`SELECT * FROM users WHERE id = ${id}`
      return rows[0] ? toUser(rows[0]) : null
    },
    async getUsersByIds(ids) {
      if (ids.length === 0) return []
      await ensureSchema()
      const rows = await sql`SELECT * FROM users WHERE id = ANY(${ids})`
      return rows.map(toUser)
    },
    async createUser(row) {
      await ensureSchema()
      try {
        await sql`INSERT INTO users (id, username, pw_hash, recovery_hash, created_at)
          VALUES (${row.id}, ${row.username}, ${row.pwHash}, ${row.recoveryHash}, ${row.createdAt})`
        return true
      } catch {
        return false // unique violation: username taken
      }
    },
    async updatePassword(userId, pwHash) {
      await ensureSchema()
      await sql`UPDATE users SET pw_hash = ${pwHash} WHERE id = ${userId}`
    },
    async getSave(userId) {
      await ensureSchema()
      const rows = await sql`SELECT * FROM saves WHERE user_id = ${userId}`
      const row = rows[0]
      if (!row) return null
      return {
        userId: row.user_id as string,
        blob: row.blob as string,
        updatedAt: Number(row.updated_at),
      }
    },
    async getSaveMeta(ids) {
      if (ids.length === 0) return []
      await ensureSchema()
      const rows = await sql`SELECT user_id, updated_at FROM saves WHERE user_id = ANY(${ids})`
      return rows.map((row) => ({
        userId: row.user_id as string,
        updatedAt: Number(row.updated_at),
      }))
    },
    async putSave(row) {
      await ensureSchema()
      await sql`INSERT INTO saves (user_id, blob, updated_at)
        VALUES (${row.userId}, ${row.blob}, ${row.updatedAt})
        ON CONFLICT (user_id) DO UPDATE SET blob = ${row.blob}, updated_at = ${row.updatedAt}`
    },
    async deleteUser(userId) {
      await ensureSchema()
      await sql`DELETE FROM messages WHERE from_id = ${userId} OR to_id = ${userId}`
      await sql`DELETE FROM friend_links WHERE from_id = ${userId} OR to_id = ${userId}`
      await sql`DELETE FROM saves WHERE user_id = ${userId}`
      await sql`DELETE FROM users WHERE id = ${userId}`
    },
    async listFriendLinks(userId) {
      await ensureSchema()
      const rows = await sql`SELECT * FROM friend_links
        WHERE from_id = ${userId} OR to_id = ${userId}
        ORDER BY created_at`
      return rows.map(toLink)
    },
    async getFriendLink(userA, userB) {
      await ensureSchema()
      const rows = await sql`SELECT * FROM friend_links
        WHERE (from_id = ${userA} AND to_id = ${userB})
           OR (from_id = ${userB} AND to_id = ${userA})`
      return rows[0] ? toLink(rows[0]) : null
    },
    async createFriendLink(row) {
      await ensureSchema()
      try {
        await sql`INSERT INTO friend_links (id, from_id, to_id, status, created_at)
          VALUES (${row.id}, ${row.fromId}, ${row.toId}, ${row.status}, ${row.createdAt})`
        return true
      } catch {
        return false // unique violation: the pair is already linked
      }
    },
    async setFriendLinkStatus(id, status) {
      await ensureSchema()
      await sql`UPDATE friend_links SET status = ${status} WHERE id = ${id}`
    },
    async deleteFriendLink(userA, userB) {
      await ensureSchema()
      await sql`DELETE FROM friend_links
        WHERE (from_id = ${userA} AND to_id = ${userB})
           OR (from_id = ${userB} AND to_id = ${userA})`
    },
    async createMessage(row) {
      await ensureSchema()
      await sql`INSERT INTO messages (id, from_id, to_id, body, sent_at)
        VALUES (${row.id}, ${row.fromId}, ${row.toId}, ${row.body}, ${row.sentAt})`
    },
    async listMessages(userA, userB, afterTs, limit) {
      await ensureSchema()
      // Newest N after the cursor, returned oldest-first for rendering.
      const rows = await sql`SELECT * FROM (
          SELECT * FROM messages
          WHERE ((from_id = ${userA} AND to_id = ${userB})
              OR (from_id = ${userB} AND to_id = ${userA}))
            AND sent_at > ${afterTs}
          ORDER BY sent_at DESC, id DESC
          LIMIT ${limit}
        ) newest ORDER BY sent_at ASC, id ASC`
      return rows.map(toMessage)
    },
    async listLatestMessages(userId) {
      await ensureSchema()
      const rows = await sql`SELECT DISTINCT ON (LEAST(from_id, to_id), GREATEST(from_id, to_id)) *
        FROM messages
        WHERE from_id = ${userId} OR to_id = ${userId}
        ORDER BY LEAST(from_id, to_id), GREATEST(from_id, to_id), sent_at DESC, id DESC`
      return rows.map(toMessage)
    },
  }
}

/** In-memory implementation for tests (and nothing else). */
export function createMemoryDb(): Db {
  const users = new Map<string, UserRow>()
  const saves = new Map<string, SaveRow>()
  const links = new Map<string, FriendLinkRow>()
  const messages: MessageRow[] = []
  const linksBetween = (a: string, b: string) =>
    [...links.values()].filter(
      (link) => (link.fromId === a && link.toId === b) || (link.fromId === b && link.toId === a),
    )
  return {
    async getUserByUsername(username) {
      for (const user of users.values()) if (user.username === username) return user
      return null
    },
    async getUserById(id) {
      return users.get(id) ?? null
    },
    async getUsersByIds(ids) {
      return ids.flatMap((id) => users.get(id) ?? [])
    },
    async createUser(row) {
      for (const user of users.values()) if (user.username === row.username) return false
      users.set(row.id, row)
      return true
    },
    async updatePassword(userId, pwHash) {
      const user = users.get(userId)
      if (user) users.set(userId, { ...user, pwHash })
    },
    async getSave(userId) {
      return saves.get(userId) ?? null
    },
    async getSaveMeta(ids) {
      return ids.flatMap((id) => {
        const save = saves.get(id)
        return save ? { userId: id, updatedAt: save.updatedAt } : []
      })
    },
    async putSave(row) {
      saves.set(row.userId, row)
    },
    async deleteUser(userId) {
      users.delete(userId)
      saves.delete(userId)
      for (const link of [...links.values()]) {
        if (link.fromId === userId || link.toId === userId) links.delete(link.id)
      }
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].fromId === userId || messages[i].toId === userId) messages.splice(i, 1)
      }
    },
    async listFriendLinks(userId) {
      return [...links.values()]
        .filter((link) => link.fromId === userId || link.toId === userId)
        .sort((a, b) => a.createdAt - b.createdAt)
    },
    async getFriendLink(userA, userB) {
      return linksBetween(userA, userB)[0] ?? null
    },
    async createFriendLink(row) {
      if (linksBetween(row.fromId, row.toId).length > 0) return false
      links.set(row.id, row)
      return true
    },
    async setFriendLinkStatus(id, status) {
      const link = links.get(id)
      if (link) links.set(id, { ...link, status })
    },
    async deleteFriendLink(userA, userB) {
      for (const link of linksBetween(userA, userB)) links.delete(link.id)
    },
    async createMessage(row) {
      messages.push(row)
    },
    async listMessages(userA, userB, afterTs, limit) {
      const between = messages
        .filter(
          (msg) =>
            ((msg.fromId === userA && msg.toId === userB) ||
              (msg.fromId === userB && msg.toId === userA)) &&
            msg.sentAt > afterTs,
        )
        .sort((a, b) => a.sentAt - b.sentAt || (a.id < b.id ? -1 : 1))
      return between.slice(-limit)
    },
    async listLatestMessages(userId) {
      const latest = new Map<string, MessageRow>()
      for (const msg of messages) {
        if (msg.fromId !== userId && msg.toId !== userId) continue
        const pair = [msg.fromId, msg.toId].sort().join(':')
        const seen = latest.get(pair)
        if (!seen || msg.sentAt >= seen.sentAt) latest.set(pair, msg)
      }
      return [...latest.values()]
    },
  }
}

let singleton: Db | null | undefined
/** Db from the environment — null when DATABASE_URL is missing or unusable (cloud sync off). */
export function getDb(): Db | null {
  if (singleton !== undefined) return singleton
  const url = process.env.DATABASE_URL
  try {
    singleton = url ? createNeonDb(url) : null
  } catch (err) {
    console.error('[api] database init failed:', err)
    singleton = null
  }
  return singleton
}
