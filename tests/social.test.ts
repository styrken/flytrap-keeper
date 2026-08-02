import { describe, expect, it } from 'vitest'
import { deleteAccount, putSave, register } from '../api/_lib/core'
import { type Db, createMemoryDb } from '../api/_lib/db'
import {
  CHAT_FETCH_LIMIT,
  MAX_FRIENDS,
  MAX_MESSAGE_LENGTH,
  friendSave,
  listChat,
  listFriends,
  listThreads,
  removeFriend,
  requestFriend,
  sendChat,
} from '../api/_lib/social'

const SECRET = 'test-secret'

/** Register a user and return their id (via the db, not the cookie). */
async function makeUser(db: Db, username: string): Promise<string> {
  const result = await register(db, SECRET, { username, password: 'hemmeligt123' })
  expect(result.status).toBe(201)
  const user = await db.getUserByUsername(username)
  return user!.id
}

async function makeFriends(db: Db, aId: string, bUsername: string, aUsername: string) {
  expect((await requestFriend(db, aId, { username: bUsername })).status).toBe(201)
  const b = await db.getUserByUsername(bUsername)
  expect((await requestFriend(db, b!.id, { username: aUsername })).status).toBe(200)
}

describe('friend requests', () => {
  it('sends, lists, and mutually accepts a request', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    const bo = await makeUser(db, 'bodil')

    const sent = await requestFriend(db, anna, { username: 'bodil' })
    expect(sent.status).toBe(201)

    const annasView = await listFriends(db, anna)
    expect(annasView.body.outgoing).toEqual(['bodil'])
    expect(annasView.body.friends).toEqual([])

    const bosView = await listFriends(db, bo)
    expect(bosView.body.incoming).toEqual(['anna'])

    // Bo adds Anna back — that IS accepting.
    const accepted = await requestFriend(db, bo, { username: 'anna' })
    expect(accepted.status).toBe(200)
    expect(accepted.body.accepted).toBe(true)

    const after = await listFriends(db, anna)
    expect(after.body.incoming).toEqual([])
    expect(after.body.outgoing).toEqual([])
    expect((after.body.friends as { username: string }[]).map((f) => f.username)).toEqual(['bodil'])
  })

  it('rejects unknown users, self-adds, and double-friending', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    await makeUser(db, 'bodil')

    expect((await requestFriend(db, anna, { username: 'findesikke' })).status).toBe(404)
    expect((await requestFriend(db, anna, { username: 'anna' })).status).toBe(400)

    await makeFriends(db, anna, 'bodil', 'anna')
    const again = await requestFriend(db, anna, { username: 'bodil' })
    expect(again.status).toBe(409)
    expect(again.body.error).toBe('already-friends')
  })

  it('re-sending a pending request is idempotent', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    await makeUser(db, 'bodil')
    await requestFriend(db, anna, { username: 'bodil' })
    const again = await requestFriend(db, anna, { username: 'bodil' })
    expect(again.status).toBe(200)
    expect(again.body.pending).toBe(true)
    expect((await listFriends(db, anna)).body.outgoing).toEqual(['bodil'])
  })

  it('decline, cancel, and unfriend all just drop the link', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    const bo = await makeUser(db, 'bodil')

    // Bo declines an incoming request.
    await requestFriend(db, anna, { username: 'bodil' })
    expect((await removeFriend(db, bo, { username: 'anna' })).status).toBe(200)
    expect((await listFriends(db, anna)).body.outgoing).toEqual([])

    // Anna cancels her own request.
    await requestFriend(db, anna, { username: 'bodil' })
    await removeFriend(db, anna, { username: 'bodil' })
    expect((await listFriends(db, bo)).body.incoming).toEqual([])

    // A full friendship can be dissolved too.
    await makeFriends(db, anna, 'bodil', 'anna')
    await removeFriend(db, anna, { username: 'bodil' })
    expect((await listFriends(db, bo)).body.friends).toEqual([])
  })

  it('caps the friend list', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    for (let i = 0; i < MAX_FRIENDS; i++) {
      const name = `friend${i}`
      const otherId = await makeUser(db, name)
      await requestFriend(db, anna, { username: name })
      await requestFriend(db, otherId, { username: 'anna' })
    }
    await makeUser(db, 'onetoomany')
    const over = await requestFriend(db, anna, { username: 'onetoomany' })
    expect(over.status).toBe(409)
    expect(over.body.error).toBe('max-friends')
  })
})

describe('chat', () => {
  it('delivers messages between friends, oldest first', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    const bo = await makeUser(db, 'bodil')
    await makeFriends(db, anna, 'bodil', 'anna')

    expect((await sendChat(db, anna, { to: 'bodil', body: 'hej bodil!' }, 1000)).status).toBe(201)
    expect((await sendChat(db, bo, { to: 'anna', body: 'hej anna 🌱' }, 2000)).status).toBe(201)

    const annasView = await listChat(db, anna, 'bodil', 0)
    const messages = annasView.body.messages as { fromMe: boolean; body: string; at: number }[]
    expect(messages.map((m) => m.body)).toEqual(['hej bodil!', 'hej anna 🌱'])
    expect(messages.map((m) => m.fromMe)).toEqual([true, false])

    // `since` returns only what is newer.
    const newer = await listChat(db, anna, 'bodil', 1000)
    expect((newer.body.messages as unknown[]).length).toBe(1)
  })

  it('refuses chat outside a friendship', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    await makeUser(db, 'bodil')
    expect((await sendChat(db, anna, { to: 'bodil', body: 'hej' })).status).toBe(404)
    await requestFriend(db, anna, { username: 'bodil' }) // pending is not enough
    expect((await sendChat(db, anna, { to: 'bodil', body: 'hej' })).status).toBe(404)
    expect((await listChat(db, anna, 'bodil', 0)).status).toBe(404)
  })

  it('trims and bounds message bodies', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    await makeUser(db, 'bodil')
    await makeFriends(db, anna, 'bodil', 'anna')
    expect((await sendChat(db, anna, { to: 'bodil', body: '   ' })).status).toBe(400)
    expect(
      (await sendChat(db, anna, { to: 'bodil', body: 'x'.repeat(MAX_MESSAGE_LENGTH + 1) })).status,
    ).toBe(413)
    const spaced = await sendChat(db, anna, { to: 'bodil', body: '  hej  ' })
    expect((spaced.body.message as { body: string }).body).toBe('hej')
  })

  it('caps a conversation fetch at the newest messages', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    await makeUser(db, 'bodil')
    await makeFriends(db, anna, 'bodil', 'anna')
    for (let i = 0; i < CHAT_FETCH_LIMIT + 5; i++) {
      await sendChat(db, anna, { to: 'bodil', body: `msg ${i}` }, 1000 + i)
    }
    const fetched = await listChat(db, anna, 'bodil', 0)
    const messages = fetched.body.messages as { body: string }[]
    expect(messages.length).toBe(CHAT_FETCH_LIMIT)
    expect(messages[messages.length - 1].body).toBe(`msg ${CHAT_FETCH_LIMIT + 4}`)
  })

  it('summarizes the newest message per thread', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    const bo = await makeUser(db, 'bodil')
    await makeUser(db, 'cille')
    await makeFriends(db, anna, 'bodil', 'anna')
    await makeFriends(db, anna, 'cille', 'anna')

    await sendChat(db, anna, { to: 'bodil', body: 'first' }, 1000)
    await sendChat(db, bo, { to: 'anna', body: 'latest from bodil' }, 3000)
    await sendChat(db, anna, { to: 'cille', body: 'hi cille' }, 2000)

    const threads = (await listThreads(db, anna)).body.threads as {
      username: string
      lastAt: number
      lastFromMe: boolean
    }[]
    expect(threads).toHaveLength(2)
    const boThread = threads.find((t) => t.username === 'bodil')
    expect(boThread).toMatchObject({ lastAt: 3000, lastFromMe: false })
    const cilleThread = threads.find((t) => t.username === 'cille')
    expect(cilleThread).toMatchObject({ lastAt: 2000, lastFromMe: true })
  })
})

describe('room visits', () => {
  it('hands out a save blob to friends only', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    const bo = await makeUser(db, 'bodil')
    await putSave(db, bo, { blob: '{"plants":"pretend"}', updatedAt: 4321 })

    expect((await friendSave(db, anna, 'bodil')).status).toBe(404)
    await makeFriends(db, anna, 'bodil', 'anna')

    const visit = await friendSave(db, anna, 'bodil')
    expect(visit.status).toBe(200)
    expect(visit.body.username).toBe('bodil')
    expect(visit.body.save).toEqual({ blob: '{"plants":"pretend"}', updatedAt: 4321 })
  })

  it('shows when a friend last tended their garden', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    const bo = await makeUser(db, 'bodil')
    await makeFriends(db, anna, 'bodil', 'anna')
    await putSave(db, bo, { blob: '{}', updatedAt: 999 })
    const friends = (await listFriends(db, anna)).body.friends as { lastTendedAt: number }[]
    expect(friends[0].lastTendedAt).toBe(999)
  })
})

describe('account deletion', () => {
  it('sweeps links and messages when an account goes', async () => {
    const db = createMemoryDb()
    const anna = await makeUser(db, 'anna')
    const bo = await makeUser(db, 'bodil')
    await makeFriends(db, anna, 'bodil', 'anna')
    await sendChat(db, anna, { to: 'bodil', body: 'farvel' })

    await deleteAccount(db, anna)
    expect((await listFriends(db, bo)).body.friends).toEqual([])
    expect((await listThreads(db, bo)).body.threads).toEqual([])
  })
})
