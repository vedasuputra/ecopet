import { useAppStore } from '../store/useAppStore'
import { useLocation } from '../store/useLocation'

const PLACES = [
  { name: 'Can Tho', lat: 10.0452, lng: 105.7469 },
  { name: 'Cai Rang Floating Market', lat: 10.0035, lng: 105.7479 },
  { name: 'Ben Tre', lat: 10.2434, lng: 106.3756 },
  { name: 'Tra Su', lat: 10.5833, lng: 105.0667 },
]

export default function DevPanel() {
  const { reset, addCoins, coins, commissionEvents } = useAppStore()
  const { placeName, lat, lng, setSimulated } = useLocation()
  return (
    <div>
      <h2>Dev panel</h2>
      <p>Koin: {coins}</p>
      <button onClick={() => addCoins(100)}>+100 koin</button>
      <button
        onClick={() => {
          if (confirm('Reset semua data demo?')) reset()
        }}
      >
        Reset demo
      </button>
      <h3>
        Lokasi (simulated): {placeName} ({lat.toFixed(4)}, {lng.toFixed(4)})
      </h3>
      {PLACES.map((p) => (
        <button key={p.name} onClick={() => setSimulated(p.lat, p.lng, p.name)}>
          {p.name}
        </button>
      ))}
      <h3>Komisi</h3>
      <p>
        {commissionEvents.length} event, total VND{' '}
        {commissionEvents.reduce((a, e) => a + e.commissionVnd, 0).toLocaleString('id-ID')}
      </p>
    </div>
  )
}
