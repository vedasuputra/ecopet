import { Link } from 'react-router-dom'
import { useCatalog } from '../store/useCatalog'
import { useLoc, useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'

export default function Quests() {
  const quests = useCatalog((s) => s.quests)
  const t = useT()
  const loc = useLoc()
  const { activeQuestIds, questStatus, reviewStatus, skipQuest, takeQuest, coins } = useAppStore()
  const active = activeQuestIds
    .map((id) => quests.find((q) => q.id === id))
    .filter((q) => !!q)
  const others = quests.filter((q) => !activeQuestIds.includes(q.id) && questStatus[q.id] !== 'done')

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
      {others.length > 0 && (
        <>
          <h3>{t('otherQuests')}</h3>
          <ul>
            {others.map((q) => (
              <li key={q.id}>
                <Link to={`/quests/${q.id}`}>{loc(q.title)}</Link> ({q.destination}) {t('rewardCoins', { n: q.rewardCoins })}{' '}
                <button onClick={() => takeQuest(q.id)}>{t('takeQuest')}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
