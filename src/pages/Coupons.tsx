import { useEffect, useMemo, useState } from 'react'
import BannerAd from '../components/BannerAd'
import CouponTicket from '../components/CouponTicket'
import FilterDropdown, { FilterBar, GroupTitle, SearchRow, groupBy } from '../components/FilterDropdown'
import { areaOf } from '../data/areas'
import { couponCategory, COUPON_KINDS, type CouponCategory } from '../data/couponCategory'
import { dealShort } from '../data/deal'
import { useLoc, useT, type Key } from '../i18n'
import { formatDistance, haversine } from '../lib/geo'
import { refundCoupon } from '../store/economy'
import { isCouponExpired, useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'
import './coupons.css'

type Tab = 'available' | 'mine'
// lower case without accents, so "ca phe" finds "cà phê"
const plain = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase()
const CAT_KEY: Record<CouponCategory, Key> = { food_drink: 'catFood', shopping: 'catShopping', activity: 'catActivity', other: 'catOther' }

// Coupons: every coupon you can get (nearest first, filtered by what the shop sells) and the coupons you already have.
// A ticket opens its details, where it can be taken with coins; a coupon you have opens its QR code.
export default function Coupons({ initialTab = 'available', forceTab }: { initialTab?: Tab; forceTab?: Tab }) {
  const t = useT()
  const loc = useLoc()
  const coins = useAppStore((s) => s.coins)
  const ownedCoupons = useAppStore((s) => s.ownedCoupons)
  const coupons = useCatalog((s) => s.coupons)
  const vendors = useCatalog((s) => s.vendors)
  const { lat, lng } = useLocation()
  const [tab, setTab] = useState<Tab>(forceTab ?? initialTab)
  useEffect(() => {
    if (forceTab) setTab(forceTab)
  }, [forceTab])
  const [filter, setFilter] = useState<CouponCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [area, setArea] = useState<string>('all') // where the coupon can be redeemed
  const [group, setGroup] = useState<'none' | 'area' | 'category'>('none') // show the list in groups
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')


  // everything that can be taken, the nearest shop first
  const available = useMemo(
    () =>
      coupons
        .filter((c) => c.active !== false)
        .flatMap((c) => {
          const v = vendors.find((x) => x.id === c.vendorId)
          return v ? [{ c, v, d: haversine(lat, lng, v.lat, v.lng), cat: couponCategory(v.category.en, v.kind), area: areaOf(v) }] : []
        })
        .sort((a, b) => a.d - b.d || a.c.costCoins - b.c.costCoins),
    [coupons, vendors, lat, lng],
  )
  const kindsHere = COUPON_KINDS.filter((k) => available.some((x) => x.cat === k))
  // the towns that have coupons, with how many (the most first)
  const areas = useMemo(() => {
    const n = new Map<string, number>()
    for (const x of available) if (x.area) n.set(x.area, (n.get(x.area) ?? 0) + 1)
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [available])
  const q = plain(search.trim())
  const shown = available
    .filter((x) => filter === 'all' || x.cat === filter)
    .filter((x) => area === 'all' || x.area === area)
    // the search looks at the title (in both languages), the shop and what it sells
    .filter((x) => !q || [x.c.title.en, x.c.title.vi, x.v.name, x.v.category.en, x.v.category.vi, x.v.address ?? ''].some((s) => plain(s).includes(q)))

  // the coupons you have: the ones you can still use first (soonest to expire first), then the used and expired ones
  const mine = useMemo(() => {
    const rows = ownedCoupons.map((oc) => {
      const c = coupons.find((x) => x.id === oc.couponId)
      const v = c && vendors.find((x) => x.id === c.vendorId)
      const state: 'owned' | 'used' | 'expired' = oc.status === 'used' ? 'used' : isCouponExpired(oc) ? 'expired' : 'owned'
      return { oc, c, v, state }
    })
    const ready = rows.filter((r) => r.state === 'owned').sort((a, b) => (a.oc.expiresAt ?? '9999').localeCompare(b.oc.expiresAt ?? '9999'))
    return { ready, past: rows.filter((r) => r.state !== 'owned') }
  }, [ownedCoupons, coupons, vendors])

  const refund = async (uid: string) => {
    setBusy(true)
    setMsg('')
    const r = await refundCoupon(uid)
    setBusy(false)
    setMsg(r.ok ? t('couponRefunded') : r.error === 'shop_active' ? t('couponRefundShopBack') : t('couponRefundFail'))
  }

  const ownedTicket = ({ oc, c, v, state }: (typeof mine.ready)[number]) => {
    const cat = couponCategory(v?.category.en ?? '', v?.kind)
    const shopGone = state === 'owned' && c && !v // the shop stopped being a partner after the coupon was bought
    return (
      <div key={oc.uid} className="coupons-owned">
        <ul className="coupons-list">
          <CouponTicket
            to={`/coupons/${oc.uid}`}
            title={c ? loc(c.title) : oc.couponId}
            shop={v?.name ?? '—'}
            cost={c?.costCoins}
            category={cat}
            deal={c ? dealShort(c, t) : ''}
            dealIsWord={c?.dealType === 'free' || c?.dealType === 'combo'}
            state={state}
          />
        </ul>
        {shopGone && (
          <p className="coupons-refund">
            {t('couponShopPaused')}
            {oc.source !== 'welcome' && (
              <button disabled={busy} onClick={() => void refund(oc.uid)}>
                {t('couponRefundBtn')}
              </button>
            )}
            <span>{t('couponOrWait')}</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="coupons-page">
      <div className="coupons-body">
      <div className="coupons-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'available'} className={tab === 'available' ? 'active' : ''} onClick={() => setTab('available')}>
          {t('couponsAvailable')}
        </button>
        <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          {t('couponsMine')} ({mine.ready.length})
        </button>
      </div>

      {msg && <p className="coupons-msg">{msg}</p>}

      {tab === 'available' ? (
        <>
          <SearchRow
            canClear={area !== 'all' || filter !== 'all' || group !== 'none'}
            onClear={() => {
              setArea('all')
              setFilter('all')
              setGroup('none')
            }}
            clearLabel={t('filterClear')}
          >
          <div className="coupons-search">
            <span className="mi" aria-hidden="true">
              search
            </span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('couponsSearch')} aria-label={t('couponsSearch')} />
            {search && (
              <button className="coupons-search-clear" onClick={() => setSearch('')} aria-label={t('close')} title={t('close')}>
                <span className="mi" aria-hidden="true">
                  close
                </span>
              </button>
            )}
          </div>
          </SearchRow>
          <FilterBar>
            {areas.length > 1 && (
              <FilterDropdown
                icon="location_on"
                prefix={t('filterLocation')}
                label={t('filterLocation')}
                value={area}
                onChange={setArea}
                options={[{ value: 'all', label: t('couponsAllAreas'), count: available.length }, ...areas.map(([name, n]) => ({ value: name, label: name, count: n }))]}
              />
            )}
            {kindsHere.length > 1 && (
              <FilterDropdown
                icon="category"
                prefix={t('filterCategory')}
                label={t('filterCategory')}
                value={filter}
                onChange={(v) => setFilter(v as CouponCategory | 'all')}
                options={[{ value: 'all', label: t('catAll') }, ...kindsHere.map((k) => ({ value: k, label: t(CAT_KEY[k]) }))]}
              />
            )}
            <FilterDropdown
              icon="view_agenda"
              prefix={t('filterGroup')}
              label={t('filterGroup')}
              value={group}
              onChange={(v) => setGroup(v as typeof group)}
              options={[
                { value: 'none', label: t('groupNone') },
                { value: 'area', label: t('groupLocation') },
                { value: 'category', label: t('groupCategory') },
              ]}
            />
          </FilterBar>
          {shown.length === 0 ? (
            <p className="coupons-empty">{search.trim() ? t('couponsNoMatch', { q: search.trim() }) : t('couponsEmpty')}</p>
          ) : (
            <>
              {groupBy(
                shown,
                (x) => (group === 'area' ? x.area ?? '' : group === 'category' ? x.cat : ''),
                group === 'category' ? COUPON_KINDS : undefined,
              ).map((g) => (
                <section key={g.key || 'all'}>
                  {group !== 'none' && <GroupTitle label={group === 'category' ? t(CAT_KEY[g.key as CouponCategory]) : g.key || t('catOther')} n={g.items.length} />}
                  <ul className="coupons-list">
                    {g.items.map(({ c, v, d, cat }) => (
                      <CouponTicket
                        key={c.id}
                        to={`/offers/${c.id}`}
                        title={loc(c.title)}
                        shop={v.name}
                        distance={formatDistance(d)}
                        category={cat}
                        deal={dealShort(c, t)}
                        dealIsWord={c.dealType === 'free' || c.dealType === 'combo'}
                        cost={c.costCoins}
                        coins={coins}
                        state={c.remaining === 0 ? 'soldout' : undefined}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </>
      ) : mine.ready.length + mine.past.length === 0 ? (
        <p className="coupons-empty">{t('couponsEmptyMine')}</p>
      ) : (
        <>
          {mine.ready.length > 0 && (
            <section>
              <h3 className="coupons-sub">{t('couponsReady')}</h3>
              <div className="coupons-stack">{mine.ready.map(ownedTicket)}</div>
            </section>
          )}
          {mine.past.length > 0 && (
            <section>
              <h3 className="coupons-sub">{t('couponsPast')}</h3>
              <div className="coupons-stack">{mine.past.map(ownedTicket)}</div>
            </section>
          )}
        </>
      )}
      </div>
      <BannerAd />
    </div>
  )
}

