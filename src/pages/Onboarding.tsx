import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DESTINATIONS } from '../data/quests'
import { useAppStore } from '../store/useAppStore'

export default function Onboarding() {
  const navigate = useNavigate()
  const setOnboarding = useAppStore((s) => s.setOnboarding)
  const [days, setDays] = useState(2)
  const [dest, setDest] = useState<string[]>([])

  const toggle = (d: string) =>
    setDest((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  return (
    <div>
      <h2>Rencana trip</h2>
      <label>
        Berapa hari menginap?{' '}
        <input
          type="number"
          min={1}
          max={14}
          value={days}
          onChange={(e) => setDays(Number(e.target.value) || 1)}
        />
      </label>
      <p>Mau ke mana?</p>
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
          navigate('/quests')
        }}
      >
        Mulai
      </button>
    </div>
  )
}
