import { useMemo, useState } from 'react'
import BannerAd from '../components/BannerAd'
import FilterDropdown, { FilterBar, GroupTitle, SearchRow, groupBy } from '../components/FilterDropdown'
import QuestCard from '../components/QuestCard'
import { QUEST_CATEGORIES, QUEST_CATEGORY_KEY, QUEST_CATEGORY_OF, type QuestCategory } from '../data/questCategory'
import { useLoc, useT } from '../i18n'
import { haversine } from '../lib/geo'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'
import './quests.css'

type Tab = 'mine' | 'more'
type Scope = 'all' | 'trip' | 'anywhere' | 'pinned'
type Group = 'none' | 'location' | 'category' | 'scope'

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase()

// Quests, in two tabs. "My Quests" has the quests for your trip, the ones you can do anywhere and the ones you pinned (filter by
// chip, or see them all); "More Places" has the quests at places that are not in your trip. Both tabs can be searched and filtered
// by category. A quest opens as a popup (where it can be pinned). Done quests stay at the bottom, faded.
export default function Quests() {
  const t = useT()
  const loc = useLoc()
  const quests = useCatalog((s) => s.quests)
  const user = useAppStore((s) => s.user)
  const { activeQuestIds, questStatus, reviewStatus, pinnedQuestIds } = useAppStore()
  const { lat, lng } = useLocation()
  const [tab, setTab] = useState<Tab>('mine')
  const [scope, setScope] = useState<Scope>('all')
  const [category, setCategory] = useState<'all' | QuestCategory>('all')
  const [area, setArea] = useState('all') // More Places: only the quests at this place
  const [group, setGroup] = useState<Group>('none') // show the list in groups (everything stays visible)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const myPlaces = new Set(user?.destinations ?? [])
    const planned = new Set(activeQuestIds)
    const pinned = new Set(pinnedQuestIds)
    return quests.map((q) => {
      const general = q.scope === 'general'
      const trip = !general && (myPlaces.has(q.destination) || planned.has(q.id))
      return { q, general, trip, pinned: pinned.has(q.id), done: questStatus[q.id] === 'done', d: general ? Infinity : haversine(lat, lng, q.lat, q.lng) }
    })
  }, [quests, user?.destinations, activeQuestIds, pinnedQuestIds, questStatus, lat, lng])

  const query = plain(search.trim())
  const matches = (r: (typeof rows)[number]) =>
    (category === 'all' || QUEST_CATEGORY_OF[r.q.type] === category) &&
    (!query || [r.q.title.en, r.q.title.vi, r.q.destination, r.general ? 'anywhere' : ''].some((s) => plain(s).includes(query)))

  // My Quests: not done first, then pinned, then the trip (nearest first), then the ones for anywhere
  const mineAll = rows.filter((r) => r.trip || r.general || r.pinned)
  const mine = mineAll
    .filter((r) => scope === 'all' || (scope === 'trip' && r.trip) || (scope === 'anywhere' && r.general) || (scope === 'pinned' && r.pinned))
    .filter(matches)
    .sort((a, b) => Number(a.done) - Number(b.done) || Number(b.pinned) - Number(a.pinned) || Number(b.trip) - Number(a.trip) || a.d - b.d)

  const moreAll = rows.filter((r) => !r.general && !r.trip && !r.pinned && !r.done)
  const places = useMemo(() => {
    const n = new Map<string, number>()
    for (const r of moreAll) n.set(r.q.destination, (n.get(r.q.destination) ?? 0) + 1)
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [moreAll])
  const shownArea = places.some(([name]) => name === area) ? area : 'all' // a place with nothing left goes back to all
  const more = moreAll.filter((r) => shownArea === 'all' || r.q.destination === shownArea).filter(matches).sort((a, b) => a.d - b.d)

  const list = tab === 'mine' ? mine : more
  const scopeOptions = [
    { value: 'all', label: t('questsChipAll') },
    { value: 'trip', label: t('questsChipTrip') },
    { value: 'anywhere', label: t('questsChipAnywhere') },
    { value: 'pinned', label: t('questsChipPinned') },
  ]
  const categoryOptions = [
    { value: 'all', label: t('qcatAll') },
    ...QUEST_CATEGORIES.map((c) => ({ value: c, label: t(QUEST_CATEGORY_KEY[c]) })),
  ]
  const placeOptions = [
    { value: 'all', label: t('couponsAllAreas'), count: moreAll.length },
    ...places.map(([name, n]) => ({ value: name, label: name, count: n })),
  ]
  const groupOptions = [
    { value: 'none', label: t('groupNone') },
    { value: 'location', label: t('groupLocation') },
    { value: 'category', label: t('groupCategory') },
    ...(tab === 'mine' ? [{ value: 'scope', label: t('groupScope') }] : []),
  ]
  const shownGroup: Group = tab === 'more' && group === 'scope' ? 'none' : group
  const scopeOf = (r: (typeof rows)[number]) => (r.pinned ? 'pinned' : r.trip ? 'trip' : 'anywhere')
  const groups = groupBy(
    list,
    (r) => (shownGroup === 'location' ? (r.general ? '' : r.q.destination) : shownGroup === 'category' ? QUEST_CATEGORY_OF[r.q.type] : shownGroup === 'scope' ? scopeOf(r) : ''),
    shownGroup === 'category' ? QUEST_CATEGORIES : shownGroup === 'scope' ? ['pinned', 'trip', 'anywhere'] : undefined,
  )
  const groupLabel = (key: string) =>
    shownGroup === 'category' ? t(QUEST_CATEGORY_KEY[key as QuestCategory]) : shownGroup === 'scope' ? t(key === 'pinned' ? 'questsChipPinned' : key === 'trip' ? 'questsChipTrip' : 'questsChipAnywhere') : key || t('anywhere')
  const canClear = category !== 'all' || shownGroup !== 'none' || (tab === 'mine' ? scope !== 'all' : shownArea !== 'all')
  const clear = () => {
    setCategory('all')
    setGroup('none')
    setScope('all')
    setArea('all')
  }

  return (
    <div className="quests-page">
      <div className="quests-body">
        <div className="quests-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
            {t('questsTabMine')} ({mineAll.filter((r) => !r.done).length})
          </button>
          <button role="tab" aria-selected={tab === 'more'} className={tab === 'more' ? 'active' : ''} onClick={() => setTab('more')}>
            {t('questsTabMore')} ({moreAll.length})
          </button>
        </div>

        <SearchRow canClear={canClear} onClear={clear} clearLabel={t('filterClear')}>
        <div className="quests-search">
          <span className="mi" aria-hidden="true">
            search
          </span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('questsSearch')} aria-label={t('questsSearch')} />
          {search && (
            <button className="quests-search-clear" onClick={() => setSearch('')} aria-label={t('close')} title={t('close')}>
              <span className="mi" aria-hidden="true">
                close
              </span>
            </button>
          )}
        </div>
        </SearchRow>

        <FilterBar>
          {tab === 'mine' ? (
            <FilterDropdown icon="filter_list" prefix={t('filterShow')} label={t('filterShow')} value={scope} options={scopeOptions} onChange={(v) => setScope(v as Scope)} />
          ) : (
            places.length > 1 && <FilterDropdown icon="location_on" prefix={t('filterLocation')} label={t('filterLocation')} value={shownArea} options={placeOptions} onChange={setArea} />
          )}
          <FilterDropdown icon="category" prefix={t('filterCategory')} label={t('filterCategory')} value={category} options={categoryOptions} onChange={(v) => setCategory(v as 'all' | QuestCategory)} />
          <FilterDropdown icon="view_agenda" prefix={t('filterGroup')} label={t('filterGroup')} value={shownGroup} options={groupOptions} onChange={(v) => setGroup(v as Group)} />
        </FilterBar>

        {list.length === 0 ? (
          <p className="quests-empty">
            {search.trim() ? t('questsNoMatch', { q: search.trim() }) : tab === 'mine' && scope === 'pinned' ? t('questsNonePinned') : t('questsNone')}
          </p>
        ) : (
          <>
            {groups.map((g) => (
              <section key={g.key || 'all'}>
                {shownGroup !== 'none' && <GroupTitle label={groupLabel(g.key)} n={g.items.length} />}
                <ul className="quests-list">
                  {g.items.map((r) => {
                    const review = reviewStatus[r.q.id]?.status === 'pending'
                    return (
                      <QuestCard
                        key={r.q.id}
                        to={`/quests/${r.q.id}`}
                        title={loc(r.q.title)}
                        place={r.general ? t('anywhere') : r.q.destination}
                        general={r.general}
                        type={r.q.type}
                        reward={r.q.rewardCoins}
                        state={r.done ? 'done' : review ? 'review' : undefined}
                        pinned={r.pinned}
                      />
                    )
                  })}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
      <BannerAd />
    </div>
  )
}
