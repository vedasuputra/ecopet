import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import { useLoc, useT } from '../i18n'
import { haversine } from '../lib/geo'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'

// Emoji pin avoids Leaflet's default-icon asset problem under Vite.
const youIcon = L.divIcon({
  html: '<div style="font-size:28px;line-height:28px">📍</div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    const c = map.getCenter()
    // Follow the user marker, but don't fight the user while they pan nearby
    if (haversine(c.lat, c.lng, lat, lng) > 300) map.setView([lat, lng], map.getZoom())
  }, [lat, lng, map])
  return null
}

// Pin = user (draggable in simulated mode), green = quest, orange = vendor.
export default function MapView() {
  const quests = useCatalog((s) => s.quests)
  const t = useT()
  const loc = useLoc()
  const vendors = useCatalog((s) => s.vendors)
  const { source, lat, lng, placeName, setSimulated } = useLocation()
  return (
    <MapContainer center={[lat, lng]} zoom={12} style={{ height: 380, width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={lat} lng={lng} />
      <Marker
        position={[lat, lng]}
        icon={youIcon}
        draggable={source === 'simulated'}
        eventHandlers={{
          dragend: (e) => {
            const p = (e.target as L.Marker).getLatLng()
            setSimulated(p.lat, p.lng) // name is reverse-geocoded
          },
        }}
      >
        <Popup>{source === 'simulated' ? t('simulatedAt', { place: placeName }) : t('mapYou', { place: placeName })}</Popup>
      </Marker>
      {quests.filter((q) => q.scope !== 'general').map((q) => (
        <CircleMarker key={q.id} center={[q.lat, q.lng]} radius={7} pathOptions={{ color: 'green' }}>
          <Popup>{t('mapQuest', { title: loc(q.title) })}</Popup>
        </CircleMarker>
      ))}
      {vendors.map((v) => (
        <CircleMarker key={v.id} center={[v.lat, v.lng]} radius={7} pathOptions={{ color: 'orange' }}>
          <Popup>
            {v.name} ({loc(v.category)})
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
