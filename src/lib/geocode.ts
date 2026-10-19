// Photon (photon.komoot.io, OpenStreetMap data). Used for place search and reverse geocoding.
// Search is debounced + aborted by the caller; do not point per-keystroke autocomplete at Nominatim.

export interface Place {
  name: string
  detail: string
  lat: number
  lng: number
}

const PHOTON = 'https://photon.komoot.io'

function describe(p: any): { name: string; detail: string } {
  const name = p.name ?? p.street ?? p.district ?? p.city ?? p.state ?? 'Lokasi'
  const parts = [p.district, p.city ?? p.county, p.state, p.country].filter(
    (x: string | undefined, i: number, arr: (string | undefined)[]) => x && x !== name && arr.indexOf(x) === i,
  )
  return { name, detail: parts.join(', ') }
}

export async function searchPlaces(
  query: string,
  near: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<Place[]> {
  const url = `${PHOTON}/api/?q=${encodeURIComponent(query)}&limit=5&lang=en&lat=${near.lat}&lon=${near.lng}`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error(`Photon ${r.status}`)
  const data = await r.json()
  return (data.features ?? []).map((f: any) => ({
    ...describe(f.properties ?? {}),
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }))
}

/** Coordinates -> readable place name (sent to Meilu). Returns a coordinate string on failure. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lng}&lang=en`)
    if (!r.ok) throw new Error(String(r.status))
    const f = (await r.json()).features?.[0]
    if (!f) throw new Error('empty')
    const { name, detail } = describe(f.properties ?? {})
    const city = detail.split(', ')[0]
    return city ? `${name}, ${city}` : name
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}
