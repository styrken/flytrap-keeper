import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SPECIES, type SpeciesId } from '../sim'
import { useGame } from '../store'
import { FlytrapIcon } from './FlytrapIcon'

const SPECIES_ICON: Record<SpeciesId, ReactNode> = {
  dionaea: <FlytrapIcon size={16} />,
  drosera: '✨',
  nepenthes: '🏺',
  sarracenia: '🎺',
}

export function LexiconDialog() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showLexicon)
  const setShow = useGame((s) => s.setShowLexicon)
  const plants = useGame((s) => s.state.plants)
  if (!show) return null

  const ownedSpecies = new Set(plants.map((plant) => plant.speciesId))

  return (
    <div className="dialog-backdrop" onClick={() => setShow(false)}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>📖 {t('lexicon.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setShow(false)}
          >
            ✕
          </button>
        </header>
        {(Object.keys(SPECIES) as SpeciesId[]).map((id) => {
          const owned = ownedSpecies.has(id)
          return (
            <section key={id} className="dialog-section">
              <h3>
                {SPECIES_ICON[id]} {t(`species.${id}.name`)}
                {owned && <em className="lexicon-latin"> · {t(`species.${id}.latin`)}</em>}
              </h3>
              <p className="muted">{owned ? t(`species.${id}.facts`) : t('lexicon.locked')}</p>
            </section>
          )
        })}
      </div>
    </div>
  )
}
