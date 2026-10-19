import { Link } from 'react-router-dom'
import MeiluAvatar from '../components/MeiluAvatar'
import { useAppStore } from '../store/useAppStore'

export default function Profile() {
  const { user, coins, questStatus } = useAppStore()
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
    </div>
  )
}
