import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { quests } from '../data/quests'
import { verifyQuest } from '../lib/api'
import { formatDistance, haversine } from '../lib/geo'
import { compressImage } from '../lib/image'
import { useAppStore } from '../store/useAppStore'
import { useLocation } from '../store/useLocation'

export default function QuestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const quest = quests.find((q) => q.id === id)
  const { lat, lng, placeName, source } = useLocation()
  const { questStatus, completeQuest } = useAppStore()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  // Photo is compressed and stamped with time + location at the moment it is chosen/taken.
  const [photo, setPhoto] = useState<{ name: string; base64: string; at: number; lat: number; lng: number } | null>(null)
  const [allowGallery, setAllowGallery] = useState(false) // hidden demo toggle

  if (!quest) {
    return (
      <p>
        Quest tidak ditemukan. <Link to="/quests">Kembali</Link>
      </p>
    )
  }
  const done = questStatus[quest.id] === 'done'
  const needsPhoto = !!(quest.requiredObject || quest.requiredScene)

  const checkLocation = () => {
    const d = haversine(lat, lng, quest.lat, quest.lng)
    if (d > quest.radiusM) {
      setMsg(`Kamu masih ${formatDistance(d)} dari lokasi quest`)
      return false
    }
    setMsg('Lokasi OK')
    return true
  }

  const onPhoto = async (file: File | undefined) => {
    if (!file) return setPhoto(null)
    setBusy(true)
    try {
      setPhoto({ name: file.name, base64: await compressImage(file), at: Date.now(), lat, lng })
      setMsg('')
    } catch {
      setMsg('Gagal membaca foto')
    }
    setBusy(false)
  }

  const verify = async () => {
    if (!needsPhoto) {
      // e.g. "redeem coupon" quest completes via VendorScan instead
      return setMsg('Quest ini selesai otomatis saat kupon dipakai di toko.')
    }
    if (!checkLocation()) return
    if (!photo) return setMsg('Ambil atau pilih foto dulu')
    setBusy(true)
    setMsg('Memeriksa foto...')
    const r = await verifyQuest({
      questId: quest.id,
      image: photo.base64,
      lat: photo.lat,
      lng: photo.lng,
      timestamp: photo.at,
    })
    setBusy(false)
    if (r.ok) {
      completeQuest(quest.id)
      setMsg(`Terverifikasi! +${quest.rewardCoins} koin`)
    } else {
      setMsg(r.message ?? 'Verifikasi gagal')
    }
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
      {needsPhoto && (
        <div>
          <input
            type="file"
            accept="image/*"
            capture={allowGallery ? undefined : 'environment'}
            onChange={(e) => onPhoto(e.target.files?.[0])}
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
      )}
      <button onClick={verify} disabled={done || busy}>
        {done ? 'Sudah selesai' : 'Verifikasi'}
      </button>
      {msg && <p>{msg}</p>}
      <button onClick={() => navigate('/quests')}>Kembali</button>
    </div>
  )
}
