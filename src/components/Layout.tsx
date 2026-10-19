import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation as useRoute, useNavigate } from 'react-router-dom'
import PhoneFrame from './PhoneFrame'
import BannerAd from './BannerAd'
import BottomNav from './BottomNav'
import { supabase } from '../lib/supabase'
import { loadRemote, startSync, syncCouponLedger } from '../store/sync'
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

  // Pick up coupons a vendor has scanned (and backfill the ledger) every few seconds while signed in.
  useEffect(() => {
    void syncCouponLedger()
    const id = setInterval(() => void syncCouponLedger(), 4000)
    return () => clearInterval(id)
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
    </PhoneFrame>
  )
}
