import type { ServerResponse } from 'node:http'
import { logout } from '../_lib/core'
import { type ApiRequest, send, sendResult } from '../_lib/http'

export default function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method-not-allowed' })
  sendResult(res, logout())
}
