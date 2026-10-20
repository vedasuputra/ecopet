import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MeiluAvatar from '../components/MeiluAvatar'
import TravelerQuiz from '../components/TravelerQuiz'
import { DESTINATIONS } from '../data/quests'
import { useLang, useT } from '../i18n'
import { planTrip } from '../lib/itineraryClient'
import type { TravelerStyle } from '../lib/travelerStyle'
import { useAppStore } from '../store/useAppStore'

// The trip (days + places), then how to start. Meilu only asks what kind of traveler you are when you
// choose "Plan with Meilu"; starting directly skips the questions.
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
      <div>
        <MeiluAvatar size={90} />
        <h2>{t('onboardingReady')}</h2>
        <div>
          <button onClick={start} disabled={busy}>
            {t('start')}
          </button>
        </div>
        <p>
          <small>{t('onboardingPlanHint')}</small>
        </p>
        <button onClick={() => setStep('quiz')} disabled={busy}>
          {busy ? t('planning') : t('planWithMeilu')}
        </button>
        <p>
          <button onClick={() => setStep('trip')} disabled={busy}>
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
        <button onClick={() => setStep('ready')}>{t('onboardingNext')}</button>
      </p>
    </div>
  )
}
