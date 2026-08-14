import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SHOP_ITEMS, type ShopItemId, decodeSeedGift, encodeSeedGift, plantCapacity } from '../sim'
import { MAX_MESSAGE_LENGTH } from '../social'
import { useSocial } from '../socialStore'
import { useGame } from '../store'

/** "2 h ago" in the player's language, for the friends list. */
function relativeTime(ts: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' })
  const minutes = Math.round((ts - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
}

export function FriendsDialog() {
  const { t } = useTranslation()
  const show = useSocial((s) => s.showFriends)
  const setShow = useSocial((s) => s.setShowFriends)
  const chatWith = useSocial((s) => s.chatWith)
  const signedIn = useGame((s) => s.sync.kind === 'signedIn')
  if (!show) return null

  return (
    <div className="dialog-backdrop" onClick={() => setShow(false)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>👥 {chatWith ? `💬 ${chatWith}` : t('friends.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setShow(false)}
          >
            ✕
          </button>
        </header>
        {!signedIn ? <NeedAccount /> : chatWith ? <ChatView /> : <FriendsView />}
      </div>
    </div>
  )
}

function NeedAccount() {
  const { t } = useTranslation()
  const setShow = useSocial((s) => s.setShowFriends)
  const setShowSettings = useGame((s) => s.setShowSettings)
  return (
    <section className="dialog-section">
      <p className="muted">{t('friends.needAccount')}</p>
      <button
        type="button"
        className="primary"
        onClick={() => {
          setShow(false)
          setShowSettings(true)
        }}
      >
        ⚙️ {t('settings.title')}
      </button>
    </section>
  )
}

function FriendsView() {
  const { t, i18n } = useTranslation()
  const friends = useSocial((s) => s.friends)
  const incoming = useSocial((s) => s.incoming)
  const outgoing = useSocial((s) => s.outgoing)
  const threads = useSocial((s) => s.threads)
  const lastSeen = useSocial((s) => s.lastSeen)
  const submitAdd = useSocial((s) => s.submitAdd)
  const removeFriend = useSocial((s) => s.removeFriend)
  const openChat = useSocial((s) => s.openChat)
  const startVisit = useSocial((s) => s.startVisit)
  const visitLoading = useSocial((s) => s.visitLoading)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const add = () => {
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    setSent(false)
    void submitAdd(name).then((err) => {
      setBusy(false)
      if (err) {
        setError(err)
        return
      }
      setName('')
      setSent(true)
    })
  }

  const visit = (username: string) => {
    setError(null)
    void startVisit(username).then((err) => {
      if (err === 'empty') setError('visit-empty:' + username)
      else if (err) setError('visit-failed')
    })
  }

  const hasUnread = (username: string) =>
    threads.some(
      (thread) =>
        thread.username === username &&
        !thread.lastFromMe &&
        thread.lastAt > (lastSeen[username] ?? 0),
    )

  return (
    <>
      <section className="dialog-section">
        <p className="muted">{t('friends.pitch')}</p>
        <div className="dialog-row">
          <input
            value={name}
            placeholder={t('friends.addPlaceholder')}
            maxLength={24}
            autoCapitalize="none"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
            }}
          />
          <button type="button" className="primary" disabled={busy || !name.trim()} onClick={add}>
            {t('friends.add')}
          </button>
        </div>
        {sent && <p className="muted">{t('friends.requestSent')}</p>}
        {error === 'visit-failed' && <p className="error">{t('visit.error')}</p>}
        {error?.startsWith('visit-empty:') && (
          <p className="muted">{t('visit.empty', { name: error.slice('visit-empty:'.length) })}</p>
        )}
        {error && !error.startsWith('visit-') && (
          <p className="error">{t(`friends.errors.${error}`, t('friends.errors.unknown'))}</p>
        )}
      </section>

      {incoming.length > 0 && (
        <section className="dialog-section">
          <h3>📨 {t('friends.incoming')}</h3>
          {incoming.map((username) => (
            <div key={username} className="friend-row">
              <span className="friend-name">{username}</span>
              <span className="friend-actions">
                <button type="button" className="primary" onClick={() => void submitAdd(username)}>
                  {t('friends.accept')}
                </button>
                <button type="button" onClick={() => void removeFriend(username)}>
                  {t('friends.decline')}
                </button>
              </span>
            </div>
          ))}
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="dialog-section">
          <h3>⏳ {t('friends.outgoing')}</h3>
          {outgoing.map((username) => (
            <div key={username} className="friend-row">
              <span className="friend-name">{username}</span>
              <button type="button" onClick={() => void removeFriend(username)}>
                {t('friends.cancel')}
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="dialog-section">
        {friends.length === 0 && incoming.length === 0 && outgoing.length === 0 ? (
          <p className="muted">{t('friends.empty')}</p>
        ) : (
          friends.map((friend) => (
            <div key={friend.username} className="friend-row">
              <span className="friend-name">
                {friend.username}
                <span className="friend-meta">
                  {friend.lastTendedAt
                    ? t('friends.lastTended', {
                        time: relativeTime(friend.lastTendedAt, i18n.language),
                      })
                    : t('friends.neverTended')}
                </span>
              </span>
              <span className="friend-actions">
                <button
                  type="button"
                  className={hasUnread(friend.username) ? 'primary has-pip' : ''}
                  onClick={() => openChat(friend.username)}
                >
                  💬 {t('friends.chat')}
                </button>
                <button
                  type="button"
                  disabled={visitLoading !== null || !friend.lastTendedAt}
                  onClick={() => visit(friend.username)}
                >
                  {visitLoading === friend.username ? '…' : <>🏡 {t('friends.visit')}</>}
                </button>
                <button
                  type="button"
                  className={confirmRemove === friend.username ? 'danger' : ''}
                  onClick={() => {
                    if (confirmRemove !== friend.username) {
                      setConfirmRemove(friend.username)
                      return
                    }
                    setConfirmRemove(null)
                    void removeFriend(friend.username)
                  }}
                >
                  {confirmRemove === friend.username ? t('friends.removeConfirm') : '✕'}
                </button>
              </span>
            </div>
          ))
        )}
      </section>
    </>
  )
}

function ChatView() {
  const { t, i18n } = useTranslation()
  const chatWith = useSocial((s) => s.chatWith)!
  const messages = useSocial((s) => s.messages[chatWith] ?? [])
  const openChat = useSocial((s) => s.openChat)
  const pollChat = useSocial((s) => s.pollChat)
  const sendMessage = useSocial((s) => s.sendMessage)
  const startVisit = useSocial((s) => s.startVisit)
  const dispatchGame = useGame((s) => s.dispatch)
  const dewdrops = useGame((s) => s.state.inventory.dewdrops)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showGifts, setShowGifts] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  // Keep the thread fresh while it is open.
  useEffect(() => {
    void pollChat()
    const timer = window.setInterval(() => void pollChat(), 5_000)
    return () => window.clearInterval(timer)
  }, [pollChat, chatWith])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const send = () => {
    if (!draft.trim() || busy) return
    setBusy(true)
    setError(null)
    void sendMessage(draft).then((err) => {
      setBusy(false)
      if (err) {
        setError(err)
        return
      }
      setDraft('')
    })
  }

  // A gift is an ordinary message wearing a bow: send the tagged body first,
  // then let the sim pay for the seed — the picker only offers what the
  // dewdrop count can afford, so the payment guard is a formality.
  const sendGift = (item: ShopItemId) => {
    if (busy) return
    setBusy(true)
    setError(null)
    void sendMessage(encodeSeedGift(item)).then((err) => {
      setBusy(false)
      if (err) {
        setError(err)
        return
      }
      dispatchGame({ type: 'giftSeed', item })
      setShowGifts(false)
    })
  }

  const timeOf = (at: number) =>
    new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }).format(at)

  return (
    <section className="dialog-section chat-section">
      <div className="dialog-row">
        <button type="button" onClick={() => openChat(null)}>
          ← {t('friends.back')}
        </button>
        <button type="button" onClick={() => void startVisit(chatWith)}>
          🏡 {t('friends.visit')}
        </button>
      </div>
      <div className="chat-messages" ref={scroller}>
        {messages.length === 0 && <p className="muted">{t('friends.noMessages')}</p>}
        {messages.map((message) => {
          const gift = decodeSeedGift(message.body)
          return (
            <div
              key={message.id}
              className={`chat-bubble${message.fromMe ? ' mine' : ''}${gift ? ' gift' : ''}`}
            >
              {gift ? (
                <GiftContent messageId={message.id} item={gift} fromMe={message.fromMe} />
              ) : (
                message.body
              )}
              <span className="chat-time">{timeOf(message.at)}</span>
            </div>
          )
        })}
      </div>
      {error && (
        <p className="error">{t(`friends.errors.${error}`, t('friends.errors.unknown'))}</p>
      )}
      {showGifts && (
        <div className="gift-picker">
          <p className="muted">{t('gift.pick', { name: chatWith })}</p>
          {SHOP_ITEMS.filter((item) => item.kind === 'seed').map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={busy || dewdrops < item.cost}
              onClick={() => sendGift(item.id)}
            >
              🌱 {t(`shop.items.${item.id}.name`)} · {item.cost} 🫧
            </button>
          ))}
        </div>
      )}
      <div className="dialog-row chat-input-row">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('gift.send')}
          title={t('gift.send')}
          onClick={() => setShowGifts((open) => !open)}
        >
          🎁
        </button>
        <input
          value={draft}
          placeholder={t('friends.chatPlaceholder')}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
        />
        <button type="button" className="primary" disabled={busy || !draft.trim()} onClick={send}>
          {t('friends.send')}
        </button>
      </div>
    </section>
  )
}

/**
 * A seed gift inside a chat bubble. Outbound it is a receipt; inbound it
 * carries the "plant it" button, which the recipient's own sim honours once
 * per message — and politely holds while every pot is taken.
 */
function GiftContent({
  messageId,
  item,
  fromMe,
}: {
  messageId: string
  item: ShopItemId
  fromMe: boolean
}) {
  const { t } = useTranslation()
  const dispatch = useGame((s) => s.dispatch)
  const redeemed = useGame((s) => s.state.redeemedGifts.includes(messageId))
  const hasRoom = useGame((s) => s.state.plants.length < plantCapacity(s.state))
  const name = t(`shop.items.${item}.name`)
  if (fromMe) return <span>{t('gift.sent', { item: name })}</span>
  return (
    <span className="gift-content">
      <span>{t('gift.received', { item: name })}</span>
      {redeemed ? (
        <span className="gift-planted">{t('gift.planted')}</span>
      ) : (
        <button
          type="button"
          className="primary"
          disabled={!hasRoom}
          title={hasRoom ? undefined : t('gift.noRoom')}
          onClick={() => dispatch({ type: 'redeemSeedGift', messageId, item })}
        >
          {t('gift.plant')}
        </button>
      )}
    </span>
  )
}
