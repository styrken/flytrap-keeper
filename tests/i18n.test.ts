import { describe, expect, it } from 'vitest'
import da from '../locales/da.json'
import en from '../locales/en.json'
import { detectLocale, initI18n } from '../src/i18n'
import { SHOP_ITEMS } from '../src/sim'
import { STAT_INFO_IDS } from '../src/store'

const keyPaths = (node: unknown, prefix = ''): string[] => {
  if (typeof node === 'string') return [prefix]
  if (typeof node !== 'object' || node === null) return []
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    keyPaths(value, prefix ? `${prefix}.${key}` : key),
  )
}

describe('i18n', () => {
  it('serves the English source strings through t()', async () => {
    const i18n = await initI18n()
    await i18n.changeLanguage('en')
    expect(i18n.t('app.title')).toBe('Flytrap Keeper')
    expect(i18n.t('scene.hintSnap')).toMatch(/trap/i)
  })

  it('detects the language from browser locale tags', () => {
    expect(detectLocale(['da'])).toBe('da')
    expect(detectLocale(['da-DK'])).toBe('da')
    expect(detectLocale(['en-GB', 'da'])).toBe('en')
    expect(detectLocale(['de-DE', 'da-DK', 'en'])).toBe('da')
    expect(detectLocale(['de-DE', 'fr'])).toBe('en')
    expect(detectLocale([])).toBe('en')
  })

  it('switches to Danish', async () => {
    const i18n = await initI18n()
    await i18n.changeLanguage('da')
    expect(i18n.t('actions.water')).toBe('Vand')
    expect(i18n.t('species.dionaea.name')).toBe('Venusfluefanger')
    await i18n.changeLanguage('en')
  })

  it('has no empty strings in any locale', () => {
    const walk = (node: unknown, path: string[]): void => {
      if (typeof node === 'string') {
        expect(node.trim(), path.join('.')).not.toBe('')
        return
      }
      expect(node, path.join('.')).toBeTypeOf('object')
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        walk(value, [...path, key])
      }
    }
    walk(en, ['en'])
    walk(da, ['da'])
  })

  it('the Danish translation covers exactly the English keys', () => {
    expect(keyPaths(da).sort()).toEqual(keyPaths(en).sort())
  })

  it('every shop item has a name and description', () => {
    const paths = new Set(keyPaths(en))
    for (const item of SHOP_ITEMS) {
      expect(paths.has(`shop.items.${item.id}.name`), item.id).toBe(true)
      expect(paths.has(`shop.items.${item.id}.desc`), item.id).toBe(true)
    }
  })

  it('every tappable stat has an explainer', () => {
    const paths = new Set(keyPaths(en))
    for (const stat of STAT_INFO_IDS) {
      expect(paths.has(`statInfo.${stat}.what`), stat).toBe(true)
      expect(paths.has(`statInfo.${stat}.how`), stat).toBe(true)
    }
  })
})
