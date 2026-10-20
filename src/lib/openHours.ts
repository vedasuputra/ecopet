// Opening hours of a shop. Shared by the traveler app, the vendor dashboard and the server.
// Stored as JSON: a day that is missing (or null) means closed that day; the whole value being null means
// the shop has not said when it is open. Times are "HH:MM" in Vietnam time and open < close.
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Day = (typeof DAYS)[number]
export type OpenHours = Partial<Record<Day, [string, string] | null>>

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** Returns a clean copy, or null when the value is not valid hours (the server rejects it). */
export function parseOpenHours(v: unknown): OpenHours | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const out: OpenHours = {}
  for (const d of DAYS) {
    const x = (v as Record<string, unknown>)[d]
    if (x == null) continue
    if (!Array.isArray(x) || x.length !== 2 || !TIME.test(String(x[0])) || !TIME.test(String(x[1])) || String(x[0]) >= String(x[1])) return null
    out[d] = [String(x[0]), String(x[1])]
  }
  return out
}

/** Weekday (0 = Monday) and minutes since midnight in Vietnam at `at`. */
function vietnamNow(at: Date): { day: number; minutes: number } {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(at)
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'))
  return { day, minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) }
}
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

export type OpenStatus =
  | { state: 'unknown' }
  | { state: 'open'; closesAt: string }
  | { state: 'closed'; next: { day: Day; time: string; today: boolean } | null }

export function openStatus(hours: OpenHours | null | undefined, at: Date = new Date()): OpenStatus {
  if (!hours) return { state: 'unknown' }
  const { day, minutes } = vietnamNow(at)
  const today = hours[DAYS[day]]
  if (today && minutes >= mins(today[0]) && minutes < mins(today[1])) return { state: 'open', closesAt: today[1] }
  if (today && minutes < mins(today[0])) return { state: 'closed', next: { day: DAYS[day], time: today[0], today: true } }
  for (let i = 1; i <= 7; i++) {
    const d = DAYS[(day + i) % 7]
    const h = hours[d]
    if (h) return { state: 'closed', next: { day: d, time: h[0], today: false } }
  }
  return { state: 'closed', next: null }
}

/** Today's day key in Vietnam. */
export const todayKey = (at: Date = new Date()): Day => DAYS[vietnamNow(at).day]
