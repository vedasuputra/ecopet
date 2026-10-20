import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { useLoc, useT, type Key } from '../i18n'
import type { Quest } from '../data/quests'
import { haversine } from '../lib/geo'
import { searchPlaces, type Place } from '../lib/geocode'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'
import './location.css'

const STATUS_KEY: Record<string, Key> = {
  requesting: 'locRequesting',
  denied: 'locDenied',
  unsupported: 'locUnsupported',
  error: 'locError',
}

/** Switch to the real location of the device (the content of the "real location" popup). */
export function RealLocationView() {
  const t = useT()
  const { source, lat, lng, placeName, accuracy, status, startReal, setSimulated } = useLocation()
  const on = source === 'real'
  return (
    <div className="loc-view">
      <p className="loc-text">{t('locRealIntro')}</p>
      {on && accuracy !== null && <p className="loc-text">{`±${Math.round(accuracy)} m`}</p>}
      {STATUS_KEY[status] && <p className="loc-note">{t(STATUS_KEY[status])}</p>}
      <div className="loc-actions">
        {/* turning it off keeps you where you are, as a simulated location */}
        <button className="loc-btn loc-btn-primary" onClick={on ? () => setSimulated(lat, lng, placeName) : startReal} disabled={status === 'requesting'}>
          {on ? t('locRealTurnOff') : t('locRealTurnOn')}
        </button>
      </div>
    </div>
  )
}

// Emoji pin avoids Leaflet's default-icon asset problem under Vite.
const pin = L.divIcon({ html: '<div style="font-size:28px;line-height:28px">📍</div>', className: '', iconSize: [28, 28], iconAnchor: [14, 28] })

function FollowAndTap({ lat, lng, minZoom, onTap }: { lat: number; lng: number; minZoom: number; onTap: (lat: number, lng: number) => void }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), minZoom), { animate: true })
  }, [lat, lng, minZoom, map])
  useMapEvents({ click: (e) => onTap(e.latlng.lat, e.latlng.lng) })
  return null
}

/** The map of both tabs: your pin (drag it, or tap the map) and, on the quest tab, a marker for each quest spot. */
function LocationMap({ spots, minZoom }: { spots?: Quest[]; minZoom: number }) {
  const loc = useLoc()
  const { lat, lng, setSimulated } = useLocation()
  return (
    <div className="loc-map">
      <MapContainer center={[lat, lng]} zoom={minZoom} style={{ height: 190, width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FollowAndTap lat={lat} lng={lng} minZoom={minZoom} onTap={(a, b) => setSimulated(a, b)} />
        {spots?.map((q) => (
          <CircleMarker
            key={q.id}
            center={[q.lat, q.lng]}
            radius={7}
            pathOptions={{ color: '#044388', weight: 2, fillColor: '#168fd6', fillOpacity: 0.9 }}
            eventHandlers={{ click: () => setSimulated(q.lat, q.lng, q.destination) }}
          >
            <Tooltip>{`${loc(q.title)} · ${q.destination}`}</Tooltip>
          </CircleMarker>
        ))}
        <Marker
          position={[lat, lng]}
          icon={pin}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng()
              setSimulated(p.lat, p.lng)
            },
          }}
        />
      </MapContainer>
    </div>
  )
}

type Tab = 'place' | 'quest'

/**
 * Pretend to be somewhere else (for demos). Two tabs, each with its own map: search a place, or search a quest and go to
 * its spot. Changing the location does not close the popup, so it can be changed again.
 */
export function ChangeLocationView() {
  const t = useT()
  const loc = useLoc()
  const { lat, lng, placeName, setSimulated } = useLocation()
  const quests = useCatalog((s) => s.quests)
  const placeQuests = useMemo(() => quests.filter((q) => q.scope !== 'general'), [quests])
  const [tab, setTab] = useState<Tab>('place')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [questQuery, setQuestQuery] = useState('')
  // While you are not typing, each box shows what is set now: the name of the current location, or the quest you jumped to.
  const [editingPlace, setEditingPlace] = useState(false)
  const [editingQuest, setEditingQuest] = useState(false)
  const [pickedQuest, setPickedQuest] = useState<Quest | null>(null)
  const questShown = pickedQuest && haversine(lat, lng, pickedQuest.lat, pickedQuest.lng) < 300 ? loc(pickedQuest.title) : ''

  // Debounced Photon search (min 3 chars), previous request aborted. (min 3 chars), previous request aborted. Places in Vietnam come first.
  useEffect(() => {
    if (!editingPlace || query.trim().length < 3) {
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
    // the location itself is not a dependency: moving the pin must not run a new search
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, editingPlace])

  // quests from the database whose title or place matches what was typed
  const questMatches = useMemo(() => {
    const q = questQuery.trim().toLowerCase()
    if (!q) return []
    return placeQuests.filter((x) => loc(x.title).toLowerCase().includes(q) || x.destination.toLowerCase().includes(q)).slice(0, 6)
  }, [questQuery, placeQuests, loc])

  const choosePlace = (p: Place) => {
    setSimulated(p.lat, p.lng, p.area && p.area !== p.name ? `${p.name}, ${p.area}` : p.name)
    setEditingPlace(false) // the suggestions close and the box shows the new place; the popup stays open
    setQuery('')
    setResults([])
  }
  const chooseQuest = (q: Quest) => {
    setSimulated(q.lat, q.lng, q.destination)
    setPickedQuest(q)
    setEditingQuest(false)
    setQuestQuery('')
  }

  return (
    <div className="loc-view">
      <div className="loc-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'place'} className={tab === 'place' ? 'active' : ''} onClick={() => setTab('place')}>
          {t('locTabPlace')}
        </button>
        <button role="tab" aria-selected={tab === 'quest'} className={tab === 'quest' ? 'active' : ''} onClick={() => setTab('quest')}>
          {t('locTabQuest')}
        </button>
      </div>

      {tab === 'place' ? (
        <>
          {/* the suggestions float over what is below (they never push it down) */}
          <div className="loc-combo">
            <input
              className="loc-input"
              placeholder={t('searchPlaceholder')}
              value={editingPlace ? query : placeName}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                setEditingPlace(true)
                setQuery(e.target.value)
              }}
              onBlur={() => {
                setEditingPlace(false)
                setQuery('')
              }}
              aria-label={t('searchPlaceholder')}
            />
            {editingPlace && (results.length > 0 || searching || searchError) && (
              <ul className="loc-suggest" onMouseDown={(e) => e.preventDefault()}>
                {results.length === 0 && searching && <li className="loc-empty">{t('searching')}</li>}
                {results.length === 0 && searchError && <li className="loc-empty">{t('searchFailed')}</li>}
                {results.map((p, i) => (
                  <li key={`${p.lat},${p.lng},${i}`}>
                    <button className="loc-option" onClick={() => choosePlace(p)}>
                      <span className="loc-option-name">{p.name}</span>
                      {p.detail && <span className="loc-option-detail">{p.detail}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <LocationMap minZoom={12} />
          <p className="loc-hint">{t('dragHint')}</p>
        </>
      ) : (
        <>
          <div className="loc-combo">
            <input
              id="loc-quest"
              className="loc-input"
              placeholder={t('questSpotPlaceholder')}
              value={editingQuest ? questQuery : questShown}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                setEditingQuest(true)
                setQuestQuery(e.target.value)
              }}
              onBlur={() => {
                setEditingQuest(false)
                setQuestQuery('')
              }}
              aria-label={t('questSpotPlaceholder')}
            />
            {editingQuest && questQuery.trim() !== '' && (
              <ul className="loc-suggest" onMouseDown={(e) => e.preventDefault()}>
                {questMatches.length === 0 ? (
                  <li className="loc-empty">{t('questSpotNone')}</li>
                ) : (
                  questMatches.map((q) => (
                    <li key={q.id}>
                      <button className="loc-option" onClick={() => chooseQuest(q)}>
                        <span className="loc-option-name">{loc(q.title)}</span>
                        <span className="loc-option-detail">{q.destination}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <LocationMap spots={editingQuest && questMatches.length > 0 ? questMatches : placeQuests} minZoom={9} />
          <p className="loc-hint">{t('questMapHint')}</p>
        </>
      )}
    </div>
  )
}
