import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MeiluAvatar from '../components/MeiluAvatar'
import TravelerQuiz from '../components/TravelerQuiz'
import TripSetup from '../components/TripSetup'
import { useLang, useT } from '../i18n'
import { planTrip } from '../lib/itineraryClient'
import type { TravelerStyle } from '../lib/travelerStyle'
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
  const [busy, setBusy] = useState(false)

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
    setBusy(false)
    navigate('/itinerary', { state: { onboarding: true } })
  }

  if (step === 'quiz') {
    return (
      <TravelerQuiz
        initial={style}
        intro={t('quizIntroOnboarding')}
        doneLabel={t('quizPlanNow')}
        onBack={() => setStep('ready')}
        onDone={(s) => {
          setStyle(s)
          void planWithAi(s)
        }}
      />
    )
  }

  if (step === 'ready') {
    return (
      <div className="ob-page ob-center">
        <MeiluAvatar size={96} />
        <h2 className="ob-title">{t('onboardingReady')}</h2>
        <button className="ob-btn ob-primary" onClick={start} disabled={busy}>
          {t('start')}
        </button>
        <p className="ob-note">{t('onboardingPlanHint')}</p>
        <button className="ob-btn" onClick={() => setStep('quiz')} disabled={busy}>
          {busy ? t('planning') : t('planWithMeilu')}
        </button>
        <button className="ob-link" onClick={() => setStep('trip')} disabled={busy}>
          {t('quizBack')}
        </button>
      </div>
    )
  }

  return (
    <div className="ob-page">
      <h2 className="ob-title">{t('tripPlan')}</h2>
      {!origin && (
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
      )}
      <div className="ob-block">
        <TripSetup days={days} onDays={setDays} places={dest} onPlaces={setDest} />
      </div>
      <button className="ob-btn ob-primary" onClick={() => setStep('ready')} disabled={dest.length === 0}>
        {t('onboardingNext')}
      </button>
      {dest.length === 0 && <p className="ob-note">{t('tripPickPlace')}</p>}
    </div>
  )
}
