import { Link, useNavigate } from 'react-router-dom'
import MeiluAvatar from '../components/MeiluAvatar'
import { supabase } from '../lib/supabase'
import { stopSync } from '../store/sync'
import { useAppStore } from '../store/useAppStore'

export default function Profile() {
  const navigate = useNavigate()
  const { user, coins, questStatus, reset } = useAppStore()

  const logout = async () => {
    stopSync()
    await supabase?.auth.signOut()
    reset() // clear this device's cache; the account's data stays in Supabase
    navigate('/login')
  }

  return (
    <div>
      <MeiluAvatar />
      <h2>{user?.name}</h2>
      <p>
        Menginap {user?.days} hari: {user?.destinations.join(', ') || '-'}
      </p>
      <p>
        Koin: {coins} | Quest selesai: {Object.keys(questStatus).length}
      </p>
      <Link to="/trip-card">Kartu kenangan</Link> | <Link to="/ad">Tonton iklan</Link> |{' '}
      <Link to="/onboarding">Ubah rencana</Link>
      <div>
        <button onClick={logout}>Keluar</button>
      </div>
    </div>
  )
}
