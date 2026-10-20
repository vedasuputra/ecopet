import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlanningScreen from '../components/PlanningScreen'
import TravelStyleSteps from '../components/TravelStyleSteps'
import TripSetup from '../components/TripSetup'
import { useLang, useT } from '../i18n'
import { planTrip } from '../lib/itineraryClient'
import { useFadeClose } from '../lib/useFadeClose'
import { clearDraft, getDraft, setDraft } from '../lib/styleDraft'
import { NO_ANSWERS, toStyle, type StyleAnswers, type TravelerStyle } from '../lib/travelerStyle'
import { useAppStore } from '../store/useAppStore'
import './onboarding.css'

// First set-up: how long you stay and where you go (every traveler is asked, domestic or international), then how to start.
// Meilu only asks what kind of traveler you are when you choose "Plan with Meilu"; starting directly skips the questions.
export default function Onboarding() {
  const navigate = useNavigate()
  const t = useT()
  const lang = useLang((s) => s.lang)
  const user = useAppStore((s) => s.user)
  const setOnboarding = useAppStore((s) => s.setOnboarding)
  const applyItinerary = useAppStore((s) => s.applyItinerary)
  const setOrigin = useAppStore((s) => s.setOrigin)
  const origin = user?.origin
  const giftClaimed = useAppStore((s) => s.welcomeGiftClaimed)
  const hasPlan = !!user && user.destinations.length > 0
  const [step, setStep] = useState<'trip' | 'quiz' | 'ready'>('trip')
  const [days, setDays] = useState(hasPlan ? user.days : Math.max(1, user?.days ?? 2))
  const [dest, setDest] = useState<string[]>(hasPlan ? user.destinations : [])
  const [style, setStyle] = useState<TravelerStyle | undefined>(user?.style)
  const [answers, setAnswers] = useState<StyleAnswers>(getDraft() ?? NO_ANSWERS) // nothing chosen at first (unless a planning failed before: then the answers are kept)
  const [busy, setBusy] = useState(false)
  // "how do you want to start?" is a popup over the trip page
  const [closing, closePopup, reopenPopup] = useFadeClose(() => setStep('trip'))
  useEffect(() => {
    if (step !== 'ready') return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !busy && closePopup()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [step, busy, closePopup])

  // first time: the welcome coupon gacha, then quests
  const next = () => navigate(giftClaimed ? '/home' : '/gift')

  const start = () => {
    setOnboarding(days, dest, style)
    next()
  }

  // Optional: one AI call builds a day-by-day plan from real quests and partner shops, fitted to the answers
  const planWithAi = async (s: TravelerStyle | undefined) => {
    setBusy(true)
    setOnboarding(days, dest, s)
    const plan = await planTrip({ days, destinations: dest, lang, ai: true, style: s })
    applyItinerary(plan)
    if (plan.source === 'ai') clearDraft()
    else setDraft(answers)
    setBusy(false)
    navigate('/itinerary', { state: { onboarding: true } })
  }

  if (step === 'quiz') {
    return (
      <div className="ob-page">
        {busy && <PlanningScreen />}
        <h2 className="ob-title">{t('yourStyle')}</h2>
        <p className="ob-note">{t('quizIntroOnboarding')}</p>
        <TravelStyleSteps
          style={answers}
          onChange={setAnswers}
          onDone={() => {
            const finished = toStyle(answers)
            setStyle(finished)
            void planWithAi(finished)
          }}
          onExit={() => setStep('ready')}
          doneLabel={t('quizPlanNow')}
          busy={busy}
          cardClass="ob-block"
          barClass="ob-two"
          btnClass="ob-btn"
          primaryClass="ob-primary"
        />
      </div>
    )
  }

  const originBlock = !origin && (
    // accounts made before this question existed
    <div className="ob-block">
      <span className="ts-label">{t('originQ')}</span>
      <div className="ob-two">
        <button className="ob-btn" onClick={() => setOrigin('domestic')}>
          {t('originDomesticShort')}
        </button>
        <button className="ob-btn" onClick={() => setOrigin('international')}>
          {t('originInternationalShort')}
        </button>
      </div>
    </div>
  )

  // how long the stay is and where to go on one page; the places can be left empty (a traveler may have no plan yet, and Meilu AI can suggest where to go)
  return (
    <div className="ob-page">
      <h2 className="ob-title">{t('tripPlan')}</h2>
      {originBlock}
      <div className="ob-block">
        <TripSetup days={days} onDays={setDays} places={dest} onPlaces={setDest} />
      </div>
      <button
        className="ob-btn ob-primary ob-bottom"
        onClick={() => {
          reopenPopup()
          setStep('ready')
        }}
      >
        {t('onboardingNext')}
      </button>

      {step === 'ready' && (
        <div className={`popup-backdrop${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={t('onboardingReceived')} onClick={() => !busy && closePopup()}>
          <div className="popup-card ob-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-head">
              <div className="popup-titles">
                <h3>{t('onboardingReceived')}</h3>
              </div>
              <button className="popup-close" onClick={closePopup} disabled={busy} aria-label={t('close')} title={t('close')}>
                <span className="mi" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <p className="ob-lead">{t('onboardingReady')}</p>
            <p className="ob-note">{t('onboardingPlanHint')}</p>
            <button className="ob-btn ob-primary" onClick={start} disabled={busy}>
              {t('start')}
            </button>
            <button className="ob-btn" onClick={() => setStep('quiz')} disabled={busy}>
              {busy ? t('planning') : t('planWithMeilu')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
