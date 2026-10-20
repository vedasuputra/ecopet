// Photon (photon.komoot.io, OpenStreetMap data). Used for place search and reverse geocoding.
// Search is debounced + aborted by the caller; do not point per-keystroke autocomplete at Nominatim.

export interface Place {
  name: string
  detail: string
  /** Broad area (city/province), used for Meilu chips and the place label. */
  area: string
  lat: number
  lng: number
  /** ISO country code ('VN' for Vietnam), when known. */
  countryCode?: string
}

const PHOTON = 'https://photon.komoot.io'

function describe(p: any): { name: string; detail: string; area: string } {
  const name = p.name ?? p.street ?? p.district ?? p.city ?? p.state ?? 'Unknown place'
  const area = p.city ?? p.county ?? p.state ?? p.district ?? ''
  const parts = [p.district, p.city ?? p.county, p.state, p.country].filter(
    (x: string | undefined, i: number, arr: (string | undefined)[]) => x && x !== name && arr.indexOf(x) === i,
  )
  return { name, detail: parts.join(', '), area }
}

const VIETNAM_BBOX = '102.1,8.3,109.6,23.5' // west, south, east, north

async function photonSearch(query: string, near: { lat: number; lng: number }, limit: number, signal?: AbortSignal, bbox?: string): Promise<Place[]> {
  const url = `${PHOTON}/api/?q=${encodeURIComponent(query)}&limit=${limit}&lang=en&lat=${near.lat}&lon=${near.lng}${bbox ? `&bbox=${bbox}` : ''}`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error(`Photon ${r.status}`)
  const data = await r.json()
  return (data.features ?? []).map((f: any) => ({
    ...describe(f.properties ?? {}),
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    countryCode: f.properties?.countrycode,
  }))
}

/**
 * Places in Vietnam come first. The box around Vietnam also catches parts of Laos and Cambodia, so the results are
 * filtered by country code too; places in other countries only fill the list when Vietnam has too few matches.
 */
export async function searchPlaces(
  query: string,
  near: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<Place[]> {
  const inBox = await photonSearch(query, near, 12, signal, VIETNAM_BBOX)
  const inVietnam = inBox.filter((p) => p.countryCode === 'VN').slice(0, 6)
  if (inVietnam.length >= 4) return inVietnam
  const anywhere = await photonSearch(query, near, 8, signal)
  const key = (p: Place) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
  const seen = new Set(inVietnam.map(key))
  const rest = anywhere.filter((p) => !seen.has(key(p)))
  // Vietnamese matches from the wide search still go before the foreign ones
  return [...inVietnam, ...rest.filter((p) => p.countryCode === 'VN'), ...rest.filter((p) => p.countryCode !== 'VN')].slice(0, 6)
}

/** Coordinates -> readable place name (sent to Meilu). Returns a coordinate string on failure. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lng}&lang=en`)
    if (!r.ok) throw new Error(String(r.status))
    const f = (await r.json()).features?.[0]
    if (!f) throw new Error('empty')
    const { name, area } = describe(f.properties ?? {})
    return area && area !== name ? `${name}, ${area}` : name
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}
