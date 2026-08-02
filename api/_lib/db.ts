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

export interface Db {
  getUserByUsername(username: string): Promise<UserRow | null>
  getUserById(id: string): Promise<UserRow | null>
  /** Returns false when the username is already taken. */
  createUser(row: UserRow): Promise<boolean>
  updatePassword(userId: string, pwHash: string): Promise<void>
  getSave(userId: string): Promise<SaveRow | null>
  putSave(row: SaveRow): Promise<void>
  deleteUser(userId: string): Promise<void>
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
    async putSave(row) {
      await ensureSchema()
      await sql`INSERT INTO saves (user_id, blob, updated_at)
        VALUES (${row.userId}, ${row.blob}, ${row.updatedAt})
        ON CONFLICT (user_id) DO UPDATE SET blob = ${row.blob}, updated_at = ${row.updatedAt}`
    },
    async deleteUser(userId) {
      await ensureSchema()
      await sql`DELETE FROM saves WHERE user_id = ${userId}`
      await sql`DELETE FROM users WHERE id = ${userId}`
    },
  }
}

/** In-memory implementation for tests (and nothing else). */
export function createMemoryDb(): Db {
  const users = new Map<string, UserRow>()
  const saves = new Map<string, SaveRow>()
  return {
    async getUserByUsername(username) {
      for (const user of users.values()) if (user.username === username) return user
      return null
    },
    async getUserById(id) {
      return users.get(id) ?? null
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
    async putSave(row) {
      saves.set(row.userId, row)
    },
    async deleteUser(userId) {
      users.delete(userId)
      saves.delete(userId)
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
