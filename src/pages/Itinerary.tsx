import { useState } from 'react'
import { Link, useLocation as useRouterLocation, useNavigate } from 'react-router-dom'
import TravelerQuiz, { styleLabel } from '../components/TravelerQuiz'
import { DESTINATIONS } from '../data/quests'
import { useLang, useLoc, useT, type Key } from '../i18n'
import { planCatalog, planTrip } from '../lib/itineraryClient'
import { clampDays, resizeItinerary, stripDayPrefix, type Itinerary, type ItineraryDay } from '../lib/planner'
import type { TravelerStyle } from '../lib/travelerStyle'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'

// The day-by-day plan. Everything in it points at a real quest or partner shop from the database.
// Before Meilu plans with AI she asks what kind of traveler you are. The stay can be lengthened or
// shortened here, and the plan can be edited by hand.
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
  const { setItinerary, applyItinerary, setTravelerStyle, changeTripDays } = useAppStore.getState()
  const quests = useCatalog((s) => s.quests)
  const vendors = useCatalog((s) => s.vendors)

  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  // null = no quiz; 'plan' = Meilu asks, then plans with AI; 'edit' = just change the answers
  const [quiz, setQuiz] = useState<null | 'plan' | 'edit'>(null)

  const style = user?.style
  const days = itinerary?.tripDays ?? user?.days ?? 2
  const destinations = itinerary?.destinations ?? (user?.destinations.length ? user.destinations : DESTINATIONS)

  const make = async (ai: boolean, s: TravelerStyle | undefined = style) => {
    setBusy(true)
    setMsg('')
    setItinerary(await planTrip({ days, destinations, lang, ai, style: s }))
    setBusy(false)
  }

  // The stay got longer or shorter: keep the days the traveler already has, add or drop days at the end
  const setStay = (n: number) => {
    const target = clampDays(n)
    if (target === days) return
    const resized = itinerary ? resizeItinerary(itinerary, target, { ...planCatalog(), lang, style }) : null
    changeTripDays(target, resized)
    setMsg(t('daysUpdated', { n: target }))
  }

  const change = (fn: (d: ItineraryDay[]) => ItineraryDay[]) => {
    if (!itinerary) return
    setItinerary({ ...itinerary, days: fn(itinerary.days.map((d) => ({ ...d, questIds: [...d.questIds], vendorIds: [...d.vendorIds] }))) })
  }
  const patchDay = (i: number, p: Partial<ItineraryDay>) => change((ds) => ds.map((d, j) => (j === i ? { ...d, ...p } : d)))

  const questName = (id: string) => {
    const q = quests.find((x) => x.id === id)
    return q ? loc(q.title) : id
  }

  const sourceNote = (it: Itinerary) => {
    const base = it.source === 'ai' ? t('itinerarySourceAi') : t('itinerarySourceRules')
    const why = it.fallback && it.fallback !== 'chosen' ? t(`itineraryFallback${it.fallback}` as Key) : ''
    return why ? `${base}. ${why}` : base
  }

  // ---- Meilu asks first
  if (quiz) {
    return (
      <TravelerQuiz
        initial={style}
        intro={quiz === 'plan' ? t('quizIntroPlan') : t('yourStyle')}
        doneLabel={quiz === 'plan' ? t('quizPlanNow') : t('quizDone')}
        onBack={() => setQuiz(null)}
        onDone={(s) => {
          setTravelerStyle(s)
          const mode = quiz
          setQuiz(null)
          if (mode === 'plan') void make(true, s)
        }}
      />
    )
  }

  const stayControl = (
    <p>
      {t('staysLabel')}:{' '}
      <button aria-label={t('fewerDays')} onClick={() => setStay(days - 1)} disabled={busy || days <= 1}>
        −
      </button>{' '}
      <b>{days}</b>{' '}
      <button aria-label={t('moreDays')} onClick={() => setStay(days + 1)} disabled={busy || days >= 14}>
        +
      </button>
    </p>
  )

  const styleBlock = (
    <p>
      <b>{t('yourStyle')}:</b>{' '}
      {style
        ? [
            t(styleLabel(style.pace)),
            style.interests.map((x) => t(styleLabel(x))).join(', '),
            t(styleLabel(style.company)),
            t(styleLabel(style.budget)),
            t(style.earlyRiser ? 'morningYes' : 'morningNo'),
          ]
            .filter(Boolean)
            .join(' · ')
        : t('styleNotSet')}{' '}
      <button onClick={() => setQuiz('edit')}>{t('changeStyle')}</button>
    </p>
  )

  if (!itinerary) {
    return (
      <div>
        <h2>{t('itineraryTitle')}</h2>
        {stayControl}
        {styleBlock}
        {msg && <p>{msg}</p>}
        <p>{t('itineraryEmpty')}</p>
        <button onClick={() => setQuiz('plan')} disabled={busy}>
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
      {stayControl}
      {styleBlock}
      <p>{itinerary.summary}</p>
      <p>
        <small>
          {t('itineraryTripLine', { days: itinerary.tripDays, dest: itinerary.destinations.join(', ') })} · {sourceNote(itinerary)}
        </small>
      </p>

      {itinerary.days.map((d, i) => (
        <section key={d.day} style={{ border: '1px solid #999', padding: 8, margin: '8px 0' }}>
          <h3>
            {t('dayLabel', { n: d.day })}: {stripDayPrefix(d.theme)}
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

          <b>{t('tripQuests')}</b> <small>{t('tripQuestsHint')}</small>
          <ul>
            {d.questIds.length === 0 && <li>{t('freeTime')}</li>}
            {d.questIds.map((id) => (
              <li key={id}>
                <Link to={`/quests/${id}`}>{questName(id)}</Link> {questStatus[id] === 'done' && '✓'}
              </li>
            ))}
          </ul>

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
      <button onClick={() => setQuiz('plan')} disabled={busy}>
        {busy ? t('planning') : t('planAgain')}
      </button>
      <button onClick={() => void make(false)} disabled={busy}>
        {t('planWithRules')}
      </button>
      <div>
        {fromOnboarding ? (
          <button
            onClick={() => {
              applyItinerary(itinerary)
              navigate(giftClaimed ? '/quests' : '/gift')
            }}
          >
            {t('useAndContinue')}
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                applyItinerary(itinerary)
                setMsg(t('questsFollowPlan'))
              }}
            >
              {t('useThisPlan')}
            </button>
            <button onClick={() => navigate('/quests')}>{t('back')}</button>
          </>
        )}
      </div>
    </div>
  )
}
