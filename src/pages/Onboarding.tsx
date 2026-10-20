import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DESTINATIONS } from '../data/quests'
import { useLang, useT } from '../i18n'
import { planTrip } from '../lib/itineraryClient'
import { useAppStore } from '../store/useAppStore'

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
  const [days, setDays] = useState(hasPlan ? user.days : 2)
  const [dest, setDest] = useState<string[]>(hasPlan ? user.destinations : [])
  const [busy, setBusy] = useState(false)

  const toggle = (d: string) =>
    setDest((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  // first time: the welcome coupon gacha, then quests
  const next = () => navigate(giftClaimed ? '/quests' : '/gift')

  const start = () => {
    setOnboarding(days, dest)
    next()
  }

  // Optional: one AI call builds a day-by-day plan from real quests and partner shops
  const planWithAi = async () => {
    setBusy(true)
    setOnboarding(days, dest)
    const plan = await planTrip({ days, destinations: dest, lang, ai: true })
    applyItinerary(plan)
    setBusy(false)
    navigate('/itinerary', { state: { onboarding: true } })
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
    </div>
  )
}
