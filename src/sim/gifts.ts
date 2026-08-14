// Seed gifts ride inside ordinary chat messages as a tagged body — the
// server stays exactly as dumb as it has always been (it stores text; it has
// no idea one of them is a present). The sender's sim pays the shop price
// when the gift is sent; the recipient's sim plants it once, keyed by the
// message id, when they tap "plant it".
import { shopItem } from './shop'
import type { ShopItemId } from './types'

const GIFT_PREFIX = '[seed-gift:'
const GIFT_SUFFIX = ']'

/** The chat body that carries a seed gift. */
export const encodeSeedGift = (item: ShopItemId): string => `${GIFT_PREFIX}${item}${GIFT_SUFFIX}`

/**
 * The seed inside a chat message, if that is what it is — null for ordinary
 * text. Only real, seed-kind shop items count; anything else stays plain text.
 */
export function decodeSeedGift(body: string): ShopItemId | null {
  if (!body.startsWith(GIFT_PREFIX) || !body.endsWith(GIFT_SUFFIX)) return null
  const id = body.slice(GIFT_PREFIX.length, -GIFT_SUFFIX.length)
  const item = shopItem(id as ShopItemId)
  return item?.kind === 'seed' ? item.id : null
}

/** How many redeemed-gift ids the save remembers (old ones scroll out). */
export const REDEEMED_GIFTS_MAX = 100
