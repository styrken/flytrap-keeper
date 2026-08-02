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
import { friendSave, listFriends, removeFriend, requestFriend } from './_lib/social.js'

export default function handler(req: ApiRequest, res: ServerResponse) {
  return guard(res, async () => {
    const db = requireDb(res)
    if (!db) return
    const userId = userIdFromCookie(req.headers.cookie, sessionSecret())
    if (!userId) return send(res, 401, { error: 'not-signed-in' })

    if (req.method === 'GET') {
      const visit = new URL(req.url ?? '/', 'http://x').searchParams.get('visit')
      if (visit) return sendResult(res, await friendSave(db, userId, visit))
      return sendResult(res, await listFriends(db, userId))
    }
    if (req.method === 'POST') {
      if (rateLimited(req, res, 'friends')) return
      return sendResult(res, await requestFriend(db, userId, await readJsonBody(req)))
    }
    if (req.method === 'DELETE') {
      return sendResult(res, await removeFriend(db, userId, await readJsonBody(req)))
    }
    send(res, 405, { error: 'method-not-allowed' })
  })
}
