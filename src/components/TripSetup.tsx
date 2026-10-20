import { DESTINATIONS } from '../data/quests'
import { useT } from '../i18n'
import './tripsetup.css'

// How long you stay and where you go: used when you first set up the trip and again on the trip page, so both look and work the same.
// The days are a stepper (1 - 14) and the places are chips you tick.
export default function TripSetup({
  days,
  onDays,
  places,
  onPlaces,
  disabled = false,
}: {
  days: number
  onDays: (n: number) => void
  places: string[]
  onPlaces: (p: string[]) => void
  disabled?: boolean
}) {
  const t = useT()
  const toggle = (d: string) => onPlaces(places.includes(d) ? places.filter((x) => x !== d) : [...places, d])
  return (
    <div className="ts">
      <div className="ts-row">
        <span className="ts-label">{t('tripDays')}</span>
        <span className="ts-stepper">
          <button aria-label={t('fewerDays')} onClick={() => onDays(Math.max(1, days - 1))} disabled={disabled || days <= 1}>
            <span className="mi" aria-hidden="true">
              remove
            </span>
          </button>
          <b aria-live="polite">{t(days === 1 ? 'profileDay' : 'profileDays', { n: days })}</b>
          <button aria-label={t('moreDays')} onClick={() => onDays(Math.min(14, days + 1))} disabled={disabled || days >= 14}>
            <span className="mi" aria-hidden="true">
              add
            </span>
          </button>
        </span>
      </div>
      <div className="ts-label ts-places-label">{t('whereQ')}</div>
      <div className="ts-chips" role="group" aria-label={t('whereQ')}>
        {DESTINATIONS.map((d) => (
          <button key={d} className={`ts-chip${places.includes(d) ? ' active' : ''}`} aria-pressed={places.includes(d)} onClick={() => toggle(d)} disabled={disabled}>
            {places.includes(d) && (
              <span className="mi" aria-hidden="true">
                check
              </span>
            )}
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}
