import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import { ARRIVAL_SPOTS, PLACE_COLOR, QUEST_COLOR, SHOP_COLOR, shopsWithCoupons } from '../data/arrival'
import { DESTINATION_INFO } from '../data/destinationInfo'
import { PLACES } from '../data/places'
import { useLoc, useT } from '../i18n'
import { formatDistance, haversine, mapsSearchUrl } from '../lib/geo'
import { searchPlaces } from '../lib/geocode'
import { useCatalog } from '../store/useCatalog'
import { useChatMap, type MapPlace } from '../store/useChatMap'
import { useLocation } from '../store/useLocation'
import ShopStatus from './ShopStatus'
import './chatmap.css'

// the place whose card is open: a bigger navy pin
const pin = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#044388;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
})
// the traveler: a blue dot with a soft pulse around it
const me = L.divIcon({ className: '', html: '<div class="cm-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] })

const KIND_COLOR: Record<MapPlace['kind'], string> = { destination: PLACE_COLOR, shop: SHOP_COLOR, quest: QUEST_COLOR, search: '#ccdde7' }

/** The places the app knows by name (destinations and partner shops), to find them in what Meilu says. */
export function knownPlaces(): MapPlace[] {
  const dest = PLACES.map((p) => ({ id: `d:${p.name}`, name: p.name, detail: '', lat: p.lat, lng: p.lng, kind: 'destination' as const }))
  const shops = useCatalog.getState().vendors.map((v) => ({ id: `v:${v.id}`, name: v.name, detail: v.address ?? '', lat: v.lat, lng: v.lng, kind: 'shop' as const, vendorId: v.id }))
  return [...shops, ...dest]
}

/** The known places named in a text (at most three, in the order they appear), for showing what Meilu recommends. */
export function placesIn(text: string): MapPlace[] {
  const low = text.toLowerCase()
  return knownPlaces()
    .map((p) => ({ p, at: low.indexOf(p.name.toLowerCase()) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.p)
    // "Cai Rang Floating Market" also contains a shorter known name: keep the longest ones only
    .filter((p, i, all) => !all.some((q, j) => j !== i && q.name.length > p.name.length && q.name.toLowerCase().includes(p.name.toLowerCase())))
    .slice(0, 3)
}

// Moves the map. It opens zoomed in on the traveler and keeps following them as they walk, until the map is dragged or a place is
// picked; the round button brings it back to the traveler (and following again).
function Follow({ places, selected, here, follow, recenter, onDrag }: { places: MapPlace[]; selected: MapPlace | null; here: [number, number]; follow: boolean; recenter: number; onDrag: () => void }) {
  const map = useMap()
  useMapEvents({ dragstart: onDrag })
  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 14), { duration: 0.6 })
    else if (places.length > 1) map.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number])), { padding: [24, 24] })
    else if (places.length === 1) map.setView([places[0].lat, places[0].lng], 14)
    else map.setView(here, 15)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, places, map])
  // walking: the map goes along
  useEffect(() => {
    if (follow) map.panTo(here, { animate: true })
  }, [here, follow, map])
  useEffect(() => {
    if (recenter) map.flyTo(here, Math.max(map.getZoom(), 15), { duration: 0.6 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenter, map])
  // the panel can change size (popup, full screen): the map must measure itself again
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 220)
    return () => clearTimeout(id)
  }, [map])
  return null
}

// The small map of the Meilu chat: where the traveler is (followed as they walk), the places, partner shops and quest spots around, a search, and the card of the place picked, to ask Meilu about it. Places Meilu names in her answers are shown
// here too. OpenStreetMap tiles and Photon search: no key needed.
export default function ChatMap({ onAsk, busy = false }: { onAsk: (p: MapPlace) => void; busy?: boolean }) {
  const t = useT()
  const loc = useLoc()
  const navigate = useNavigate()
  const { lat, lng } = useLocation()
  const { places, selected: selectedId, show, select, setOpen } = useChatMap()
  const vendors = useCatalog((s) => s.vendors)
  const coupons = useCatalog((s) => s.coupons)
  const quests = useCatalog((s) => s.quests)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [none, setNone] = useState(false)
  const [results, setResults] = useState<MapPlace[] | null>(null) // the list under the search box (null: closed)
  const [follow, setFollow] = useState(() => !useChatMap.getState().selected && useChatMap.getState().places.length === 0)
  const [recenter, setRecenter] = useState(0)
  const abort = useRef<AbortController | null>(null)
  const here = useMemo<[number, number]>(() => [lat, lng], [lat, lng])
  const selected = places.find((p) => p.id === selectedId) ?? null

  // all the spots of the app, always on the map: the places (with the area where Meilu says hello), partner shops, quest spots
  const shops = useMemo<MapPlace[]>(
    () => shopsWithCoupons(vendors, coupons).map((v) => ({ id: `v:${v.id}`, name: v.name, detail: v.address ?? '', lat: v.lat, lng: v.lng, kind: 'shop', vendorId: v.id })),
    [vendors, coupons],
  )
  const spots = useMemo<MapPlace[]>(
    () =>
      quests
        .filter((q) => q.scope !== 'general' && q.lat && q.lng)
        .map((q) => ({ id: `q:${q.id}`, name: loc(q.title), detail: q.destination, lat: q.lat, lng: q.lng, kind: 'quest', questId: q.id })),
    [quests, loc],
  )
  const dests = useMemo<MapPlace[]>(() => ARRIVAL_SPOTS.map((p) => ({ id: `d:${p.name}`, name: p.name, detail: '', lat: p.lat, lng: p.lng, kind: 'destination' })), [])

  // a dot of the map was tapped: it gets its card (added to the places shown, so the search results stay)
  const pick = (p: MapPlace) => {
    const shown = useChatMap.getState().places
    show(shown.some((x) => x.id === p.id) ? shown : [...shown, p], p.id)
    setFollow(false)
    setResults(null)
  }

  // searching: the app's own places first (a partner shop or a destination with that name), then OpenStreetMap
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const id = setTimeout(async () => {
      abort.current?.abort()
      const ctrl = new AbortController()
      abort.current = ctrl
      setSearching(true)
      setNone(false)
      const own = knownPlaces().filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 3)
      try {
        const found = await searchPlaces(q, { lat, lng }, ctrl.signal)
        const list = [...own, ...found.map((p, i) => ({ id: `s:${i}:${p.lat},${p.lng}`, name: p.name, detail: p.detail, lat: p.lat, lng: p.lng, kind: 'search' as const }))].slice(0, 6)
        setNone(list.length === 0)
        setResults(list)
        setFollow(false)
        show(list, null) // all of them on the map; the card waits for a choice
      } catch {
        if (!ctrl.signal.aborted) {
          setNone(own.length === 0)
          setResults(own)
          show(own, null)
        }
      }
      if (!ctrl.signal.aborted) setSearching(false)
    }, 450)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const vendor = selected?.vendorId ? vendors.find((v) => v.id === selected.vendorId) : undefined
  const offers = vendor ? coupons.filter((c) => c.vendorId === vendor.id && c.active !== false).length : 0
  const info = selected?.kind === 'destination' ? DESTINATION_INFO[selected.name] : undefined
  const quest = selected?.questId ? quests.find((q) => q.id === selected.questId) : undefined

  const dot = (p: MapPlace, radius: number) => (
    <CircleMarker
      key={`bg-${p.id}`}
      center={[p.lat, p.lng]}
      radius={radius}
      bubblingMouseEvents={false}
      pathOptions={{ color: '#fff', weight: 2, fillColor: KIND_COLOR[p.kind], fillOpacity: 1 }}
      eventHandlers={{ click: () => pick(p) }}
    >
      <Tooltip>{p.kind === 'quest' ? `${p.name} · ${p.detail}` : p.name}</Tooltip>
    </CircleMarker>
  )

  return (
    <div className="cm">
      <div className="cm-search">
        <span className="mi" aria-hidden="true">
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.trim().length < 2) setResults(null)
          }}
          onFocus={() => query.trim().length >= 2 && places.length > 0 && setResults(places)}
          onKeyDown={(e) => e.key === 'Escape' && setResults(null)}
          placeholder={t('mapSearch')}
          aria-label={t('mapSearch')}
          aria-expanded={!!results}
          aria-controls="cm-results"
        />
        <button className="cm-hide" onClick={() => setOpen(false)} aria-label={t('mapHide')} title={t('mapHide')}>
          <span className="mi" aria-hidden="true">
            close
          </span>
        </button>

        {/* the places found, floating over the map: choose one (its card opens), the others stay on the map */}
        {results && results.length > 0 && (
          <ul className="cm-results" id="cm-results" role="listbox">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  role="option"
                  aria-selected={p.id === selectedId}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    select(p.id)
                    setResults(null)
                  }}
                >
                  <span className="mi" aria-hidden="true">
                    {p.kind === 'shop' ? 'storefront' : p.kind === 'destination' ? 'near_me' : 'location_on'}
                  </span>
                  <span className="cm-r-text">
                    <b>{p.name}</b>
                    {(p.detail || p.kind !== 'search') && <span>{p.kind === 'shop' ? t('mapShop') : p.kind === 'destination' ? t('mapDestination') : p.detail}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cm-map">
        <MapContainer center={here} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Follow places={places} selected={selected} here={here} follow={follow} recenter={recenter} onDrag={() => setFollow(false)} />
          {/* the area of each place: inside it, Meilu says hello */}
          {ARRIVAL_SPOTS.map((p) => (
            <Circle key={`a:${p.name}`} center={[p.lat, p.lng]} radius={p.radiusM} interactive={false} pathOptions={{ color: PLACE_COLOR, weight: 1, opacity: 0.5, fillOpacity: 0.06 }} />
          ))}
          {dests.map((p) => dot(p, 7))}
          {spots.map((p) => dot(p, 6))}
          {shops.map((p) => dot(p, 6))}
          {/* the places shown (found, or named by Meilu): a thick navy ring, to stand out from the other dots */}
          {places
            .filter((p) => p.id !== selectedId)
            .map((p) => (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lng]}
                radius={9}
                bubblingMouseEvents={false}
                pathOptions={{ color: '#044388', weight: 3, fillColor: KIND_COLOR[p.kind], fillOpacity: 1 }}
                eventHandlers={{ click: () => {
                  select(p.id)
                  setFollow(false)
                  setResults(null)
                } }}
              />
            ))}
          {selected && <Marker position={[selected.lat, selected.lng]} icon={pin} />}
          <Marker position={here} icon={me} interactive={false} zIndexOffset={1000} />
        </MapContainer>
        {searching && <span className="cm-status">{t('mapSearching')}</span>}
        {!searching && none && <span className="cm-status">{t('mapNoResults')}</span>}
        {/* back to where the traveler is, and follow them again */}
        <button
          className={`cm-locate${follow ? ' on' : ''}`}
          onClick={() => {
            setFollow(true)
            setRecenter((n) => n + 1)
          }}
          aria-label={t('mapMyLocation')}
          title={t('mapMyLocation')}
        >
          <span className="mi" aria-hidden="true">
            my_location
          </span>
        </button>
      </div>

      <div className="cm-legend">
        <span>
          <i style={{ background: PLACE_COLOR }} />
          {t('locLegendPlace')}
        </span>
        <span>
          <i style={{ background: SHOP_COLOR }} />
          {t('mapShop')}
        </span>
        <span>
          <i style={{ background: QUEST_COLOR }} />
          {t('locLegendQuest')}
        </span>
      </div>

      {selected && (
        <div className="cm-card">
          <div className="cm-card-top">
            <span className="cm-kind">
              {selected.kind === 'shop' ? t('mapShop') : selected.kind === 'destination' ? t('mapDestination') : selected.kind === 'quest' ? t('locLegendQuest') : t('mapPlace')}
            </span>
            <span className="cm-dist">{formatDistance(haversine(lat, lng, selected.lat, selected.lng))}</span>
          </div>
          <b className="cm-name">{selected.name}</b>
          {vendor ? (
            <span className="cm-detail">
              {loc(vendor.category)} · <ShopStatus hours={vendor.openHours} short />
            </span>
          ) : info ? (
            <span className="cm-detail">{loc(info)}</span>
          ) : quest ? (
            <span className="cm-detail">{`${quest.destination} · ${loc(quest.description)}`}</span>
          ) : (
            selected.detail && <span className="cm-detail">{selected.detail}</span>
          )}
          <div className="cm-actions">
            <button className="cm-btn cm-primary" onClick={() => onAsk(selected)} disabled={busy}>
              {t('mapAsk')}
            </button>
            {vendor && offers > 0 ? (
              <button className="cm-btn" onClick={() => navigate(`/shops/${vendor.id}`)}>
                {t('mapSeeCoupons', { n: offers })}
              </button>
            ) : quest ? (
              <button className="cm-btn" onClick={() => navigate(`/quests/${quest.id}`)}>
                {t('mapOpenQuest')}
              </button>
            ) : (
              <a className="cm-btn" href={mapsSearchUrl(`${selected.name}${selected.detail ? `, ${selected.detail}` : ''}`)} target="_blank" rel="noopener noreferrer">
                {t('mapOpenGoogle')}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
