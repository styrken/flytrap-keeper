import type { ServerResponse } from 'node:http'
import { userIdFromCookie } from './_lib/core.js'
import {
  type ApiRequest,
  guard,
  rateLimited,
  readJsonBody,
  requireDb,
  send,
  sendResult,
  sessionSecret,
} from './_lib/http.js'
import { listChat, listThreads, sendChat } from './_lib/social.js'

export default function handler(req: ApiRequest, res: ServerResponse) {
  return guard(res, async () => {
    const db = requireDb(res)
    if (!db) return
    const userId = userIdFromCookie(req.headers.cookie, sessionSecret())
    if (!userId) return send(res, 401, { error: 'not-signed-in' })

    if (req.method === 'GET') {
      const params = new URL(req.url ?? '/', 'http://x').searchParams
      const withUser = params.get('with')
      if (!withUser) return sendResult(res, await listThreads(db, userId))
      const since = Number(params.get('since') ?? 0)
      return sendResult(res, await listChat(db, userId, withUser, since))
    }
    if (req.method === 'POST') {
      // Chattier than auth: a friendly ceiling, not a conversation killer.
      if (rateLimited(req, res, 'chat', 120)) return
      return sendResult(res, await sendChat(db, userId, await readJsonBody(req)))
    }
    send(res, 405, { error: 'method-not-allowed' })
  })
}
