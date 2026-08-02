import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import da from '../../locales/da.json'
import en from '../../locales/en.json'

export const SUPPORTED_LOCALES = ['en', 'da'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const browserLanguages = (): readonly string[] =>
  typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])

/** First supported match among the browser's preferred languages; English otherwise. */
export function detectLocale(preferred: readonly string[] = browserLanguages()): SupportedLocale {
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split('-')[0]
    const match = SUPPORTED_LOCALES.find((locale) => locale === primary)
    if (match) return match
  }
  return 'en'
}

const syncHtmlLang = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
}

export async function initI18n() {
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, da: { translation: da } },
      lng: detectLocale(),
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnEmptyString: false,
    })
    syncHtmlLang(i18n.language)
    i18n.on('languageChanged', syncHtmlLang)
  }
  return i18n
}

export default i18n
