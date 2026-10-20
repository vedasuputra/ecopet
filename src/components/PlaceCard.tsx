import { useLoc, useT, type Key } from '../i18n'
import { formatDistance } from '../lib/geo'
import type { Ranked, Reason } from '../lib/recommend'

const WHY: Record<Reason, Key> = { interest: 'whyInterest', trip: 'whyTrip', near: 'whyNear' }

// One recommended place: its name, where it is, why it is recommended, and a short description.
export default function PlaceCard({
  item,
  selected = false,
  onSelect,
  compact = false,
}: {
  item: Ranked
  selected?: boolean
  onSelect?: () => void
  /** Home shows a shorter card; Explore shows the whole description. */
  compact?: boolean
}) {
  const t = useT()
  const loc = useLoc()
  const { place, distanceM, reasons } = item
  const why = reasons.map((r) => t(WHY[r])).join(' · ')
  return (
    <article
      id={`place-${place.id}`}
      onClick={onSelect}
      style={{ border: selected ? '2px solid blue' : '1px solid #999', padding: 8, margin: '8px 0', cursor: onSelect ? 'pointer' : undefined }}
    >
      <h4 style={{ margin: 0 }}>{place.name}</h4>
      <small>
        {place.destination}
        {distanceM !== null && ` · ${t('placeAway', { d: formatDistance(distanceM) })}`}
      </small>
      {why && (
        <div>
          <small>{why}</small>
        </div>
      )}
      <p style={compact ? { margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : { margin: '4px 0 0' }}>
        {loc(place.description)}
      </p>
    </article>
  )
}
