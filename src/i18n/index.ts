import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import da from '../../locales/da.json'
import en from '../../locales/en.json'

export async function initI18n() {
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, da: { translation: da } },
      lng: 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnEmptyString: false,
    })
  }
  return i18n
}

export default i18n
