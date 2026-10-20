import { useEffect, useRef, useState } from 'react'
import { Link, useLocation as useRouterLocation, useNavigate } from 'react-router-dom'
import FilterDropdown from '../components/FilterDropdown'
import PlanningScreen from '../components/PlanningScreen'
import TravelStyleSteps from '../components/TravelStyleSteps'
import TripSetup from '../components/TripSetup'
import { DESTINATION_INFO } from '../data/destinationInfo'
import { DESTINATIONS } from '../data/quests'
import { useLang, useLoc, useT, type Key } from '../i18n'
import { planCatalog, planTrip } from '../lib/itineraryClient'
import { clampDays, emptyPlan, nearestVendors, resizeItinerary, stripDayPrefix, type Itinerary, type ItineraryDay } from '../lib/planner'
import { NO_ANSWERS, toStyle, type StyleAnswers, type TravelerStyle } from '../lib/travelerStyle'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import './trip.css'

// My trip: ONE page for the trip and its plan. At the top how long you stay and where you go (change them here, no separate
// "change plan" screen), your travel style, and the day-by-day plan below it. Everything in the plan points at a real quest or
// partner shop from the database. Before Meilu plans with AI she asks what kind of traveler you are.
// While you work on the design: open the trip page with ?planning in the address (dev only) to see the loading popup without planning.
const PREVIEW_PLANNING = import.meta.env.DEV && new URLSearchParams(window.location.search).has('planning')

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
  const [jumpDay, setJumpDay] = useState(1)
  // two tabs: the trip itself (days, places, style) and the plan for its days; coming from the first set-up opens the plan
  const [tab, setTab] = useState<'trip' | 'plan'>(fromOnboarding ? 'plan' : 'trip')
  const [busy, setBusy] = useState(false)
  // a short note that something was saved; it fades after a moment
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const flash = (text: string) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  // the plan as it was when Edit was pressed, so Cancel can put it back
  // (`plan` is null when there was no plan before, so Cancel goes back to having none)
  const [snapshot, setSnapshot] = useState<{ plan: Itinerary | null } | null>(null)

  const style = user?.style
  const days = itinerary?.tripDays ?? user?.days ?? 2
  const destinations = itinerary?.destinations ?? user?.destinations ?? [] // none chosen is fine: Meilu AI then picks where to go
  // the places being ticked: they only count when saved (saving them makes a new plan)
  const [draft, setDraft] = useState<string[]>(destinations)
  const sameAs = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
  const placesChanged = !sameAs(draft, destinations)
  // the stay too is only a draft until it is saved, so both can be saved together with one button
  const [draftDays, setDraftDays] = useState(days)
  const [answers, setAnswers] = useState<StyleAnswers>(NO_ANSWERS) // the questions always start with nothing chosen
  // the travel style is only asked when you choose to plan with Meilu AI (it is only used by the AI, and by Meilu in the chat)
  const [asking, setAsking] = useState(false)
  const tripDirty = placesChanged || draftDays !== days // days and places belong to My Trip; the style has its own tab and its own save
  const dirty = tripDirty
  // when the saved trip changes (a save, a plan made elsewhere, the first set-up), the drafts follow it, so nothing looks "unsaved" by mistake
  const savedKey = `${days}|${[...destinations].sort().join(',')}`
  useEffect(() => {
    setDraftDays(days)
    setDraft(destinations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey])

  const make = async (ai: boolean, s: TravelerStyle | undefined = style, dest: string[] = destinations) => {
    setBusy(true)
    try {
      setItinerary(await planTrip({ days, destinations: dest, lang, ai, style: s }))
    } catch {
      // whatever went wrong, make a plan on this device, so the button never ends up stuck on "planning"
      setItinerary(await planTrip({ days, destinations: dest, lang, ai: false, style: s }))
    } finally {
      setBusy(false)
    }
  }

  // "simple rules": an empty plan for every day, to be filled in by hand (the editing mode opens at once)
  const makeBlank = () => {
    setSnapshot({ plan: itinerary }) // Cancel brings back the plan you had before
    setItinerary(emptyPlan(days, destinations))
    setEditing(true)
    setTab('plan')
  }

  // The stay got longer or shorter: keep the days the traveler already has, add or drop days at the end
  const setStay = (n: number) => {
    const target = clampDays(n)
    if (target === days) return
    const resized = itinerary ? resizeItinerary(itinerary, target, { ...planCatalog(), lang, style }) : null
    changeTripDays(target, resized)
  }

  // One button saves the days and the places. New places make the old plan useless, so it is cleared and the quests are picked
  // again; only a new number of days keeps the plan (and adds or drops days at the end).
  const save = () => {
    if (!tripDirty) return
    if (placesChanged) setOnboarding(clampDays(draftDays), draft, style)
    else setStay(draftDays)
    flash(t('tripSaved'))
  }
  const openAsk = () => {
    setAnswers(NO_ANSWERS)
    setAsking(true)
  }

  // after the questions: keep the answers and let Meilu plan with them
  const planWithAi = async () => {
    const finished = toStyle(answers)
    setTravelerStyle(finished)
    setAsking(false)
    await make(true, finished)
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

  return (
    <div className="tp-page">
      {(busy || PREVIEW_PLANNING) && <PlanningScreen />}
      {/* the tabs and, on the plan, the jump-to-a-day dropdown: always at the top while the page scrolls */}
      <div className="tp-top">
        <div className="tp-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'trip'} className={tab === 'trip' ? 'active' : ''} onClick={() => setTab('trip')}>
            {t('tripTabTrip')}
          </button>
          <button role="tab" aria-selected={tab === 'plan'} className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>
            {t('tripTabPlan')}
          </button>
        </div>
        {tab === 'plan' && itinerary && !asking && (
          <div className="tp-jump">
            <FilterDropdown
              icon="format_list_numbered"
              prefix={t('tripJump')}
              label={t('tripJump')}
              value={String(jumpDay)}
              matchWidth
              onChange={(v) => {
                setJumpDay(Number(v))
                document.getElementById(`tp-day-${v}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              options={itinerary.days.map((d) => ({ value: String(d.day), label: t('dayLabel', { n: d.day }), sub: stripDayPrefix(d.theme) }))}
            />
          </div>
        )}
      </div>

      {tab === 'trip' ? (
        <>
      <section className="tp-card">
        <TripSetup days={draftDays} onDays={setDraftDays} places={draft} onPlaces={setDraft} disabled={busy} />
      </section>

          {/* always at the bottom of the screen: saves the days and the places together */}
          <div className="tp-savebar">
            {toast && (
              <div className="tp-toast" role="status">
                {toast}
              </div>
            )}
            {tripDirty && placesChanged && itinerary && <p>{t('tripPlacesWarn')}</p>}
            <div className="tp-two">
              <button
                className="tp-btn"
                onClick={() => {
                  setDraftDays(days)
                  setDraft(destinations)
                }}
                disabled={busy || !tripDirty}
              >
                {t('tripRevert')}
              </button>
              <button className="tp-btn tp-primary" onClick={save} disabled={busy || !tripDirty}>
                {t('tripSave')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {dirty && <p className="tp-hint">{t('tripSaveFirst')}</p>}
      {asking ? (
        <>
          <h3 className="tp-ask-title">{t('yourStyle')}</h3>
          <p className="tp-style-intro">{t('tripStyleIntro')}</p>
          <TravelStyleSteps
            style={answers}
            onChange={setAnswers}
            onDone={() => void planWithAi()}
            onExit={() => setAsking(false)}
            doneLabel={t('quizPlanNow')}
            busy={busy}
            cardClass="tp-card"
            barClass="tp-savebar tp-two"
            btnClass="tp-btn"
            primaryClass="tp-primary"
          />
        </>
      ) : !itinerary ? (
        <section className="tp-card tp-empty">
          <p>{t('itineraryEmpty')}</p>
          <button className="tp-btn tp-primary" onClick={() => openAsk()} disabled={busy || dirty}>
            {busy ? t('planning') : t('tripPlanAi')}
          </button>
          <button className="tp-btn" onClick={() => makeBlank()} disabled={busy || dirty}>
            {t('tripPlanRules')}
          </button>
        </section>
      ) : (
        <>
          {/* the title and where the plan came from, with Edit at the right; under them a table of contents to jump to a day */}
          <div className="tp-summary-row">
            <div className="tp-summary">
              <h3 className="tp-plan-title">{t('tripPlanDays', { n: itinerary.days.length })}</h3>
              <p className="tp-source">{sourceNote(itinerary)}</p>
            </div>
            <button
              className="tp-small"
              onClick={() => {
                if (editing) {
                  // Cancel: the changes made since Edit was pressed are thrown away
                  if (snapshot) setItinerary(snapshot.plan)
                  setSnapshot(null)
                  setEditing(false)
                } else {
                  setSnapshot({ plan: itinerary })
                  setEditing(true)
                }
              }}
            >
              {editing ? t('cancel') : t('itineraryEdit')}
            </button>
          </div>
          {itinerary.days.map((d, i) => (
            <section key={d.day} id={`tp-day-${d.day}`} className="tp-day">
              <header className="tp-day-head">
                <span className="tp-day-n">{t('dayLabel', { n: d.day })}</span>
                <span className={`tp-day-theme${d.destination || d.theme ? '' : ' empty'}`}>{stripDayPrefix(d.theme) || d.destination || t('tripNoPlace')}</span>
              </header>
              <div className="tp-day-body">
                {editing && (
                  <div className="tp-where">
                    <FilterDropdown
                      icon="location_on"
                      label={t('whereQ')}
                      value={d.destination}
                      matchWidth
                      onChange={(v) => patchDay(i, { destination: v })}
                      options={[{ value: '', label: t('tripChoosePlace') }, ...[...new Set([...itinerary.destinations, ...DESTINATIONS])].map((x) => ({
                        value: x,
                        label: x,
                        sub: DESTINATION_INFO[x] ? loc(DESTINATION_INFO[x]) : undefined,
                      }))]}
                    />
                  </div>
                )}

                <h4 className="tp-sub">{t('tripQuests')}</h4>
                <ul className="tp-list">
                  {d.questIds.length === 0 && <li className="tp-free">{t('freeTime')}</li>}
                  {d.questIds.map((id) => (
                    <li key={id} className="tp-shoprow">
                      <Link to={`/quests/${id}`} state={{ from: '/itinerary', fromState: { onboarding: fromOnboarding } }} className="tp-item">
                        <span className="mi" aria-hidden="true">
                          {questStatus[id] === 'done' ? 'check_circle' : 'checklist'}
                        </span>
                        <span className="tp-item-text">{questName(id)}</span>
                        <span className="mi tp-go" aria-hidden="true">
                          chevron_right
                        </span>
                      </Link>
                      {editing && (
                        <button className="tp-x" onClick={() => patchDay(i, { questIds: d.questIds.filter((x) => x !== id) })} aria-label={t('removeItem')} title={t('removeItem')}>
                          <span className="mi" aria-hidden="true">
                            close
                          </span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {editing && d.destination && (
                  <div className="tp-where tp-add">
                    <FilterDropdown
                      icon="add"
                      label={t('tripAddQuest')}
                      value=""
                      matchWidth
                      onChange={(v) => v && patchDay(i, { questIds: [...d.questIds, v] })}
                      options={[
                        { value: '', label: t('tripAddQuest') },
                        ...quests
                          .filter((q) => q.scope !== 'general' && q.destination === d.destination && !itinerary.days.some((x) => x.questIds.includes(q.id)))
                          .map((q) => ({ value: q.id, label: loc(q.title) })),
                      ]}
                    />
                  </div>
                )}

                {(d.vendorIds.length > 0 || (editing && d.destination)) && (
                  <>
                    <h4 className="tp-sub">{t('tripShops')}</h4>
                    <ul className="tp-list">
                      {d.vendorIds.map((id) => (
                        <li key={id} className="tp-shoprow">
                          <Link to={`/shops/${id}`} state={{ from: '/itinerary', fromState: { onboarding: fromOnboarding } }} className="tp-item">
                            <span className="mi" aria-hidden="true">
                              storefront
                            </span>
                            <span className="tp-item-text">{vendors.find((v) => v.id === id)?.name ?? id}</span>
                            <span className="mi tp-go" aria-hidden="true">
                              chevron_right
                            </span>
                          </Link>
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
                    {editing && d.destination && (
                      <div className="tp-where tp-add">
                        <FilterDropdown
                          icon="add"
                          label={t('tripAddShop')}
                          value=""
                          matchWidth
                          onChange={(v) => v && patchDay(i, { vendorIds: [...d.vendorIds, v] })}
                          options={[
                            { value: '', label: t('tripAddShop') },
                            ...nearestVendors(d.destination, planCatalog().vendors, 8, 40)
                              .filter((v) => !d.vendorIds.includes(v.id))
                              .map((v) => ({ value: v.id, label: v.name, sub: v.category })),
                          ]}
                        />
                      </div>
                    )}
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

          {/* plan again: both ways of planning, the one the plan was made with says "again" */}
          <div className="tp-two tp-replan">
            {itinerary.source === 'ai' ? (
              <>
                <button className="tp-btn" onClick={() => makeBlank()} disabled={busy || dirty}>
                  {t('planWithRules')}
                </button>
                <button className="tp-btn" onClick={() => openAsk()} disabled={busy || dirty}>
                  {busy ? t('planning') : t('tripPlanAgainAi')}
                </button>
              </>
            ) : (
              <>
                <button className="tp-btn" onClick={() => openAsk()} disabled={busy || dirty}>
                  {busy ? t('planning') : t('tripPlanWithMeilu')}
                </button>
                <button className="tp-btn" onClick={() => makeBlank()} disabled={busy || dirty}>
                  {t('tripPlanAgainRules')}
                </button>
              </>
            )}
          </div>
          {/* only Use plan stays at the bottom of the screen */}
          <div className="tp-savebar">
            {toast && (
              <div className="tp-toast" role="status">
                {toast}
              </div>
            )}
            <button
              className="tp-btn tp-primary"
              onClick={() => {
                applyItinerary(itinerary)
                setEditing(false)
                setSnapshot(null)
                if (fromOnboarding) navigate(giftClaimed ? '/home' : '/gift')
                else flash(t('tripPlanSaved'))
              }}
            >
              {t('tripUsePlan')}
            </button>
          </div>
        </>
      )}
        </>
      )}
    </div>
  )
}
