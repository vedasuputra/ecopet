import { Outlet, useLocation } from 'react-router-dom'
import Coupons from './Coupons'
import Home from './Home'
import Quests from './Quests'

// Home, Quests and Coupons together with the popups that open over them (a quest, a coupon, a coupon's QR code). The screen under a
// popup is drawn HERE and stays mounted while the popup opens and closes, so closing a popup does not reload the screen
// (its scroll, its filters and its search stay as they were). A popup opened from Home has Home behind it.
export default function Screens() {
  const { pathname, state } = useLocation()
  const fromHome = (state as { from?: string } | null)?.from === 'home'
  const screen = fromHome || pathname === '/home' ? 'home' : pathname.startsWith('/quests') ? 'quests' : 'coupons'
  return (
    <>
      {screen === 'home' ? <Home /> : screen === 'quests' ? <Quests /> : <Coupons forceTab={pathname.startsWith('/coupons/') ? 'mine' : undefined} />}
      <Outlet />
    </>
  )
}
