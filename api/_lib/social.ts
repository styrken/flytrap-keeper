// Friends, chat, and room visits as testable functions — same shape as core.ts.
// The server stays dumb about game state: a visit just hands over the friend's
// save blob, and the client renders the room read-only.
import { randomUUID } from 'node:crypto'
import type { ApiResult } from './core.js'
import type { Db, FriendLinkRow, MessageRow, UserRow } from './db.js'

export const MAX_FRIENDS = 30
export const MAX_MESSAGE_LENGTH = 500
export const CHAT_FETCH_LIMIT = 200

const bad = (status: number, error: string): ApiResult => ({ status, body: { error } })

const asName = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const isAccepted = (link: FriendLinkRow) => link.status === 'accepted'

/** The other end of a link or message, from `userId`'s point of view. */
const otherId = (row: { fromId: string; toId: string }, userId: string) =>
  row.fromId === userId ? row.toId : row.fromId

async function acceptedFriend(db: Db, userId: string, username: string): Promise<UserRow | null> {
  const other = username ? await db.getUserByUsername(username) : null
  if (!other || other.id === userId) return null
  const link = await db.getFriendLink(userId, other.id)
  return link && isAccepted(link) ? other : null
}

/** GET /api/friends — friends plus pending requests, in usernames. */
export async function listFriends(db: Db, userId: string): Promise<ApiResult> {
  const links = await db.listFriendLinks(userId)
  const ids = links.map((link) => otherId(link, userId))
  const users = await db.getUsersByIds(ids)
  const names = new Map(users.map((user) => [user.id, user.username]))

  const friendLinks = links.filter(isAccepted)
  const meta = await db.getSaveMeta(friendLinks.map((link) => otherId(link, userId)))
  const lastTended = new Map(meta.map((entry) => [entry.userId, entry.updatedAt]))

  const friends = friendLinks.flatMap((link) => {
    const id = otherId(link, userId)
    const username = names.get(id)
    return username ? { username, lastTendedAt: lastTended.get(id) ?? null } : []
  })
  const nameOf = (link: FriendLinkRow) => names.get(otherId(link, userId))
  return {
    status: 200,
    body: {
      friends,
      incoming: links
        .filter((link) => !isAccepted(link) && link.toId === userId)
        .flatMap((link) => nameOf(link) ?? []),
      outgoing: links
        .filter((link) => !isAccepted(link) && link.fromId === userId)
        .flatMap((link) => nameOf(link) ?? []),
    },
  }
}

/**
 * POST /api/friends — ask for (or agree to) a friendship. Adding someone who
 * already asked for you accepts their request: adding is always the answer.
 */
export async function requestFriend(
  db: Db,
  userId: string,
  input: { username?: unknown },
  now = Date.now(),
): Promise<ApiResult> {
  const username = asName(input.username)
  const other = username ? await db.getUserByUsername(username) : null
  if (!other) return bad(404, 'not-found')
  if (other.id === userId) return bad(400, 'self')

  const existing = await db.getFriendLink(userId, other.id)
  if (existing) {
    if (isAccepted(existing)) return bad(409, 'already-friends')
    if (existing.fromId === userId) return { status: 200, body: { ok: true, pending: true } }
    await db.setFriendLinkStatus(existing.id, 'accepted')
    return { status: 200, body: { ok: true, accepted: true } }
  }

  const links = await db.listFriendLinks(userId)
  if (links.filter(isAccepted).length >= MAX_FRIENDS) return bad(409, 'max-friends')

  const created = await db.createFriendLink({
    id: randomUUID(),
    fromId: userId,
    toId: other.id,
    status: 'pending',
    createdAt: now,
  })
  // A racing duplicate insert means the pair is linked either way.
  if (!created) return { status: 200, body: { ok: true, pending: true } }
  return { status: 201, body: { ok: true, pending: true } }
}

/** DELETE /api/friends — unfriend, decline, or cancel; all just drop the link. */
export async function removeFriend(
  db: Db,
  userId: string,
  input: { username?: unknown },
): Promise<ApiResult> {
  const username = asName(input.username)
  const other = username ? await db.getUserByUsername(username) : null
  if (!other || other.id === userId) return bad(404, 'not-found')
  await db.deleteFriendLink(userId, other.id)
  return { status: 200, body: { ok: true } }
}

/** GET /api/friends?visit=name — a friend's save blob, for rendering their room. */
export async function friendSave(db: Db, userId: string, username: string): Promise<ApiResult> {
  const friend = await acceptedFriend(db, userId, asName(username))
  if (!friend) return bad(404, 'not-found')
  const save = await db.getSave(friend.id)
  return {
    status: 200,
    body: {
      username: friend.username,
      save: save ? { blob: save.blob, updatedAt: save.updatedAt } : null,
    },
  }
}

/** GET /api/chat — the newest message per conversation, for unread badges. */
export async function listThreads(db: Db, userId: string): Promise<ApiResult> {
  const latest = await db.listLatestMessages(userId)
  const users = await db.getUsersByIds(latest.map((msg) => otherId(msg, userId)))
  const names = new Map(users.map((user) => [user.id, user.username]))
  const threads = latest.flatMap((msg) => {
    const username = names.get(otherId(msg, userId))
    return username ? { username, lastAt: msg.sentAt, lastFromMe: msg.fromId === userId } : []
  })
  return { status: 200, body: { threads } }
}

const toChatMessage = (msg: MessageRow, userId: string) => ({
  id: msg.id,
  fromMe: msg.fromId === userId,
  body: msg.body,
  at: msg.sentAt,
})

/** GET /api/chat?with=name[&since=ts] — one conversation, oldest first. */
export async function listChat(
  db: Db,
  userId: string,
  username: string,
  since: number,
): Promise<ApiResult> {
  const friend = await acceptedFriend(db, userId, asName(username))
  if (!friend) return bad(404, 'not-found')
  const afterTs = Number.isFinite(since) && since > 0 ? since : 0
  const messages = await db.listMessages(userId, friend.id, afterTs, CHAT_FETCH_LIMIT)
  return {
    status: 200,
    body: { messages: messages.map((msg) => toChatMessage(msg, userId)) },
  }
}

/** POST /api/chat — send a message to a friend. */
export async function sendChat(
  db: Db,
  userId: string,
  input: { to?: unknown; body?: unknown },
  now = Date.now(),
): Promise<ApiResult> {
  const friend = await acceptedFriend(db, userId, asName(input.to))
  if (!friend) return bad(404, 'not-found')
  const body = typeof input.body === 'string' ? input.body.trim() : ''
  if (!body) return bad(400, 'empty-message')
  if (body.length > MAX_MESSAGE_LENGTH) return bad(413, 'message-too-long')
  const message: MessageRow = {
    id: randomUUID(),
    fromId: userId,
    toId: friend.id,
    body,
    sentAt: now,
  }
  await db.createMessage(message)
  return { status: 201, body: { ok: true, message: toChatMessage(message, userId) } }
}
