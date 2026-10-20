import { Link } from 'react-router-dom'
import { useCatalog } from '../store/useCatalog'
import { useLoc, useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'

export default function Quests() {
  const quests = useCatalog((s) => s.quests)
  const t = useT()
  const loc = useLoc()
  const { activeQuestIds, questStatus, reviewStatus, skipQuest, coins } = useAppStore()
  const active = activeQuestIds
    .map((id) => quests.find((q) => q.id === id))
    .filter((q) => !!q)

  return (
    <div>
      <h2>{t('quests')}</h2>
      <p>{t('coinsLine', { n: coins })}</p>
      <Link to="/ad">{t('watchAdLink')}</Link> | <Link to="/itinerary">{t('openItinerary')}</Link>
      <ul>
        {active.map((q) => {
          const done = questStatus[q.id] === 'done'
          return (
            <li key={q.id}>
              <Link to={`/quests/${q.id}`}>{loc(q.title)}</Link> ({q.destination}) {t('rewardCoins', { n: q.rewardCoins })}{' '}
              {done ? (
                t('questDone')
              ) : reviewStatus[q.id]?.status === 'pending' ? (
                t('questUnderReview')
              ) : (
                <button onClick={() => skipQuest(q.id)}>{t('skip')}</button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
