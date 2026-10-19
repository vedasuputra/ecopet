import { useEffect, useState } from 'react'
import { searchPlaces, type Place } from '../lib/geocode'
import { useLocation } from '../store/useLocation'

const STATUS_TEXT: Record<string, string> = {
  requesting: 'Meminta izin lokasi...',
  denied: 'Izin lokasi ditolak. Aktifkan di pengaturan browser, atau pakai lokasi simulasi.',
  unsupported: 'Browser tidak mendukung lokasi.',
  error: 'Tidak bisa mendapatkan lokasi. Coba lagi atau pakai lokasi simulasi.',
}

export default function LocationPanel() {
  const { source, lat, lng, placeName, accuracy, status, setSimulated, startReal } = useLocation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Debounced Photon search (min 3 chars), previous request aborted.
  useEffect(() => {
    if (!open || query.trim().length < 3) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        setResults(await searchPlaces(query.trim(), { lat, lng }, ctrl.signal))
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setSearchError('Pencarian gagal, coba lagi.')
      }
      setSearching(false)
    }, 400)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query, open, lat, lng])

  const choose = (p: Place) => {
    setSimulated(p.lat, p.lng, p.detail ? `${p.name}, ${p.detail.split(', ')[0]}` : p.name)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <div>
      <p>
        <b>{source === 'simulated' ? `Simulated: ${placeName}` : `Lokasi asli: ${placeName}`}</b>
        {source === 'real' && accuracy !== null && ` (±${Math.round(accuracy)} m)`}
      </p>
      {STATUS_TEXT[status] && <p>{STATUS_TEXT[status]}</p>}
      <button onClick={startReal} disabled={source === 'real' || status === 'requesting'}>
        Pakai lokasi asli
      </button>
      <button onClick={() => setOpen((o) => !o)}>Ubah lokasi</button>
      {open && (
        <div>
          <input
            autoFocus
            placeholder="Cari tempat (mis. Cai Rang)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searching && <p>Mencari...</p>}
          {searchError && <p>{searchError}</p>}
          <ul>
            {results.map((p, i) => (
              <li key={`${p.lat},${p.lng},${i}`}>
                <button onClick={() => choose(p)}>
                  {p.name}
                  {p.detail && <small> {p.detail}</small>}
                </button>
              </li>
            ))}
          </ul>
          <small>Geser pin di peta untuk menyesuaikan.</small>
        </div>
      )}
    </div>
  )
}
