import type { ServerResponse } from 'node:http'
import { register } from '../_lib/core'
import {
  type ApiRequest,
  guard,
  rateLimited,
  readJsonBody,
  requireDb,
  send,
  sendResult,
  sessionSecret,
} from '../_lib/http'

export default function handler(req: ApiRequest, res: ServerResponse) {
  return guard(res, async () => {
    if (req.method !== 'POST') return send(res, 405, { error: 'method-not-allowed' })
    if (rateLimited(req, res, 'register')) return
    const db = requireDb(res)
    if (!db) return
    sendResult(res, await register(db, sessionSecret(), await readJsonBody(req)))
  })
}
