import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation as useRoute, useNavigate } from 'react-router-dom'
import PhoneFrame from './PhoneFrame'
import BannerAd from './BannerAd'
import BottomNav from './BottomNav'
import CelebrationOverlay from './CelebrationOverlay'
import { supabase } from '../lib/supabase'
import { refreshEconomy } from '../store/economy'
import { loadRemote, startSync } from '../store/sync'
import { useCatalog } from '../store/useCatalog'
import { useAppStore } from '../store/useAppStore'

const PUBLIC = ['/login', '/dev']

export default function Layout() {
  const { pathname } = useRoute()
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const taps = useRef(0)

  // On app load with an existing Supabase session: pull the saved account state, then keep saving.
  useEffect(() => {
    supabase?.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user
      if (!u) return
      await loadRemote(u.id)
      startSync(u.id)
    })
  }, [])

  // Mirror the server-owned economy (coins, quests, coupons) every few seconds: this is also how a
  // coupon a vendor just scanned shows up as used. The vendor/coupon catalog changes rarely.
  useEffect(() => {
    void refreshEconomy()
    void useCatalog.getState().refresh()
    const fast = setInterval(() => void refreshEconomy(), 4000)
    const slow = setInterval(() => void useCatalog.getState().refresh(), 30000)
    return () => {
      clearInterval(fast)
      clearInterval(slow)
    }
  }, [])

  // Tap logo 5x to open the hidden dev panel.
  const onLogoTap = () => {
    taps.current += 1
    if (taps.current >= 5) {
      taps.current = 0
      navigate('/dev')
    }
  }

  if (!user && !PUBLIC.includes(pathname)) return <Navigate to="/login" replace />

  return (
    <PhoneFrame>
      <header>
        <strong onClick={onLogoTap} style={{ userSelect: 'none' }}>
          Eco-Pet
        </strong>
      </header>
      <main className="phone-scroll">
        <Outlet />
      </main>
      <BannerAd />
      <BottomNav />
      <CelebrationOverlay />
    </PhoneFrame>
  )
}
