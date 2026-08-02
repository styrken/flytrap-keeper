// All account/save behavior as testable functions: (db, secret, input) -> ApiResult.
// The HTTP handlers in api/ are thin adapters over these.
import {
  clearSessionCookie,
  hashSecret,
  makeRecoveryCode,
  newUserId,
  sessionCookie,
  signSession,
  tokenFromCookieHeader,
  verifySecret,
  verifySession,
} from './auth'
import type { Db } from './db'

export interface ApiResult {
  status: number
  body: Record<string, unknown>
  setCookie?: string
}

const USERNAME_RE = /^[a-z0-9_.-]{3,24}$/i
const MIN_PASSWORD = 8
export const MAX_BLOB_BYTES = 64 * 1024

const bad = (status: number, error: string): ApiResult => ({ status, body: { error } })

export async function register(
  db: Db,
  secret: string,
  input: { username?: unknown; password?: unknown },
  now = Date.now(),
): Promise<ApiResult> {
  const username = typeof input.username === 'string' ? input.username.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  if (!USERNAME_RE.test(username)) return bad(400, 'invalid-username')
  if (password.length < MIN_PASSWORD) return bad(400, 'weak-password')

  const recoveryCode = makeRecoveryCode()
  const user = {
    id: newUserId(),
    username,
    pwHash: await hashSecret(password),
    recoveryHash: await hashSecret(recoveryCode),
    createdAt: now,
  }
  const created = await db.createUser(user)
  if (!created) return bad(409, 'username-taken')

  return {
    status: 201,
    body: { username, recoveryCode },
    setCookie: sessionCookie(signSession(user.id, secret, now)),
  }
}

export async function login(
  db: Db,
  secret: string,
  input: { username?: unknown; password?: unknown },
  now = Date.now(),
): Promise<ApiResult> {
  const username = typeof input.username === 'string' ? input.username.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  const user = username ? await db.getUserByUsername(username) : null
  if (!user || !(await verifySecret(password, user.pwHash))) {
    return bad(401, 'invalid-credentials')
  }
  return {
    status: 200,
    body: { username: user.username },
    setCookie: sessionCookie(signSession(user.id, secret, now)),
  }
}

export async function resetPassword(
  db: Db,
  secret: string,
  input: { username?: unknown; recoveryCode?: unknown; newPassword?: unknown },
  now = Date.now(),
): Promise<ApiResult> {
  const username = typeof input.username === 'string' ? input.username.trim() : ''
  const code = typeof input.recoveryCode === 'string' ? input.recoveryCode.trim() : ''
  const newPassword = typeof input.newPassword === 'string' ? input.newPassword : ''
  if (newPassword.length < MIN_PASSWORD) return bad(400, 'weak-password')
  const user = username ? await db.getUserByUsername(username) : null
  if (!user || !(await verifySecret(code, user.recoveryHash))) {
    return bad(401, 'invalid-recovery')
  }
  await db.updatePassword(user.id, await hashSecret(newPassword))
  return {
    status: 200,
    body: { username: user.username },
    setCookie: sessionCookie(signSession(user.id, secret, now)),
  }
}

export const logout = (): ApiResult => ({
  status: 200,
  body: { ok: true },
  setCookie: clearSessionCookie(),
})

export function userIdFromCookie(
  cookieHeader: string | undefined,
  secret: string,
  now = Date.now(),
): string | null {
  const token = tokenFromCookieHeader(cookieHeader)
  return token ? verifySession(token, secret, now) : null
}

/** GET /api/save — who am I, and what does the cloud have? */
export async function getSave(db: Db, userId: string): Promise<ApiResult> {
  const user = await db.getUserById(userId)
  if (!user) return bad(401, 'unknown-user')
  const save = await db.getSave(userId)
  return {
    status: 200,
    body: {
      username: user.username,
      save: save ? { blob: save.blob, updatedAt: save.updatedAt } : null,
    },
  }
}

/** PUT /api/save — last-write-wins; a stale push gets a 409 with the newer save. */
export async function putSave(
  db: Db,
  userId: string,
  input: { blob?: unknown; updatedAt?: unknown },
): Promise<ApiResult> {
  const blob = typeof input.blob === 'string' ? input.blob : null
  const updatedAt = typeof input.updatedAt === 'number' ? input.updatedAt : null
  if (!blob || updatedAt === null) return bad(400, 'invalid-save')
  if (Buffer.byteLength(blob, 'utf8') > MAX_BLOB_BYTES) return bad(413, 'save-too-large')

  const existing = await db.getSave(userId)
  if (existing && existing.updatedAt > updatedAt) {
    return {
      status: 409,
      body: { error: 'stale', save: { blob: existing.blob, updatedAt: existing.updatedAt } },
    }
  }
  await db.putSave({ userId, blob, updatedAt })
  return { status: 200, body: { ok: true, updatedAt } }
}

export async function deleteAccount(db: Db, userId: string): Promise<ApiResult> {
  await db.deleteUser(userId)
  return { status: 200, body: { ok: true }, setCookie: clearSessionCookie() }
}
