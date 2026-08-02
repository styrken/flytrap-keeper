import { useTranslation } from 'react-i18next'
import { MAX_PLANTS, SHOP_ITEMS, type ShopItem, activePlant } from '../sim'
import { useGame } from '../store'

export function ShopDialog() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showShop)
  const setShow = useGame((s) => s.setShowShop)
  const state = useGame((s) => s.state)
  const dispatch = useGame((s) => s.dispatch)
  if (!show) return null

  const plant = activePlant(state)

  const statusOf = (item: ShopItem): 'buy' | 'owned' | 'full' | 'poor' => {
    if (item.kind === 'seed' && state.plants.length >= MAX_PLANTS) return 'full'
    if ((item.kind === 'unlock' || item.kind === 'deco') && state.inventory.items.includes(item.id))
      return 'owned'
    if (item.kind === 'pot' && plant?.potColor === item.potColor) return 'owned'
    if (state.inventory.dewdrops < item.cost) return 'poor'
    return 'buy'
  }

  return (
    <div className="dialog-backdrop" onClick={() => setShow(false)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>
            🛍️ {t('shop.title')} <span className="shop-balance">🫧 {state.inventory.dewdrops}</span>
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setShow(false)}
          >
            ✕
          </button>
        </header>
        <p className="muted">{t('shop.pitch')}</p>
        <div className="shop-list">
          {SHOP_ITEMS.map((item) => {
            const status = statusOf(item)
            return (
              <div key={item.id} className="shop-item">
                <div className="shop-item-text">
                  <strong>{t(`shop.items.${item.id}.name`)}</strong>
                  <span className="muted">{t(`shop.items.${item.id}.desc`)}</span>
                </div>
                <button
                  type="button"
                  className={status === 'buy' ? 'primary' : ''}
                  disabled={status !== 'buy'}
                  onClick={() => dispatch({ type: 'buy', item: item.id })}
                >
                  {status === 'owned'
                    ? `✓ ${t('shop.owned')}`
                    : status === 'full'
                      ? t('shop.sillFull')
                      : `🫧 ${item.cost}`}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
