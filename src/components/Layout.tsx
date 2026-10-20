import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, useLocation as useRoute, useNavigate } from 'react-router-dom'
import AdblockGate from './AdblockGate'
import PhoneFrame from './PhoneFrame'
import BottomNav from './BottomNav'
import CelebrationOverlay from './CelebrationOverlay'
import LocationPopup from './LocationPopup'
import RewardPopup from './RewardPopup'
import MeiluPopup from './MeiluPopup'
import WatchAdPrompt from './WatchAdPrompt'
import './shell.css'
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
// screens without the bottom navigation (an ad must not be left by a tap on the bar)
const NO_NAV = ['/ad']

export default function Layout() {
  const { pathname } = useRoute()
  const navigate = useNavigate()
  const t = useT()
  const user = useAppStore((s) => s.user)
  const coins = useAppStore((s) => s.coins)
  const couponCount = useAppStore((s) => s.ownedCoupons.filter((c) => c.status === 'unused' && !isCouponExpired(c)).length)
  const taps = useRef(0)
  const placeName = useLocation((s) => s.placeName)
  const [locOpen, setLocOpen] = useState(false)
  useEffect(() => {
    const open = () => setLocOpen(true)
    window.addEventListener('ecopet:location', open)
    return () => window.removeEventListener('ecopet:location', open)
  }, [])
  // the price of the cheapest coupon anyone can get right now (shop paid up, not paused, not sold out)
  const cheapest = useCatalog((s) => {
    const shops = new Set(s.vendors.map((v) => v.id))
    return s.coupons.reduce((m, c) => (c.active !== false && c.remaining !== 0 && shops.has(c.vendorId) ? Math.min(m, c.costCoins) : m), Infinity)
  })
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
      <header className="app-header">
        {user && !NO_BAR.includes(pathname) ? (
          <>
            <button className="app-profile" onClick={() => setLocOpen(true)} aria-label={t('changeLocation')} title={t('changeLocation')}>
              <span className="app-avatar" aria-hidden="true">
                <span className="mi">location_on</span>
              </span>
              <span className="app-profile-name">{placeName}</span>
            </button>
            <div className="app-currency">
              {/* tapping the coins opens the watch-an-ad popup, like the + button */}
              <div className="app-coins" onClick={() => setAdPrompt(true)}>
                <span aria-label={t('headerCoins', { n: coins })} title={t('headerCoins', { n: coins })}>
                  <span className="mi" aria-hidden="true">
                    monetization_on
                  </span>
                  {coins}
                </span>
                <button className="app-add" aria-label={t('adPlusLabel')} title={t('adPlusLabel')} onClick={(e) => { e.stopPropagation(); setAdPrompt(true) }}>
                  <span className="mi" aria-hidden="true">
                    add
                  </span>
                </button>
              </div>
              <Link className="app-chip app-chip-link" to="/coupons" aria-label={t('headerCoupons', { n: couponCount })} title={t('headerCoupons', { n: couponCount })}>
                <span className="mi" aria-hidden="true">
                  confirmation_number
                </span>
                {couponCount}
                {/* a red dot: you have enough coins for at least the cheapest coupon */}
                {coins >= cheapest && (
                  <span className="app-dot">
                    <span className="sr-only">{t('redeem')}</span>
                  </span>
                )}
              </Link>
            </div>
          </>
        ) : (
          <strong className="app-brand" onClick={onLogoTap}>
            Eco-Pet
          </strong>
        )}
      </header>
      <main className="phone-scroll">
        <Outlet />
      </main>
      {!NO_NAV.includes(pathname) && <BottomNav />}
      <CelebrationOverlay />
      {user && !NO_BAR.includes(pathname) && <MeiluPopup />}
      <RewardPopup />
      {locOpen && <LocationPopup onClose={() => setLocOpen(false)} />}
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
