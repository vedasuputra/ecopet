import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { quests } from '../data/quests'
import { vendors } from '../data/vendors'
import { useLocation } from '../store/useLocation'

// Markers: blue = user, green = quest, orange = vendor.
export default function MapView() {
  const { lat, lng, placeName } = useLocation()
  return (
    <MapContainer center={[lat, lng]} zoom={12} style={{ height: 400, width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[lat, lng]} radius={8} pathOptions={{ color: 'blue' }}>
        <Popup>Kamu: {placeName}</Popup>
      </CircleMarker>
      {quests.map((q) => (
        <CircleMarker key={q.id} center={[q.lat, q.lng]} radius={7} pathOptions={{ color: 'green' }}>
          <Popup>Quest: {q.title}</Popup>
        </CircleMarker>
      ))}
      {vendors.map((v) => (
        <CircleMarker key={v.id} center={[v.lat, v.lng]} radius={7} pathOptions={{ color: 'orange' }}>
          <Popup>
            {v.name} ({v.category})
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
