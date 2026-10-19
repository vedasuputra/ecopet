import { NavLink } from 'react-router-dom'

const items = [
  { to: '/map', label: 'Peta' },
  { to: '/quests', label: 'Quest' },
  { to: '/meilu', label: 'Meilu' },
  { to: '/coupons', label: 'Kupon' },
  { to: '/profile', label: 'Profil' },
]

export default function BottomNav() {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-around' }}>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to}>
          {i.label}
        </NavLink>
      ))}
    </nav>
  )
}
