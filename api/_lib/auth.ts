import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'

const SCRYPT_KEYLEN = 32

export function hashSecret(secret: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16)
    scrypt(secret, salt, SCRYPT_KEYLEN, (err, derived) => {
      if (err) reject(err)
      else resolve(`s1:${salt.toString('base64url')}:${derived.toString('base64url')}`)
    })
  })
}

export function verifySecret(secret: string, stored: string): Promise<boolean> {
  return new Promise((resolve) => {
    const [version, saltB64, hashB64] = stored.split(':')
    if (version !== 's1' || !saltB64 || !hashB64) return resolve(false)
    const salt = Buffer.from(saltB64, 'base64url')
    const expected = Buffer.from(hashB64, 'base64url')
    scrypt(secret, salt, SCRYPT_KEYLEN, (err, derived) => {
      if (err || derived.length !== expected.length) return resolve(false)
      resolve(timingSafeEqual(derived, expected))
    })
  })
}

/** 12 readable characters, grouped: XXXX-XXXX-XXXX. Shown exactly once. */
export function makeRecoveryCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'
  const bytes = randomBytes(12)
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`
}

export const newUserId = () => randomUUID()

const SESSION_DAYS = 90

export function signSession(userId: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: now + SESSION_DAYS * 86_400_000 }),
  ).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifySession(token: string, secret: string, now = Date.now()): string | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      sub?: string
      exp?: number
    }
    if (typeof data.sub !== 'string' || typeof data.exp !== 'number') return null
    if (data.exp < now) return null
    return data.sub
  } catch {
    return null
  }
}

export const SESSION_COOKIE = 'fk_session'

export function sessionCookie(token: string): string {
  const maxAge = SESSION_DAYS * 86_400
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; Secure`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`
}

export function tokenFromCookieHeader(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === SESSION_COOKIE) return rest.join('=') || null
  }
  return null
}
