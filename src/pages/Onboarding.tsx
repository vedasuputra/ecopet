import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MeiluAvatar from '../components/MeiluAvatar'
import TravelerQuiz from '../components/TravelerQuiz'
import { DESTINATIONS } from '../data/quests'
import { useLang, useT } from '../i18n'
import { planTrip } from '../lib/itineraryClient'
import type { TravelerStyle } from '../lib/travelerStyle'
import { useAppStore } from '../store/useAppStore'

// Three steps: the trip (days + places), Meilu asking what kind of traveler you are, then how to start.
export default function Onboarding() {
  const navigate = useNavigate()
  const t = useT()
  const lang = useLang((s) => s.lang)
  const user = useAppStore((s) => s.user)
  const setOnboarding = useAppStore((s) => s.setOnboarding)
  const applyItinerary = useAppStore((s) => s.applyItinerary)
  const giftClaimed = useAppStore((s) => s.welcomeGiftClaimed)
  // Changing the plan later starts from what the traveler chose before
  const hasPlan = !!user && user.destinations.length > 0
  const [step, setStep] = useState<'trip' | 'quiz' | 'ready'>('trip')
  const [days, setDays] = useState(hasPlan ? user.days : 2)
  const [dest, setDest] = useState<string[]>(hasPlan ? user.destinations : [])
  const [style, setStyle] = useState<TravelerStyle | undefined>(user?.style)
  const [busy, setBusy] = useState(false)

  const toggle = (d: string) =>
    setDest((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  // first time: the welcome coupon gacha, then quests
  const next = () => navigate(giftClaimed ? '/quests' : '/gift')

  const start = () => {
    setOnboarding(days, dest, style)
    next()
  }

  // Optional: one AI call builds a day-by-day plan from real quests and partner shops, fitted to the answers
  const planWithAi = async () => {
    setBusy(true)
    setOnboarding(days, dest, style)
    const plan = await planTrip({ days, destinations: dest, lang, ai: true, style })
    applyItinerary(plan)
    setBusy(false)
    navigate('/itinerary', { state: { onboarding: true } })
  }

  if (step === 'quiz') {
    return (
      <TravelerQuiz
        initial={style}
        intro={t('quizIntroOnboarding')}
        onBack={() => setStep('trip')}
        onDone={(s) => {
          setStyle(s)
          setStep('ready')
        }}
        onSkip={() => setStep('ready')}
      />
    )
  }

  if (step === 'ready') {
    return (
      <div>
        <MeiluAvatar size={90} />
        <p>{style ? t('quizThanks') : ''}</p>
        <h2>{t('onboardingReady')}</h2>
        <div>
          <button onClick={start} disabled={busy}>
            {t('start')}
          </button>
        </div>
        <p>
          <small>{t('onboardingPlanHint')}</small>
        </p>
        <button onClick={() => void planWithAi()} disabled={busy}>
          {busy ? t('planning') : t('planWithMeilu')}
        </button>
        <p>
          <button onClick={() => setStep('quiz')} disabled={busy}>
            {t('quizBack')}
          </button>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2>{t('tripPlan')}</h2>
      <label>
        {t('daysQ')}{' '}
        <input
          type="number"
          min={1}
          max={14}
          value={days}
          onChange={(e) => setDays(Math.min(14, Math.max(1, Number(e.target.value) || 1)))}
        />
      </label>
      <p>{t('whereQ')}</p>
      {DESTINATIONS.map((d) => (
        <div key={d}>
          <label>
            <input type="checkbox" checked={dest.includes(d)} onChange={() => toggle(d)} /> {d}
          </label>
        </div>
      ))}
      <p>
        <button onClick={() => setStep('quiz')}>{t('onboardingNext')}</button>
      </p>
    </div>
  )
}
