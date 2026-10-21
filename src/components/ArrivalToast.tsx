import { useEffect, useRef, useState } from 'react'
import { whereAt } from '../data/arrival'
import type { Coupon } from '../data/coupons'
import { dealLong } from '../data/deal'
import { PLACE_FACTS } from '../data/questFacts'
import type { Vendor } from '../data/vendors'
import { useLang, useT } from '../i18n'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'
import MeiluAvatar from './MeiluAvatar'
import './arrival.css'

// When the traveler arrives somewhere the app knows (a destination, or a partner shop with coupons), Meilu says one short line at the
// top of the screen. It is only inside the app (never a system notification), goes away by itself after a few seconds, and can be
// swiped away. The place where the app opens is not announced: only a change of place is.
const SHOW_MS = 5500
const SHOW_LONG_MS = 9000 // a hello with a fact takes longer to read

// a place: a short hello (what the place is), then a fact about it. The facts are the checked ones of the quest popup (see their
// sources in questFacts.ts); the hellos only say well-known things (where the place is, what it is known for).
const HELLO: Record<string, { en: string; vi: string }> = {
  'Can Tho': { en: 'Chirp! Welcome to Can Tho, the biggest city of the Mekong Delta 🌉', vi: 'Chíp! Chào mừng đến Cần Thơ, thành phố lớn nhất miền Tây 🌉' },
  'Cai Rang Floating Market': { en: 'Cai Rang Floating Market! It is busiest early in the morning 🛶', vi: 'Chợ nổi Cái Răng nè! Chợ đông nhất vào sáng sớm 🛶' },
  'Ben Tre': { en: 'Ben Tre, the land of coconuts! 🥥', vi: 'Bến Tre, xứ dừa đây rồi! 🥥' },
  'Vinh Long': { en: 'Vinh Long, between the Tien and Hau rivers! 🧱', vi: 'Vĩnh Long, nằm giữa sông Tiền và sông Hậu! 🧱' },
  'My Tho': { en: 'My Tho, on the Tien River! 🐝', vi: 'Mỹ Tho, bên bờ sông Tiền! 🐝' },
  'Sa Dec': { en: 'Sa Dec, the flower village of the Mekong! 🌸', vi: 'Sa Đéc, làng hoa của miền Tây! 🌸' },
  'Chau Doc': { en: 'Chau Doc, close to the Cambodian border! ⛰️', vi: 'Châu Đốc, gần biên giới Campuchia! ⛰️' },
  'Tra Su': { en: 'Tra Su, a cajuput forest full of water and birds! 🌿', vi: 'Trà Sư, rừng tràm ngập nước đầy chim! 🌿' },
}
const SHOP = { en: 'Psst! {shop} is a partner shop!', vi: 'Nè! {shop} là cửa hàng đối tác!' }
// the second sentence is about that shop alone: its cheapest coupon, said in one of a few ways, picked by the shop (always the same
// one for the same shop), with a start that fits what the shop sells
const KIND_START: Record<string, { en: string; vi: string }> = {
  food_drink: { en: 'Hungry? ', vi: 'Đói chưa? ' },
  shopping: { en: 'Souvenir time! ', vi: 'Mua quà nè! ' },
  activity: { en: 'Ready to go? ', vi: 'Sẵn sàng chưa? ' },
}
const DEAL_LINES = [
  { en: '{title}: {deal} for {cost} coins.', vi: '{title}: {deal}, chỉ {cost} xu.' },
  { en: 'Their coupon: {title}, {deal}. It costs {cost} coins.', vi: 'Phiếu ở đây: {title}, {deal}. Giá {cost} xu.' },
  { en: 'Got {cost} coins? They buy you {deal} here ({title}).', vi: 'Có {cost} xu không? Đổi được {deal} ở đây ({title}).' },
]
const MORE = { en: ' Plus {n} more coupons.', vi: ' Còn {n} phiếu khác nữa.' }

function hash(s: string): number {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

function shopLine(shop: Vendor, offers: Coupon[], lang: 'en' | 'vi', t: ReturnType<typeof useT>): { head: string; text: string } {
  const head = SHOP[lang].replace('{shop}', shop.name)
  const best = [...offers].sort((a, b) => a.costCoins - b.costCoins)[0]
  if (!best) return { head, text: '' }
  let deal = dealLong(best, t)
  if (lang === 'en' && !/^\d/.test(deal)) deal = deal.charAt(0).toLowerCase() + deal.slice(1) // "free gift" in the middle of a sentence
  const line = DEAL_LINES[hash(shop.id) % DEAL_LINES.length][lang]
    .replace('{title}', best.title[lang] || best.title.en)
    .replace('{deal}', deal)
    .replace('{cost}', String(best.costCoins))
  const more = offers.length > 1 ? MORE[lang].replace('{n}', String(offers.length - 1)) : ''
  return { head, text: `${KIND_START[shop.kind ?? '']?.[lang] ?? ''}${line}${more}` }
}

export default function ArrivalToast() {
  const lang = useLang((s) => s.lang)
  const t = useT()
  const { lat, lng } = useLocation()
  const vendors = useCatalog((s) => s.vendors)
  const coupons = useCatalog((s) => s.coupons)
  const [toast, setToast] = useState<{ id: string; head: string; text: string } | null>(null)
  const [dx, setDx] = useState(0) // how far it is being swiped
  const here = useRef<string | null | undefined>(undefined) // undefined: not looked yet (the place where the app opens is not announced)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const drag = useRef<number | null>(null)

  useEffect(() => {
    // a partner shop right here (with coupons), or else a destination around here
    const at = whereAt(lat, lng, vendors, coupons)
    const shop = at?.kind === 'shop' ? at.shop : null
    const dest = at?.kind === 'place' ? at.spot : null
    const id = shop ? `v:${shop.id}` : dest ? `d:${dest.name}` : null
    const first = here.current === undefined
    if (id === here.current) return
    here.current = id
    if (first || !id) return
    const msg = shop
      ? shopLine(shop, coupons.filter((c) => c.vendorId === shop.id && c.active !== false), lang, t)
      : dest && HELLO[dest.name]
        ? { head: HELLO[dest.name][lang], text: PLACE_FACTS[dest.name]?.[lang] ?? '' }
        : null
    if (!msg) return
    setDx(0)
    setToast({ id: `${id}-${Date.now()}`, ...msg })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), msg.text.length > 60 ? SHOW_LONG_MS : SHOW_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, vendors, coupons, lang])
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!toast) return null
  return (
    <div
      key={toast.id}
      className="arrival"
      role="status"
      aria-live="polite"
      style={dx ? { transform: `translateX(${dx}px)`, opacity: Math.max(0, 1 - Math.abs(dx) / 220), transition: 'none' } : undefined}
      // swipe it away (sideways or up)
      onPointerDown={(e) => {
        drag.current = e.clientX
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        clearTimeout(timer.current)
      }}
      onPointerMove={(e) => drag.current !== null && setDx(e.clientX - drag.current)}
      onPointerUp={() => {
        drag.current = null
        if (Math.abs(dx) > 70) return setToast(null)
        setDx(0)
        timer.current = setTimeout(() => setToast(null), 2500)
      }}
      onPointerCancel={() => {
        drag.current = null
        setDx(0)
      }}
    >
      <span className="arrival-ava" aria-hidden="true">
        <span className="arrival-ava-in">
          <MeiluAvatar size={70} spinner={false} reaction="hop" />
        </span>
      </span>
      <p>
        <b>{toast.head}</b>
        {toast.text && ` ${toast.text}`}
      </p>
    </div>
  )
}
