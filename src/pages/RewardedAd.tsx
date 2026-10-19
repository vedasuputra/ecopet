import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AD_REWARD, useAppStore } from '../store/useAppStore'

const DURATION = 10

export default function RewardedAd() {
  const navigate = useNavigate()
  const { claimAd, adsLeftToday } = useAppStore()
  const [left, setLeft] = useState<number | null>(null)
  const [claimed, setClaimed] = useState(false)
  const blocked = adsLeftToday() <= 0 && !claimed

  useEffect(() => {
    if (left === null || left <= 0) return
    const t = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  return (
    <div>
      <h2>Iklan berhadiah</h2>
      <p>Sisa hari ini: {adsLeftToday()}</p>
      {blocked && <p>Batas harian tercapai.</p>}
      {!blocked && left === null && <button onClick={() => setLeft(DURATION)}>Mulai tonton</button>}
      {left !== null && left > 0 && <p>Iklan berjalan... {left} detik</p>}
      {left === 0 && !claimed && (
        <button onClick={() => setClaimed(claimAd())}>Klaim +{AD_REWARD} koin</button>
      )}
      {claimed && <p>+{AD_REWARD} koin!</p>}
      <button onClick={() => navigate('/quests')}>Kembali</button>
    </div>
  )
}
