import BannerAd from '../components/BannerAd'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CouponTicket from '../components/CouponTicket'
import QuestCard from '../components/QuestCard'
import HeroSky, { usePeriod } from '../components/HeroSky'
import TripOverview from '../components/TripOverview'
import MeiluAvatar from '../components/MeiluAvatar'
import { couponCategory } from '../data/couponCategory'
import { dealShort } from '../data/deal'
import { PLACES } from '../data/places'
import { useLoc, useT } from '../i18n'
import { formatDistance, haversine } from '../lib/geo'
import './home.css'
import { isCouponExpired, useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'

const MAX_QUESTS = 4
const MAX_SPECIFIC = 3 // the quests tied to a place come first; one slot is left for a quest you can do anywhere
const MAX_COUPONS = 4
const TRIP_M = 15_000 // a shop this close to a place the traveler is going to counts as part of the trip
const NEARBY_M = 25_000 // coupons from shops farther than this are not shown on Home (they are still on the Coupons screen)

// Home: Meilu asks what we will do today (the button opens the chat), then the quests you can do,
// the coupons you can get, and places to visit in the Mekong (chosen from where you are and what you like).
export default function Home() {
  const t = useT()
  const loc = useLoc()
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const ownedCoupons = useAppStore((s) => s.ownedCoupons)
  const activeQuestIds = useAppStore((s) => s.activeQuestIds)
  const questStatus = useAppStore((s) => s.questStatus)
  const pinnedQuestIds = useAppStore((s) => s.pinnedQuestIds)
  const reviewStatus = useAppStore((s) => s.reviewStatus)
  const coins = useAppStore((s) => s.coins)
  const quests = useCatalog((s) => s.quests)
  const coupons = useCatalog((s) => s.coupons)
  const vendors = useCatalog((s) => s.vendors)
  const { lat, lng } = useLocation()
  const period = usePeriod()

  // Quests for the places the traveler goes to come first (the ones in the plan, then the nearest), so Home spotlights what
  // is specific to the trip. Only after those comes one quest that can be done anywhere.
  const todo = useMemo(() => {
    const open = (id: string) => questStatus[id] !== 'done'
    const planned = new Set(activeQuestIds)
    const dist = (q: { lat: number; lng: number }) => haversine(lat, lng, q.lat, q.lng)
    const mine = new Set(user?.destinations ?? [])
    const pins = quests.filter((q) => pinnedQuestIds.includes(q.id) && open(q.id)).slice(0, MAX_QUESTS)
    const specific = quests
      .filter((q) => q.scope !== 'general' && open(q.id) && !pinnedQuestIds.includes(q.id))
      .sort((a, b) => {
        const rank = (q: typeof a) => (mine.has(q.destination) ? (planned.has(q.id) ? 0 : 1) : 2) // my places (planned first), then others
        return rank(a) - rank(b) || dist(a) - dist(b)
      })
      .slice(0, Math.max(0, Math.min(MAX_SPECIFIC, MAX_QUESTS - pins.length)))
    const general = quests.filter((q) => q.scope === 'general' && open(q.id) && !pinnedQuestIds.includes(q.id)).slice(0, Math.max(0, MAX_QUESTS - pins.length - specific.length))
    return [...pins, ...specific, ...general] // the pinned quests come first
  }, [pinnedQuestIds, activeQuestIds, quests, questStatus, user?.destinations, lat, lng])

  // The coupons you can get with coins (the ones you already have are left out: they are on the Coupons screen). They follow
  // where the traveler is going: shops in the places of the trip come
  // first, then the shops near where you are now (within NEARBY_M); the nearest first. A shop far from both is no use.
  const { available, anyCoupon } = useMemo(() => {
    const trip = (user?.destinations ?? []).flatMap((n) => PLACES.filter((p) => p.name === n))
    const owned = new Set(ownedCoupons.filter((oc) => oc.status === 'unused' && !isCouponExpired(oc)).map((oc) => oc.couponId))
    const open = coupons.filter((c) => c.active !== false && c.remaining !== 0 && !owned.has(c.id))
    const withShop = open.flatMap((c) => {
      const v = vendors.find((x) => x.id === c.vendorId)
      if (!v) return []
      const onTrip = trip.some((p) => haversine(p.lat, p.lng, v.lat, v.lng) <= TRIP_M)
      return [{ c, v, d: haversine(lat, lng, v.lat, v.lng), onTrip }]
    })
    const wanted = withShop
      .filter((x) => x.onTrip || x.d <= NEARBY_M)
      .sort((a, b) => Number(b.onTrip) - Number(a.onTrip) || a.d - b.d || a.c.costCoins - b.c.costCoins)
    // a varied mix: the best coupon of each kind (food and drink, shopping, activities) first, then the rest by the same
    // order, and the result keeps the order of the list (trip and nearest first)
    const picked = new Set<number>()
    const kinds = new Set<string>()
    wanted.forEach((x, i) => {
      const k = couponCategory(x.v.category.en, x.v.kind)
      if (picked.size < MAX_COUPONS && !kinds.has(k)) {
        kinds.add(k)
        picked.add(i)
      }
    })
    wanted.forEach((_, i) => {
      if (picked.size < MAX_COUPONS) picked.add(i)
    })
    return { available: wanted.filter((_, i) => picked.has(i)), anyCoupon: withShop.length > 0 }
  }, [coupons, vendors, lat, lng, user?.destinations, ownedCoupons])

  return (
    <div className="home">
      <section className="home-hero">
        <HeroSky period={period} />
        <div className="home-bird">
          <div className="home-bird-inner">
            <MeiluAvatar interactive fluid mood={period} />
          </div>
        </div>
        <button className="home-say" onClick={() => navigate('/meilu')} aria-label={t('homeChatButton')}>
          <span className="home-say-text">{t('homeGreeting', { name: user?.name ?? '' })}</span>
          <span className="home-say-go" aria-hidden="true">
            <span className="mi">send</span>
          </span>
        </button>
      </section>

      <div className="home-sheet">
        <div className="home-trip">
          <TripOverview />
        </div>
      <section className="home-section">
        <div className="home-section-head">
          <h3>{t('homeQuests')}</h3>
          <Link to="/quests">{t('viewAll')}</Link>
        </div>
        {todo.length === 0 ? (
          <p className="home-empty">{t('homeNoQuests')}</p>
        ) : (
          <ul className="home-list">
            {todo.map((q) => (
              <QuestCard
                key={q.id}
                to={`/quests/${q.id}`}
                title={loc(q.title)}
                place={q.scope === 'general' ? t('anywhere') : q.destination}
                general={q.scope === 'general'}
                type={q.type}
                reward={q.rewardCoins}
                state={reviewStatus[q.id]?.status === 'pending' ? 'review' : undefined}
                pinned={pinnedQuestIds.includes(q.id)}
                fromHome
              />
            ))}
          </ul>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h3>{t('homeCoupons')}</h3>
          <Link to="/coupons">{t('viewAll')}</Link>
        </div>
        {available.length === 0 ? (
          <p className="home-empty">{anyCoupon ? t('homeNoCouponsNearby') : t('homeNoCoupons')}</p>
        ) : (
          <ul className="home-list">
            {available.map(({ c, v, d }) => (
              <CouponTicket
                key={c.id}
                to={`/offers/${c.id}`}
                title={loc(c.title)}
                shop={v.name}
                distance={formatDistance(d)}
                category={couponCategory(v.category.en, v.kind)}
                deal={dealShort(c, t)}
                dealIsWord={c.dealType === 'free' || c.dealType === 'combo'}
                cost={c.costCoins}
                coins={coins}
                fromHome
              />
            ))}
          </ul>
        )}
      </section>

        <BannerAd />
      </div>
    </div>
  )
}
