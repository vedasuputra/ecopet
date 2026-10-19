import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { quests } from '../data/quests'
import { formatDistance, haversine } from '../lib/geo'
import { useAppStore } from '../store/useAppStore'
import { useLocation } from '../store/useLocation'

export default function QuestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const quest = quests.find((q) => q.id === id)
  const { lat, lng, placeName, source } = useLocation()
  const { questStatus, completeQuest } = useAppStore()
  const [msg, setMsg] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [allowGallery, setAllowGallery] = useState(false) // hidden demo toggle

  if (!quest) {
    return (
      <p>
        Quest tidak ditemukan. <Link to="/quests">Kembali</Link>
      </p>
    )
  }
  const done = questStatus[quest.id] === 'done'

  const checkLocation = () => {
    const d = haversine(lat, lng, quest.lat, quest.lng)
    if (d > quest.radiusM) {
      setMsg(`Kamu masih ${formatDistance(d)} dari lokasi quest`)
      return false
    }
    setMsg('Lokasi OK')
    return true
  }

  // Stub: always succeeds (real photo AI check via /api/verify comes later).
  const verify = () => {
    completeQuest(quest.id)
    setMsg(`Terverifikasi! +${quest.rewardCoins} koin`)
  }

  return (
    <div>
      <h2>{quest.title}</h2>
      <p>{quest.description}</p>
      <p>
        Destinasi: {quest.destination} | Radius {quest.radiusM} m | +{quest.rewardCoins} koin
      </p>
      <p>{source === 'simulated' ? `Simulated: ${placeName}` : placeName}</p>
      <button onClick={checkLocation}>Cek lokasi</button>
      <div>
        <input
          type="file"
          accept="image/*"
          capture={allowGallery ? undefined : 'environment'}
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
        <label style={{ fontSize: 10 }}>
          <input
            type="checkbox"
            checked={allowGallery}
            onChange={(e) => setAllowGallery(e.target.checked)}
          />{' '}
          izinkan galeri
        </label>
        {photo && <p>Foto: {photo.name}</p>}
      </div>
      <button onClick={verify} disabled={done}>
        {done ? 'Sudah selesai' : 'Verifikasi'}
      </button>
      {msg && <p>{msg}</p>}
      <button onClick={() => navigate('/quests')}>Kembali</button>
    </div>
  )
}
