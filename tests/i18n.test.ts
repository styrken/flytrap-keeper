import { describe, expect, it } from 'vitest'
import en from '../locales/en.json'
import { initI18n } from '../src/i18n'

describe('i18n', () => {
  it('serves the English source strings through t()', async () => {
    const i18n = await initI18n()
    expect(i18n.t('app.title')).toBe('Flytrap Keeper')
    expect(i18n.t('scene.hintSnap')).toMatch(/trap/i)
  })

  it('has no empty strings in the source locale', () => {
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
    walk(en, [])
  })
})
