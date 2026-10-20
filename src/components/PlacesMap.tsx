import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import { useLoc, useT } from '../i18n'
import type { Ranked } from '../lib/recommend'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'

// Emoji pin avoids Leaflet's default-icon asset problem under Vite.
const youIcon = L.divIcon({
  html: '<div style="font-size:28px;line-height:28px">📍</div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

// Moves the map to the selected place (from a tap on the list) or fits all the pins at first.
function Focus({ items, selectedId }: { items: Ranked[]; selectedId: string | null }) {
  const map = useMap()
  useEffect(() => {
    const sel = items.find((r) => r.place.id === selectedId)
    if (sel) map.flyTo([sel.place.lat, sel.place.lng], Math.max(map.getZoom(), 12), { duration: 0.6 })
  }, [selectedId, items, map])
  useEffect(() => {
    if (items.length) map.fitBounds(L.latLngBounds(items.map((r) => [r.place.lat, r.place.lng] as [number, number])), { padding: [24, 24], maxZoom: 11 })
    // only once, when the places first arrive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

// Blue pins = recommended places (the picked one is larger), orange = partner shops, the red pin = you.
export default function PlacesMap({
  items,
  selectedId,
  onSelect,
  height = 300,
}: {
  items: Ranked[]
  selectedId: string | null
  onSelect: (id: string) => void
  height?: number
}) {
  const t = useT()
  const loc = useLoc()
  const vendors = useCatalog((s) => s.vendors)
  const { lat, lng, placeName, source } = useLocation()
  return (
    <MapContainer center={[lat, lng]} zoom={9} style={{ height, width: '100%' }}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Focus items={items} selectedId={selectedId} />
      <Marker position={[lat, lng]} icon={youIcon}>
        <Popup>{source === 'simulated' ? t('simulatedAt', { place: placeName }) : t('mapYou', { place: placeName })}</Popup>
      </Marker>
      {vendors.map((v) => (
        <CircleMarker key={v.id} center={[v.lat, v.lng]} radius={5} pathOptions={{ color: 'orange' }}>
          <Popup>
            {v.name} ({loc(v.category)})
          </Popup>
        </CircleMarker>
      ))}
      {items.map((r) => (
        <CircleMarker
          key={r.place.id}
          center={[r.place.lat, r.place.lng]}
          radius={r.place.id === selectedId ? 11 : 8}
          pathOptions={{ color: r.place.id === selectedId ? 'darkblue' : 'blue', fillOpacity: r.place.id === selectedId ? 0.8 : 0.4 }}
          eventHandlers={{ click: () => onSelect(r.place.id) }}
        >
          <Popup>{r.place.name}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
