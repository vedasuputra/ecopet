import { NavLink } from 'react-router-dom'
import { useT, type Key } from '../i18n'

const left: { to: string; label: Key }[] = [
  { to: '/home', label: 'navHome' },
  { to: '/quests', label: 'navQuests' },
]
const right: { to: string; label: Key }[] = [
  { to: '/explore', label: 'navPlaces' },
  { to: '/coupons', label: 'navCoupons' },
]

// Home, Quests, [Meilu], Places, Coupons. The round Meilu button in the middle opens the chat popup
// (see MeiluPopup), which can see the screen the traveler is on.
export default function BottomNav() {
  const t = useT()
  const link = (i: { to: string; label: Key }) => (
    <NavLink key={i.to} to={i.to}>
      {t(i.label)}
    </NavLink>
  )
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
      {left.map(link)}
      <button
        onClick={() => window.dispatchEvent(new Event('meilu:open'))}
        aria-label={t('askMeiluHere')}
        title={t('askMeiluHere')}
        style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #000', background: '#fff', padding: 0, overflow: 'hidden', marginTop: -14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <img src="/icon-192.png" alt="Meilu" width={44} height={44} style={{ display: 'block', margin: '0 auto', borderRadius: '50%' }} />
      </button>
      {right.map(link)}
    </nav>
  )
}
