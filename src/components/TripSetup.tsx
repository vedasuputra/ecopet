import { useEffect, useState } from 'react'
import { DESTINATION_INFO } from '../data/destinationInfo'
import { DESTINATIONS } from '../data/quests'
import { useLoc, useT } from '../i18n'
import SupportPopup from './SupportPopup'
import './tripsetup.css'

const MIN_DAYS = 1
const MAX_DAYS = 14

// How long you stay and where you go: used when you first set up the trip and again on the trip page, so both look and work the same.
// The days are a stepper (1 - 14) whose number can also be typed, and the places are a list you tick (with "select all" and "clear").
export default function TripSetup({
  days,
  onDays,
  places,
  onPlaces,
  disabled = false,
  part,
}: {
  days: number
  onDays: (n: number) => void
  places: string[]
  onPlaces: (p: string[]) => void
  disabled?: boolean
  /** Only the days or only the places (the first set-up asks them one after the other); both when it is not given. */
  part?: 'days' | 'places'
}) {
  const t = useT()
  const loc = useLoc()
  const [supportOpen, setSupportOpen] = useState(false)
  // what is typed in the number box; it only becomes the stay when the typing is done (Enter, or leaving the box)
  const [typed, setTyped] = useState(String(days))
  useEffect(() => setTyped(String(days)), [days])
  const commit = () => {
    const n = Number(typed)
    if (!typed || !Number.isFinite(n)) return setTyped(String(days)) // nothing typed: back to the old number
    const clamped = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(n)))
    setTyped(String(clamped))
    if (clamped !== days) onDays(clamped)
  }

  const toggle = (d: string) => onPlaces(places.includes(d) ? places.filter((x) => x !== d) : [...places, d])
  return (
    <div className="ts">
      {part !== 'places' && (
        <>
      <div className="ts-label">{t('tripDays')}</div>
      {/* minus, the number of days (click it and type), plus: three boxes over the whole width, with a gap between them */}
      <div className="ts-stepper">
        <button aria-label={t('fewerDays')} onClick={() => onDays(Math.max(MIN_DAYS, days - 1))} disabled={disabled || days <= MIN_DAYS}>
          <span className="mi" aria-hidden="true">
            remove
          </span>
        </button>
        <label className="ts-days">
          <input
            inputMode="numeric"
            maxLength={2}
            value={typed}
            disabled={disabled}
            aria-label={t('tripDays')}
            onChange={(e) => setTyped(e.target.value.replace(/\D/g, ''))}
            onFocus={(e) => e.target.select()}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          <span>{t(days === 1 ? 'tripDayUnit' : 'tripDaysUnit')}</span>
        </label>
        <button aria-label={t('moreDays')} onClick={() => onDays(Math.min(MAX_DAYS, days + 1))} disabled={disabled || days >= MAX_DAYS}>
          <span className="mi" aria-hidden="true">
            add
          </span>
        </button>
      </div>
        </>
      )}

      {part !== 'days' && (
        <>
      <div className="ts-places-head">
        <span className="ts-label">{t('whereQ')}</span>
        <span className="ts-actions">
          <button onClick={() => onPlaces([...DESTINATIONS])} disabled={disabled || places.length === DESTINATIONS.length}>
            {t('tripSelectAll')}
          </button>
          <button onClick={() => onPlaces([])} disabled={disabled || places.length === 0}>
            {t('tripClear')}
          </button>
        </span>
      </div>
      <ul className="ts-list" role="group" aria-label={t('whereQ')}>
        {DESTINATIONS.map((d) => {
          const on = places.includes(d)
          return (
            <li key={d}>
              <button className={`ts-place${on ? ' active' : ''}`} aria-pressed={on} onClick={() => toggle(d)} disabled={disabled}>
                <span className="ts-box" aria-hidden="true">
                  {on && <span className="mi">check</span>}
                </span>
                <span className="ts-place-text">
                  <span className="ts-place-name">{d}</span>
                  {DESTINATION_INFO[d] && <span className="ts-place-info">{loc(DESTINATION_INFO[d])}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="ts-other">{t('tripPlacesOptional')}</p>
      <p className="ts-other">
        {t('tripOtherBefore')}
        <button className="ts-other-link" onClick={() => setSupportOpen(true)}>
          {t('profileSupport')}
        </button>
        {t('tripOtherAfter')}
      </p>
      {supportOpen && <SupportPopup initialCategory="other" onClose={() => setSupportOpen(false)} />}
        </>
      )}
    </div>
  )
}
