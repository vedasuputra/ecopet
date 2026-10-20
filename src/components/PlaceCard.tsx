import { useLoc, useT, type Key } from '../i18n'
import { formatDistance, mapsSearchUrl } from '../lib/geo'
import type { Ranked, Reason } from '../lib/recommend'

const WHY: Record<Reason, Key> = { interest: 'whyInterest', trip: 'whyTrip', near: 'whyNear' }

// One recommended place: its name, where it is, why it is recommended, and a short description.
export default function PlaceCard({
  item,
  selected = false,
  onSelect,
  compact = false,
  onZoom,
  styled = false,
}: {
  item: Ranked
  selected?: boolean
  onSelect?: () => void
  /** Home shows a shorter card; Explore shows the whole description. */
  compact?: boolean
  /** Zoom the map to this place's pin. */
  onZoom?: () => void
  /** true = no built-in inline styles: the screen styles .place-card itself (Home does). */
  styled?: boolean
}) {
  const t = useT()
  const loc = useLoc()
  const { place, distanceM, reasons } = item
  const why = reasons.map((r) => t(WHY[r])).join(' · ')
  return (
    <article
      id={`place-${place.id}`}
      onClick={onSelect}
      className={styled ? `place-card${selected ? ' selected' : ''}` : undefined}
      style={styled ? undefined : { border: selected ? '2px solid blue' : '1px solid #999', padding: 8, margin: '8px 0', cursor: onSelect ? 'pointer' : undefined }}
    >
      <h4 style={styled ? undefined : { margin: 0 }}>{place.name}</h4>
      <small>
        {place.destination}
        {distanceM !== null && ` · ${t('placeAway', { d: formatDistance(distanceM) })}`}
      </small>
      {why && (
        <div>
          <small>{why}</small>
        </div>
      )}
      <p className={styled ? 'place-desc' : undefined} style={styled ? undefined : compact ? { margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : { margin: '4px 0 0' }}>
        {loc(place.description)}
      </p>
      <p className={styled ? 'place-actions' : undefined} style={styled ? undefined : { margin: '6px 0 0' }}>
        <a
          href={mapsSearchUrl(`${place.name}, ${place.destination}, Vietnam`)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button">{t('openGoogleMaps')}</button>
        </a>{' '}
        {onZoom && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onZoom()
            }}
          >
            {t('zoomToPin')}
          </button>
        )}
      </p>
    </article>
  )
}
