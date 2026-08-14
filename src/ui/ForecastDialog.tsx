import { useTranslation } from 'react-i18next'
import { nextRainStart, precipitationAt, weatherForecast } from '../sim'
import { gameNow, useGame } from '../store'

const FORECAST_ICON = { sun: '☀️', clouds: '☁️', rain: '🌧️', snow: '🌨️' } as const

/**
 * The shelf radio's weather report. Weather has always been a pure function
 * of (seed, time) — this dialog just lets the radio say tomorrow out loud, so
 * a keeper can plan around the rain barrel like a real gardener.
 */
export function ForecastDialog() {
  const { t, i18n } = useTranslation()
  const show = useGame((s) => s.showForecast)
  const setShow = useGame((s) => s.setShowForecast)
  const seed = useGame((s) => s.state.rngSeed)
  if (!show) return null

  const now = gameNow()
  const forecast = weatherForecast(seed, now)
  const rainAt = nextRainStart(seed, now)

  const timeFmt = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' })
  const dayTimeFmt = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  const sameDay = (a: number, b: number) =>
    new Date(a).toDateString() === new Date(b).toDateString()
  const stamp = (at: number) => (sameDay(at, now) ? timeFmt.format(at) : dayTimeFmt.format(at))

  const rainLine = (() => {
    if (rainAt === null) return `🛢️ ${t('forecast.noRain')}`
    if (rainAt === now) return `🛢️ ${t('forecast.rainingNow')}`
    const snow = precipitationAt(rainAt, 'rain') === 'snow'
    return `🛢️ ${t(snow ? 'forecast.nextSnow' : 'forecast.nextRain', { time: stamp(rainAt) })}`
  })()

  return (
    <div className="dialog-backdrop" onClick={() => setShow(false)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>📻 {t('forecast.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setShow(false)}
          >
            ✕
          </button>
        </header>
        <p className="muted">{t('forecast.jingle')}</p>
        <ul className="journal-list">
          {forecast.map((entry, i) => {
            const kind =
              precipitationAt(entry.at, entry.weather) === 'snow' ? 'snow' : entry.weather
            return (
              <li key={entry.at}>
                <span className="journal-date">
                  {i === 0 ? t('forecast.now') : stamp(entry.at)}
                </span>
                <span>
                  {FORECAST_ICON[kind]} {t(`weather.${kind}`)}
                </span>
              </li>
            )
          })}
        </ul>
        <div className="dialog-section">
          <p className="muted">{rainLine}</p>
        </div>
      </div>
    </div>
  )
}
