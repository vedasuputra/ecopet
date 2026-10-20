import { NavLink } from 'react-router-dom'
import { useT, type Key } from '../i18n'

type Item = { to: string; label: Key; icon: string }

// icon = a Material Symbols name (the icon font is loaded in index.html)
const left: Item[] = [
  { to: '/home', label: 'navHome', icon: 'home' },
  { to: '/quests', label: 'navQuests', icon: 'checklist' },
]
const right: Item[] = [
  { to: '/coupons', label: 'navCoupons', icon: 'confirmation_number' },
  { to: '/profile', label: 'navProfile', icon: 'person' },
]

// Home, Quests, [Meilu], Coupons, Profile. The round Meilu button in the middle opens the chat popup
// (see MeiluPopup), which can see the screen the traveler is on.
export default function BottomNav() {
  const t = useT()
  const link = (i: Item) => (
    <NavLink key={i.to} to={i.to}>
      <span className="mi nav-icon" aria-hidden="true">
        {i.icon}
      </span>
      <span>{t(i.label)}</span>
    </NavLink>
  )
  return (
    <nav className="app-nav">
      {left.map(link)}
      <span className="nav-meilu-cell">
      <button
        className="nav-meilu"
        onClick={() => window.dispatchEvent(new Event('meilu:open'))}
        aria-label={t('askMeiluHere')}
        title={t('askMeiluHere')}
      >
        <img src="/icon-192.png?v=4" alt="Meilu" />
      </button>
      </span>
      {right.map(link)}
    </nav>
  )
}
