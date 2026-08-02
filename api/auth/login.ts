import type { ServerResponse } from 'node:http'
import { login } from '../_lib/core'
import {
  type ApiRequest,
  rateLimited,
  readJsonBody,
  requireDb,
  send,
  sendResult,
  sessionSecret,
} from '../_lib/http'

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method-not-allowed' })
  if (rateLimited(req, res, 'login')) return
  const db = requireDb(res)
  if (!db) return
  sendResult(res, await login(db, sessionSecret(), await readJsonBody(req)))
}
