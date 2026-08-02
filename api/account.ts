import type { ServerResponse } from 'node:http'
import { deleteAccount, userIdFromCookie } from './_lib/core'
import { type ApiRequest, guard, requireDb, send, sendResult, sessionSecret } from './_lib/http'

export default function handler(req: ApiRequest, res: ServerResponse) {
  return guard(res, async () => {
    if (req.method !== 'DELETE') return send(res, 405, { error: 'method-not-allowed' })
    const db = requireDb(res)
    if (!db) return
    const userId = userIdFromCookie(req.headers.cookie, sessionSecret())
    if (!userId) return send(res, 401, { error: 'not-signed-in' })
    sendResult(res, await deleteAccount(db, userId))
  })
}
