import type { ServerResponse } from 'node:http'
import { logout } from '../_lib/core.js'
import { type ApiRequest, guard, send, sendResult } from '../_lib/http.js'

export default function handler(req: ApiRequest, res: ServerResponse) {
  return guard(res, () => {
    if (req.method !== 'POST') return send(res, 405, { error: 'method-not-allowed' })
    sendResult(res, logout())
  })
}
