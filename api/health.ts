import type { ServerResponse } from 'node:http'

/** Zero-dependency probe: is the function runtime alive, and is the env configured? */
export default function handler(_req: unknown, res: ServerResponse) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(
    JSON.stringify({
      ok: true,
      node: process.version,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    }),
  )
}
