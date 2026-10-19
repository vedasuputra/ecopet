import MapView from '../components/MapView'
import { useLocation } from '../store/useLocation'

export default function MapPage() {
  const { source, placeName } = useLocation()
  return (
    <div>
      <p>{source === 'simulated' ? `Simulated: ${placeName}` : placeName}</p>
      <MapView />
    </div>
  )
}
