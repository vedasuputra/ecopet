import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export default function Login() {
  const navigate = useNavigate()
  const login = useAppStore((s) => s.login)
  const [name, setName] = useState('')

  return (
    <div>
      <h1>Eco-Pet</h1>
      <p>Jelajahi Mekong Delta bersama Meilu.</p>
      <input placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} />
      <button
        onClick={() => {
          login(name.trim() || 'Traveler')
          navigate('/onboarding')
        }}
      >
        Masuk
      </button>
    </div>
  )
}
