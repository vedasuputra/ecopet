import { NavLink } from 'react-router-dom'
import { useT, type Key } from '../i18n'

const items: { to: string; label: Key }[] = [
  { to: '/home', label: 'navHome' },
  { to: '/quests', label: 'navQuests' },
  { to: '/explore', label: 'navPlaces' },
  { to: '/coupons', label: 'navCoupons' },
]

export default function BottomNav() {
  const t = useT()
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-around' }}>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to}>
          {t(i.label)}
        </NavLink>
      ))}
    </nav>
  )
}
