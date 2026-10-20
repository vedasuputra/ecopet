import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MeiluAvatar from '../components/MeiluAvatar'
import PlaceCard from '../components/PlaceCard'
import { RECOMMENDATIONS } from '../data/recommendations'
import { useLoc, useT } from '../i18n'
import { recommend } from '../lib/recommend'
import { isCouponExpired, useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'

const MAX_QUESTS = 4
const MAX_COUPONS = 3
const MAX_PLACES = 3

// Home: Meilu and a box to message her, then the quests you can do, the coupons you have, and
// places to visit in the Mekong (chosen from where you are and what you like).
export default function Home() {
  const t = useT()
  const loc = useLoc()
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const activeQuestIds = useAppStore((s) => s.activeQuestIds)
  const questStatus = useAppStore((s) => s.questStatus)
  const reviewStatus = useAppStore((s) => s.reviewStatus)
  const ownedCoupons = useAppStore((s) => s.ownedCoupons)
  const quests = useCatalog((s) => s.quests)
  const coupons = useCatalog((s) => s.coupons)
  const { lat, lng } = useLocation()
  const [text, setText] = useState('')

  const ask = () => {
    const q = text.trim()
    if (q) navigate('/meilu', { state: { ask: q } })
  }

  // quests you can do now: your own (at your places) first, then the general ones that can be done anywhere
  const todo = useMemo(() => {
    const open = (id: string) => questStatus[id] !== 'done'
    const mine = activeQuestIds.map((id) => quests.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q && q.scope !== 'general' && open(q.id))
    const general = quests.filter((q) => q.scope === 'general' && open(q.id))
    return [...mine, ...general].slice(0, MAX_QUESTS)
  }, [activeQuestIds, quests, questStatus])

  const myCoupons = ownedCoupons.filter((c) => c.status === 'unused' && !isCouponExpired(c)).slice(0, MAX_COUPONS)

  const places = useMemo(
    () => recommend(RECOMMENDATIONS, { lat, lng, interests: user?.style?.interests, destinations: user?.destinations }).slice(0, MAX_PLACES),
    [lat, lng, user?.style?.interests, user?.destinations],
  )

  return (
    <div>
      <section>
        <MeiluAvatar interactive halfBody size={170} />
        <div>
          <input
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder={t('homeAskPlaceholder')}
            style={{ width: '70%' }}
          />{' '}
          <button onClick={ask} disabled={!text.trim()}>
            {t('send')}
          </button>
        </div>
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
        {myCoupons.length === 0 ? (
          <p>{t('homeNoCoupons')}</p>
        ) : (
          <ul>
            {myCoupons.map((oc) => {
              const c = coupons.find((x) => x.id === oc.couponId)
              return (
                <li key={oc.uid}>
                  {c ? loc(c.title) : oc.couponId} <Link to={`/coupons/${oc.uid}`}>{t('showQR')}</Link>
                </li>
              )
            })}
          </ul>
        )}
        <Link to="/coupons">{myCoupons.length === 0 ? t('getCoupons') : t('viewAll')}</Link>
      </section>

      <section>
        <h3>{t('homePlaces')}</h3>
        {places.map((p) => (
          <PlaceCard key={p.place.id} item={p} compact />
        ))}
        <Link to="/explore">{t('viewMore')}</Link>
      </section>
    </div>
  )
}
