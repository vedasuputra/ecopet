import { useState } from 'react'
import { Link, useLocation as useRouterLocation, useNavigate } from 'react-router-dom'
import { DESTINATIONS } from '../data/quests'
import { useLang, useLoc, useT, type Key } from '../i18n'
import { planTrip } from '../lib/itineraryClient'
import type { Itinerary, ItineraryDay } from '../lib/planner'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'

// The day-by-day plan. Everything in it points at a real quest or partner shop from the database.
// It can be planned by Meilu (one AI call), by simple rules, and edited by hand.
export default function ItineraryPage() {
  const t = useT()
  const loc = useLoc()
  const lang = useLang((s) => s.lang)
  const navigate = useNavigate()
  const route = useRouterLocation()
  const fromOnboarding = !!(route.state as { onboarding?: boolean } | null)?.onboarding

  const user = useAppStore((s) => s.user)
  const itinerary = useAppStore((s) => s.itinerary)
  const questStatus = useAppStore((s) => s.questStatus)
  const giftClaimed = useAppStore((s) => s.welcomeGiftClaimed)
  const { setItinerary, applyItinerary } = useAppStore.getState()
  const quests = useCatalog((s) => s.quests)
  const vendors = useCatalog((s) => s.vendors)

  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const days = itinerary?.tripDays ?? user?.days ?? 2
  const destinations = itinerary?.destinations ?? (user?.destinations.length ? user.destinations : DESTINATIONS)

  const make = async (ai: boolean) => {
    setBusy(true)
    setMsg('')
    setItinerary(await planTrip({ days, destinations, lang, ai }))
    setBusy(false)
  }

  const change = (fn: (d: ItineraryDay[]) => ItineraryDay[]) => {
    if (!itinerary) return
    setItinerary({ ...itinerary, days: fn(itinerary.days.map((d) => ({ ...d, questIds: [...d.questIds], vendorIds: [...d.vendorIds] }))) })
  }
  const patchDay = (i: number, p: Partial<ItineraryDay>) => change((ds) => ds.map((d, j) => (j === i ? { ...d, ...p } : d)))

  const used = new Set(itinerary?.days.flatMap((d) => d.questIds) ?? [])
  const questName = (id: string) => {
    const q = quests.find((x) => x.id === id)
    return q ? loc(q.title) : id
  }

  const sourceNote = (it: Itinerary) => {
    const base = it.source === 'ai' ? t('itinerarySourceAi') : t('itinerarySourceRules')
    const why = it.fallback && it.fallback !== 'chosen' ? t(`itineraryFallback${it.fallback}` as Key) : ''
    return why ? `${base}. ${why}` : base
  }

  if (!itinerary) {
    return (
      <div>
        <h2>{t('itineraryTitle')}</h2>
        <p>{t('itineraryEmpty')}</p>
        <button onClick={() => void make(true)} disabled={busy}>
          {busy ? t('planning') : t('planWithMeilu')}
        </button>
        <button onClick={() => void make(false)} disabled={busy}>
          {t('planWithRules')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2>{t('itineraryTitle')}</h2>
      <p>{itinerary.summary}</p>
      <p>
        <small>
          {t('itineraryTripLine', { days: itinerary.tripDays, dest: itinerary.destinations.join(', ') })} · {sourceNote(itinerary)}
        </small>
      </p>

      {itinerary.days.map((d, i) => (
        <section key={d.day} style={{ border: '1px solid #999', padding: 8, margin: '8px 0' }}>
          <h3>
            {t('dayLabel', { n: d.day })}: {d.theme}
          </h3>
          {editing ? (
            <select value={d.destination} onChange={(e) => patchDay(i, { destination: e.target.value })}>
              {[...new Set([...itinerary.destinations, ...DESTINATIONS])].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          ) : (
            <p>{d.destination}</p>
          )}

          <b>{t('tripQuests')}</b>
          <ul>
            {d.questIds.length === 0 && <li>{t('freeTime')}</li>}
            {d.questIds.map((id) => (
              <li key={id}>
                <Link to={`/quests/${id}`}>{questName(id)}</Link> {questStatus[id] === 'done' && '✓'}
                {editing && <button onClick={() => patchDay(i, { questIds: d.questIds.filter((x) => x !== id) })}>{t('removeItem')}</button>}
              </li>
            ))}
          </ul>
          {editing && (
            <select
              value=""
              onChange={(e) => e.target.value && patchDay(i, { questIds: [...d.questIds, e.target.value] })}
            >
              <option value="">{t('addQuest')}</option>
              {quests.filter((q) => !used.has(q.id)).map((q) => (
                <option key={q.id} value={q.id}>
                  {loc(q.title)}
                </option>
              ))}
            </select>
          )}

          {d.vendorIds.length > 0 && (
            <>
              <br />
              <b>{t('tripShops')}</b>
              <ul>
                {d.vendorIds.map((id) => (
                  <li key={id}>
                    {vendors.find((v) => v.id === id)?.name ?? id}
                    {editing && <button onClick={() => patchDay(i, { vendorIds: d.vendorIds.filter((x) => x !== id) })}>{t('removeItem')}</button>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {editing ? (
            <div>
              <label>
                {t('yourNote')}{' '}
                <input maxLength={200} value={d.note} onChange={(e) => patchDay(i, { note: e.target.value })} />
              </label>
            </div>
          ) : (
            d.note && (
              <p>
                <small>
                  {t('tripTip')}: {d.note}
                </small>
              </p>
            )
          )}
        </section>
      ))}

      {msg && <p>{msg}</p>}
      <button onClick={() => setEditing((e) => !e)}>{editing ? t('itineraryDone') : t('itineraryEdit')}</button>
      <button onClick={() => void make(true)} disabled={busy}>
        {busy ? t('planning') : t('planAgain')}
      </button>
      <button onClick={() => void make(false)} disabled={busy}>
        {t('planWithRules')}
      </button>
      <div>
        <button
          onClick={() => {
            applyItinerary(itinerary)
            setMsg(t('questsFollowPlan'))
          }}
        >
          {t('useThisPlan')}
        </button>
        {fromOnboarding ? (
          <button onClick={() => navigate(giftClaimed ? '/quests' : '/gift')}>{t('itineraryContinue')}</button>
        ) : (
          <button onClick={() => navigate('/quests')}>{t('back')}</button>
        )}
      </div>
    </div>
  )
}
