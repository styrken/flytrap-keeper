import type { ServerResponse } from 'node:http'
import { getSave, putSave, userIdFromCookie } from './_lib/core.js'
import {
  type ApiRequest,
  guard,
  readJsonBody,
  requireDb,
  send,
  sendResult,
  sessionSecret,
} from './_lib/http.js'

export default function handler(req: ApiRequest, res: ServerResponse) {
  return guard(res, async () => {
    const db = requireDb(res)
    if (!db) return
    const userId = userIdFromCookie(req.headers.cookie, sessionSecret())
    if (!userId) return send(res, 401, { error: 'not-signed-in' })

    if (req.method === 'GET') return sendResult(res, await getSave(db, userId))
    if (req.method === 'PUT') {
      return sendResult(res, await putSave(db, userId, await readJsonBody(req)))
    }
    send(res, 405, { error: 'method-not-allowed' })
  })
}
