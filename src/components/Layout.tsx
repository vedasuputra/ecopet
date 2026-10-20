import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, useLocation as useRoute, useNavigate } from 'react-router-dom'
import AdblockGate from './AdblockGate'
import PhoneFrame from './PhoneFrame'
import BottomNav from './BottomNav'
import CelebrationOverlay from './CelebrationOverlay'
import MeiluPopup from './MeiluPopup'
import WatchAdPrompt from './WatchAdPrompt'
import { useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { refreshEconomy } from '../store/economy'
import { loadRemote, startSync } from '../store/sync'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'
import { isCouponExpired, useAppStore } from '../store/useAppStore'

const PUBLIC = ['/login', '/dev']
// screens without the coins / coupons / watch-ad bar
const NO_BAR = ['/login', '/onboarding', '/gift', '/dev']

export default function Layout() {
  const { pathname } = useRoute()
  const navigate = useNavigate()
  const t = useT()
  const user = useAppStore((s) => s.user)
  const coins = useAppStore((s) => s.coins)
  const couponCount = useAppStore((s) => s.ownedCoupons.filter((c) => c.status === 'unused' && !isCouponExpired(c)).length)
  const taps = useRef(0)
  const { source, placeName, userChose, startReal } = useLocation()
  const [adPrompt, setAdPrompt] = useState(false)

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
      <AdblockGate>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong onClick={onLogoTap} style={{ userSelect: 'none' }}>
          Eco-Pet
        </strong>
        {user && !NO_BAR.includes(pathname) && (
          <>
            <span>🪙 {t('headerCoins', { n: coins })}</span>
            <button aria-label={t('adPlusLabel')} title={t('adPlusLabel')} onClick={() => setAdPrompt(true)}>
              +
            </button>
            <Link to="/coupons">🎟️ {t('headerCoupons', { n: couponCount })}</Link>
            <Link to="/profile" aria-label={t('navSettings')} title={t('navSettings')} style={{ marginLeft: 'auto', textDecoration: 'none', fontSize: 20 }}>
              ⚙️
            </Link>
          </>
        )}
      </header>
      {user && !NO_BAR.includes(pathname) && (
        <div style={{ padding: '2px 8px' }}>
          <small>
            📍{' '}
            {source === 'real'
              ? t('youAreIn', { place: placeName })
              : userChose
                ? `${t('youAreIn', { place: placeName })} ${t('locSimulatedTag')}`
                : `${t('youAreIn', { place: placeName })} ${t('locDefaultTag')}`}
            {source !== 'real' && !userChose && (
              <>
                {' '}
                <button onClick={startReal}>{t('useRealLocation')}</button>
              </>
            )}
          </small>
        </div>
      )}
      <main className="phone-scroll">
        <Outlet />
      </main>
      <BottomNav />
      <CelebrationOverlay />
      {user && !NO_BAR.includes(pathname) && <MeiluPopup />}
      {adPrompt && (
        <WatchAdPrompt
          onClose={() => setAdPrompt(false)}
          onWatch={() => {
            setAdPrompt(false)
            navigate('/ad')
          }}
        />
      )}
      </AdblockGate>
    </PhoneFrame>
  )
}
