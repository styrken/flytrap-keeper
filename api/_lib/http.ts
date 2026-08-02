// Minimal HTTP plumbing for Vercel Node functions — no framework, no deps.
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ApiResult } from './core.js'
import { getDb } from './db.js'
import type { Db } from './db.js'

export type ApiRequest = IncomingMessage & { body?: unknown }

export function sendResult(res: ServerResponse, result: ApiResult) {
  if (result.setCookie) res.setHeader('Set-Cookie', result.setCookie)
  res.statusCode = result.status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(result.body))
}

export const send = (res: ServerResponse, status: number, body: Record<string, unknown>) =>
  sendResult(res, { status, body })

/** Vercel parses JSON bodies into req.body; fall back to reading the stream. */
export async function readJsonBody(req: ApiRequest): Promise<Record<string, unknown>> {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  if (chunks.length === 0) return {}
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function sessionSecret(): string {
  return process.env.SESSION_SECRET || 'dev-secret-change-me'
}

/** Last-resort guard: any unhandled error becomes a logged JSON 500, never a platform crash. */
export async function guard(res: ServerResponse, fn: () => void | Promise<void>) {
  try {
    await fn()
  } catch (err) {
    console.error('[api] unhandled error:', err)
    if (!res.headersSent) send(res, 500, { error: 'internal' })
  }
}

/** Db or a friendly 503 — the game works fine without cloud sync configured. */
export function requireDb(res: ServerResponse): Db | null {
  const db = getDb()
  if (!db) send(res, 503, { error: 'sync-not-configured' })
  return db
}

// Best-effort per-instance rate limit for the auth endpoints.
const hits = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 10 * 60_000
const MAX_HITS = 20

export function rateLimited(req: IncomingMessage, res: ServerResponse, route: string): boolean {
  const forwarded = req.headers['x-forwarded-for']
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() ?? 'local'
  const key = `${route}:${ip}`
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  if (entry.count > MAX_HITS) {
    send(res, 429, { error: 'rate-limited' })
    return true
  }
  return false
}
