import { Outlet, useLocation } from 'react-router-dom'
import Coupons from './Coupons'
import Home from './Home'
import ItineraryPage from './Itinerary'
import Quests from './Quests'

type Screen = 'home' | 'trip' | 'quests' | 'coupons'
interface FromState {
  from?: string
  fromState?: unknown
}

/**
 * The screen under a popup. A popup knows where it was opened from (`from`, and the state of that place, `fromState`): Home
 * ('home'), the trip page, a quest, a coupon, a shop... The screen is found by following that chain to its first page.
 */
export function screenOf(pathname: string, state: unknown): Screen | null {
  const s = state as FromState | null
  if (s?.from === 'home') return 'home'
  if (s?.from) return screenOf(s.from, s.fromState)
  if (pathname === '/home' || pathname === '/gift') return 'home'
  if (pathname === '/itinerary') return 'trip'
  if (pathname.startsWith('/quests')) return 'quests'
  if (pathname.startsWith('/coupons') || pathname.startsWith('/offers') || pathname.startsWith('/shops')) return 'coupons'
  return null
}

// Home, Trip, Quests and Coupons together with the popups that open over them (a quest, a coupon, a coupon's QR code, a shop). The
// screen under a popup is drawn HERE and stays mounted while the popup opens and closes, so closing a popup does not reload the screen
// (its scroll, its filters and its search stay as they were).
export default function Screens() {
  const { pathname, state } = useLocation()
  const screen = screenOf(pathname, state) ?? 'coupons'
  return (
    <>
      {screen === 'home' ? <Home /> : screen === 'trip' ? <ItineraryPage /> : screen === 'quests' ? <Quests /> : <Coupons forceTab={pathname.startsWith('/coupons/') ? 'mine' : undefined} />}
      <Outlet />
    </>
  )
}
