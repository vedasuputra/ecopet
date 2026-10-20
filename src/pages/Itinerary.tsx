import { useState } from 'react'
import { Link, useLocation as useRouterLocation, useNavigate } from 'react-router-dom'
import TravelerQuiz, { styleLabel } from '../components/TravelerQuiz'
import TripSetup from '../components/TripSetup'
import { DESTINATIONS } from '../data/quests'
import { useLang, useLoc, useT, type Key } from '../i18n'
import { planCatalog, planTrip } from '../lib/itineraryClient'
import { clampDays, resizeItinerary, stripDayPrefix, type Itinerary, type ItineraryDay } from '../lib/planner'
import type { TravelerStyle } from '../lib/travelerStyle'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import './trip.css'

// My trip: ONE page for the trip and its plan. At the top how long you stay and where you go (change them here, no separate
// "change plan" screen), your travel style, and the day-by-day plan below it. Everything in the plan points at a real quest or
// partner shop from the database. Before Meilu plans with AI she asks what kind of traveler you are.
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
  const { setItinerary, applyItinerary, setTravelerStyle, changeTripDays, setOnboarding } = useAppStore.getState()
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
  // the places being ticked: they only count when saved (saving them makes a new plan)
  const [draft, setDraft] = useState<string[]>(destinations)
  const sameAs = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
  const placesChanged = !sameAs(draft, destinations)

  const make = async (ai: boolean, s: TravelerStyle | undefined = style, dest: string[] = destinations) => {
    setBusy(true)
    setMsg('')
    setItinerary(await planTrip({ days, destinations: dest, lang, ai, style: s }))
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

  // new places: the old plan does not fit any more, so it is cleared and the quests are picked again
  const savePlaces = () => {
    if (draft.length === 0) return
    setOnboarding(days, draft, style)
    setMsg(t('tripPlacesSaved'))
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

  const styleText = style
    ? [
        t(styleLabel(style.pace)),
        style.interests.map((x) => t(styleLabel(x))).join(', '),
        t(styleLabel(style.company)),
        t(styleLabel(style.budget)),
        t(style.earlyRiser ? 'morningYes' : 'morningNo'),
      ]
        .filter(Boolean)
        .join(' · ')
    : t('styleNotSet')

  return (
    <div className="tp-page">
      <h2 className="tp-title">{t('myTripTitle')}</h2>

      <section className="tp-card">
        <TripSetup days={days} onDays={setStay} places={draft} onPlaces={setDraft} disabled={busy} />
        {placesChanged && (
          <div className="tp-changed">
            <p>{itinerary ? t('tripPlacesWarn') : t('tripPlacesSaveHint')}</p>
            <button className="tp-btn tp-primary" onClick={savePlaces} disabled={busy || draft.length === 0}>
              {t('tripSavePlaces')}
            </button>
          </div>
        )}
        <div className="tp-style">
          <span className="tp-style-text">
            <b>{t('yourStyle')}</b>
            <span>{styleText}</span>
          </span>
          <button className="tp-small" onClick={() => setQuiz('edit')}>
            {t('tripChange')}
          </button>
        </div>
      </section>

      {msg && <p className="tp-msg">{msg}</p>}

      {!itinerary ? (
        <section className="tp-card tp-empty">
          <p>{t('itineraryEmpty')}</p>
          <button className="tp-btn tp-primary" onClick={() => setQuiz('plan')} disabled={busy || placesChanged}>
            {busy ? t('planning') : t('planWithMeilu')}
          </button>
          <button className="tp-link" onClick={() => void make(false)} disabled={busy || placesChanged}>
            {t('planWithRules')}
          </button>
        </section>
      ) : (
        <>
          <p className="tp-summary">{itinerary.summary}</p>
          <p className="tp-source">{sourceNote(itinerary)}</p>

          {itinerary.days.map((d, i) => (
            <section key={d.day} className="tp-day">
              <header className="tp-day-head">
                <span className="tp-day-n">{t('dayLabel', { n: d.day })}</span>
                <span className="tp-day-theme">{stripDayPrefix(d.theme)}</span>
              </header>
              <div className="tp-day-body">
                <div className="tp-where">
                  <span className="mi" aria-hidden="true">
                    location_on
                  </span>
                  {editing ? (
                    <select className="tp-select" value={d.destination} onChange={(e) => patchDay(i, { destination: e.target.value })}>
                      {[...new Set([...itinerary.destinations, ...DESTINATIONS])].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>{d.destination}</span>
                  )}
                </div>

                <h4 className="tp-sub">{t('tripQuests')}</h4>
                <ul className="tp-list">
                  {d.questIds.length === 0 && <li className="tp-free">{t('freeTime')}</li>}
                  {d.questIds.map((id) => (
                    <li key={id}>
                      <Link to={`/quests/${id}`} className="tp-item">
                        <span className="mi" aria-hidden="true">
                          {questStatus[id] === 'done' ? 'check_circle' : 'checklist'}
                        </span>
                        <span className="tp-item-text">{questName(id)}</span>
                        <span className="mi tp-go" aria-hidden="true">
                          chevron_right
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                {d.vendorIds.length > 0 && (
                  <>
                    <h4 className="tp-sub">{t('tripShops')}</h4>
                    <ul className="tp-list">
                      {d.vendorIds.map((id) => (
                        <li key={id} className="tp-item tp-shop">
                          <span className="mi" aria-hidden="true">
                            storefront
                          </span>
                          <span className="tp-item-text">{vendors.find((v) => v.id === id)?.name ?? id}</span>
                          {editing && (
                            <button className="tp-x" onClick={() => patchDay(i, { vendorIds: d.vendorIds.filter((x) => x !== id) })} aria-label={t('removeItem')} title={t('removeItem')}>
                              <span className="mi" aria-hidden="true">
                                close
                              </span>
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {editing ? (
                  <label className="tp-note-edit">
                    <span>{t('yourNote')}</span>
                    <input maxLength={200} value={d.note} onChange={(e) => patchDay(i, { note: e.target.value })} />
                  </label>
                ) : (
                  d.note && (
                    <p className="tp-note">
                      <b>{t('tripTip')}:</b> {d.note}
                    </p>
                  )
                )}
              </div>
            </section>
          ))}

          <div className="tp-actions">
            {fromOnboarding ? (
              <button
                className="tp-btn tp-primary"
                onClick={() => {
                  applyItinerary(itinerary)
                  navigate(giftClaimed ? '/home' : '/gift')
                }}
              >
                {t('useAndContinue')}
              </button>
            ) : (
              <button
                className="tp-btn tp-primary"
                onClick={() => {
                  applyItinerary(itinerary)
                  setMsg(t('questsFollowPlan'))
                }}
              >
                {t('useThisPlan')}
              </button>
            )}
            <div className="tp-two">
              <button className="tp-btn" onClick={() => setEditing((e) => !e)}>
                {editing ? t('itineraryDone') : t('itineraryEdit')}
              </button>
              <button className="tp-btn" onClick={() => setQuiz('plan')} disabled={busy || placesChanged}>
                {busy ? t('planning') : t('planAgain')}
              </button>
            </div>
            <button className="tp-link" onClick={() => void make(false)} disabled={busy || placesChanged}>
              {t('planWithRules')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
