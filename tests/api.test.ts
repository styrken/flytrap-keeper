import { describe, expect, it } from 'vitest'
import {
  MAX_BLOB_BYTES,
  deleteAccount,
  getSave,
  login,
  putSave,
  register,
  resetPassword,
  userIdFromCookie,
} from '../api/_lib/core'
import { createMemoryDb } from '../api/_lib/db'

const SECRET = 'test-secret'

const registerOk = async (db = createMemoryDb()) => {
  const result = await register(db, SECRET, { username: 'rasmus', password: 'hemmeligt123' })
  expect(result.status).toBe(201)
  return { db, result }
}

const cookieHeader = (setCookie: string | undefined) => setCookie?.split(';')[0]

describe('register', () => {
  it('creates a user, returns a recovery code, and signs in via cookie', async () => {
    const { result } = await registerOk()
    expect(result.body.username).toBe('rasmus')
    expect(result.body.recoveryCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(result.setCookie).toContain('fk_session=')
    expect(result.setCookie).toContain('HttpOnly')
    const userId = userIdFromCookie(cookieHeader(result.setCookie), SECRET)
    expect(userId).toBeTruthy()
  })

  it('rejects taken usernames, bad usernames, and weak passwords', async () => {
    const { db } = await registerOk()
    const dup = await register(db, SECRET, { username: 'rasmus', password: 'hemmeligt123' })
    expect(dup.status).toBe(409)
    const badName = await register(db, SECRET, { username: 'x', password: 'hemmeligt123' })
    expect(badName.status).toBe(400)
    const weak = await register(db, SECRET, { username: 'nyplante', password: 'kort' })
    expect(weak.status).toBe(400)
  })
})

describe('login and reset', () => {
  it('logs in with correct credentials only', async () => {
    const { db } = await registerOk()
    expect((await login(db, SECRET, { username: 'rasmus', password: 'hemmeligt123' })).status).toBe(
      200,
    )
    expect((await login(db, SECRET, { username: 'rasmus', password: 'forkert123' })).status).toBe(
      401,
    )
    expect(
      (await login(db, SECRET, { username: 'findesikke', password: 'x'.repeat(10) })).status,
    ).toBe(401)
  })

  it('resets the password with the recovery code', async () => {
    const { db, result } = await registerOk()
    const code = result.body.recoveryCode as string
    const wrong = await resetPassword(db, SECRET, {
      username: 'rasmus',
      recoveryCode: 'AAAA-AAAA-AAAA',
      newPassword: 'nytkodeord123',
    })
    expect(wrong.status).toBe(401)
    const ok = await resetPassword(db, SECRET, {
      username: 'rasmus',
      recoveryCode: code,
      newPassword: 'nytkodeord123',
    })
    expect(ok.status).toBe(200)
    expect(
      (await login(db, SECRET, { username: 'rasmus', password: 'nytkodeord123' })).status,
    ).toBe(200)
    expect((await login(db, SECRET, { username: 'rasmus', password: 'hemmeligt123' })).status).toBe(
      401,
    )
  })

  it('rejects tampered session cookies', () => {
    expect(userIdFromCookie('fk_session=abc.def', SECRET)).toBeNull()
    expect(userIdFromCookie(undefined, SECRET)).toBeNull()
  })
})

describe('save sync', () => {
  const signedInUser = async () => {
    const { db, result } = await registerOk()
    const userId = userIdFromCookie(cookieHeader(result.setCookie), SECRET)!
    return { db, userId }
  }

  it('round-trips the save blob with last-write-wins', async () => {
    const { db, userId } = await signedInUser()
    expect((await getSave(db, userId)).body.save).toBeNull()

    await putSave(db, userId, { blob: '{"v":1}', updatedAt: 1000 })
    const fetched = await getSave(db, userId)
    expect(fetched.body.username).toBe('rasmus')
    expect(fetched.body.save).toEqual({ blob: '{"v":1}', updatedAt: 1000 })

    const newer = await putSave(db, userId, { blob: '{"v":2}', updatedAt: 2000 })
    expect(newer.status).toBe(200)
  })

  it('answers a stale push with 409 and the newer save', async () => {
    const { db, userId } = await signedInUser()
    await putSave(db, userId, { blob: '{"v":2}', updatedAt: 2000 })
    const stale = await putSave(db, userId, { blob: '{"v":1}', updatedAt: 1000 })
    expect(stale.status).toBe(409)
    expect((stale.body.save as { updatedAt: number }).updatedAt).toBe(2000)
  })

  it('rejects oversized and malformed saves', async () => {
    const { db, userId } = await signedInUser()
    expect(
      (await putSave(db, userId, { blob: 'x'.repeat(MAX_BLOB_BYTES + 1), updatedAt: 1 })).status,
    ).toBe(413)
    expect((await putSave(db, userId, { blob: 123, updatedAt: 1 })).status).toBe(400)
  })

  it('deletes the account and its save', async () => {
    const { db, userId } = await signedInUser()
    await putSave(db, userId, { blob: '{}', updatedAt: 1 })
    const result = await deleteAccount(db, userId)
    expect(result.status).toBe(200)
    expect(await db.getUserById(userId)).toBeNull()
    expect(await db.getSave(userId)).toBeNull()
  })
})
