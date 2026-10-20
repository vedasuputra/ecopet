import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MeiluAvatar from '../components/MeiluAvatar'
import PlaceCard from '../components/PlaceCard'
import { RECOMMENDATIONS } from '../data/recommendations'
import { useLoc, useT } from '../i18n'
import { recommend } from '../lib/recommend'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'

const MAX_QUESTS = 4
const MAX_COUPONS = 3
const MAX_PLACES = 3

// Home: Meilu asks what we will do today (the button opens the chat), then the quests you can do,
// the coupons you can get, and places to visit in the Mekong (chosen from where you are and what you like).
export default function Home() {
  const t = useT()
  const loc = useLoc()
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const activeQuestIds = useAppStore((s) => s.activeQuestIds)
  const questStatus = useAppStore((s) => s.questStatus)
  const reviewStatus = useAppStore((s) => s.reviewStatus)
  const coins = useAppStore((s) => s.coins)
  const quests = useCatalog((s) => s.quests)
  const coupons = useCatalog((s) => s.coupons)
  const vendors = useCatalog((s) => s.vendors)
  const { lat, lng } = useLocation()

  // quests you can do now: your own (at your places) first, then the general ones that can be done anywhere
  const todo = useMemo(() => {
    const open = (id: string) => questStatus[id] !== 'done'
    const mine = activeQuestIds.map((id) => quests.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q && q.scope !== 'general' && open(q.id))
    const general = quests.filter((q) => q.scope === 'general' && open(q.id))
    return [...mine, ...general].slice(0, MAX_QUESTS)
  }, [activeQuestIds, quests, questStatus])

  // the coupons anyone can get with coins (the ones you already have are on the Coupons screen)
  const available = useMemo(
    () => coupons.filter((c) => c.active !== false && c.remaining !== 0 && vendors.some((v) => v.id === c.vendorId)).sort((a, b) => a.costCoins - b.costCoins).slice(0, MAX_COUPONS),
    [coupons, vendors],
  )

  const places = useMemo(
    () => recommend(RECOMMENDATIONS, { lat, lng, interests: user?.style?.interests, destinations: user?.destinations }).slice(0, MAX_PLACES),
    [lat, lng, user?.style?.interests, user?.destinations],
  )

  return (
    <div>
      <section>
        <div style={{ border: '2px solid #000', borderRadius: 16, padding: '10px 14px', margin: '8px 12px 0', position: 'relative' }}>
          <p style={{ margin: '0 0 8px' }}>
            <b>{t('homeGreeting', { name: user?.name ?? '' })}</b>
          </p>
          <button onClick={() => navigate('/meilu')}>{t('homeChatButton')}</button>
          {/* the bubble's tail, pointing down at Meilu */}
          <span style={{ position: 'absolute', left: '50%', bottom: -11, width: 18, height: 18, background: '#fff', borderRight: '2px solid #000', borderBottom: '2px solid #000', transform: 'translateX(-50%) rotate(45deg)' }} />
        </div>
        <MeiluAvatar interactive halfBody fluid />
      </section>

      <section>
        <h3>{t('homeQuests')}</h3>
        {todo.length === 0 ? (
          <p>{t('homeNoQuests')}</p>
        ) : (
          <ul>
            {todo.map((q) => (
              <li key={q.id}>
                <Link to={`/quests/${q.id}`}>{loc(q.title)}</Link>{' '}
                <small>
                  ({q.scope === 'general' ? t('anywhere') : q.destination}) {t('rewardCoins', { n: q.rewardCoins })}
                  {reviewStatus[q.id]?.status === 'pending' && ` · ${t('questUnderReview')}`}
                </small>
              </li>
            ))}
          </ul>
        )}
        <Link to="/quests">{t('viewAll')}</Link>
      </section>

      <section>
        <h3>{t('homeCoupons')}</h3>
        {available.length === 0 ? (
          <p>{t('homeNoCoupons')}</p>
        ) : (
          <ul>
            {available.map((c) => (
              <li key={c.id}>
                <Link to={`/offers/${c.id}`}>{vendors.find((v) => v.id === c.vendorId)?.name}: {loc(c.title)}</Link>{' '}
                <small>
                  ({c.discountPct}%) · {t('costCoins', { n: c.costCoins })}
                  {coins < c.costCoins && ` · ${t('notEnoughCoins')}`}
                </small>
              </li>
            ))}
          </ul>
        )}
        <Link to="/coupons">{t('viewAll')}</Link>
      </section>

      <section>
        <h3>{t('homePlaces')}</h3>
        {places.map((p) => (
          <PlaceCard key={p.place.id} item={p} compact onZoom={() => navigate(`/explore?focus=${p.place.id}`)} />
        ))}
        <Link to="/explore">{t('viewMore')}</Link>
      </section>
    </div>
  )
}
