import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DESTINATIONS } from '../data/quests'
import { useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'

export default function Onboarding() {
  const navigate = useNavigate()
  const t = useT()
  const setOnboarding = useAppStore((s) => s.setOnboarding)
  const giftClaimed = useAppStore((s) => s.welcomeGiftClaimed)
  const [days, setDays] = useState(2)
  const [dest, setDest] = useState<string[]>([])

  const toggle = (d: string) =>
    setDest((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

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
          onChange={(e) => setDays(Number(e.target.value) || 1)}
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
      <button
        onClick={() => {
          setOnboarding(days, dest)
          // first time: the welcome coupon gacha, then quests
          navigate(giftClaimed ? '/quests' : '/gift')
        }}
      >
        {t('start')}
      </button>
    </div>
  )
}
