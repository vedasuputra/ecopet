import { useEffect, useState } from 'react'
import { useT, type Key } from '../i18n'
import { searchPlaces, type Place } from '../lib/geocode'
import { useLocation } from '../store/useLocation'

const STATUS_KEY: Record<string, Key> = {
  requesting: 'locRequesting',
  denied: 'locDenied',
  unsupported: 'locUnsupported',
  error: 'locError',
}

export default function LocationPanel() {
  const t = useT()
  const { source, lat, lng, placeName, accuracy, status, setSimulated, startReal } = useLocation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)

  // Debounced Photon search (min 3 chars), previous request aborted.
  useEffect(() => {
    if (!open || query.trim().length < 3) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError(false)
      try {
        setResults(await searchPlaces(query.trim(), { lat, lng }, ctrl.signal))
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setSearchError(true)
      }
      setSearching(false)
    }, 400)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [query, open, lat, lng])

  const choose = (p: Place) => {
    setSimulated(p.lat, p.lng, p.area && p.area !== p.name ? `${p.name}, ${p.area}` : p.name)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <div>
      <p>
        <b>{source === 'simulated' ? t('simulatedAt', { place: placeName }) : t('realAt', { place: placeName })}</b>
        {source === 'real' && accuracy !== null && ` (±${Math.round(accuracy)} m)`}
      </p>
      {STATUS_KEY[status] && <p>{t(STATUS_KEY[status])}</p>}
      <button onClick={startReal} disabled={source === 'real' || status === 'requesting'}>
        {t('useRealLocation')}
      </button>
      <button onClick={() => setOpen((o) => !o)}>{t('changeLocation')}</button>
      {open && (
        <div>
          <input
            autoFocus
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searching && <p>{t('searching')}</p>}
          {searchError && <p>{t('searchFailed')}</p>}
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
          <small>{t('dragHint')}</small>
        </div>
      )}
    </div>
  )
}
