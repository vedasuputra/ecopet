import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PlaceCard from '../components/PlaceCard'
import PlacesMap from '../components/PlacesMap'
import { RECOMMENDATIONS } from '../data/recommendations'
import { useT } from '../i18n'
import { recommend } from '../lib/recommend'
import { useAppStore } from '../store/useAppStore'
import { useLocation } from '../store/useLocation'

// "View more" from Home: a map with a pin for every recommended place, and the names with their
// descriptions below it. Tap a pin or a name and the other one follows (like a map app).
export default function Explore() {
  const t = useT()
  const user = useAppStore((s) => s.user)
  const { lat, lng, placeName } = useLocation()
  const [selected, setSelected] = useState<string | null>(null)

  const items = useMemo(
    () => recommend(RECOMMENDATIONS, { lat, lng, interests: user?.style?.interests, destinations: user?.destinations }),
    [lat, lng, user?.style?.interests, user?.destinations],
  )

  const pick = (id: string, scrollTo: 'map' | 'card') => {
    setSelected(id)
    if (scrollTo === 'card') document.getElementById(`place-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    else document.getElementById('places-map')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <div>
      <p>
        <Link to="/home">{t('back')}</Link>
      </p>
      <h2>{t('exploreTitle')}</h2>
      <p>
        <small>{t('exploreNear', { place: placeName })}</small>
      </p>
      <div id="places-map" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
        <PlacesMap items={items} selectedId={selected} onSelect={(id) => pick(id, 'card')} />
      </div>
      {items.map((r) => (
        <PlaceCard key={r.place.id} item={r} selected={r.place.id === selected} onSelect={() => pick(r.place.id, 'map')} />
      ))}
    </div>
  )
}
