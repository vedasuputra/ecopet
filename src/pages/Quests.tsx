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
    .filter((q): q is NonNullable<typeof q> => !!q && q.scope !== 'general')
  const general = quests.filter((q) => q.scope === 'general')
  const others = quests.filter((q) => q.scope !== 'general' && !activeQuestIds.includes(q.id) && questStatus[q.id] !== 'done')

  return (
    <div>
      <h2>{t('quests')}</h2>
      <p>{t('coinsLine', { n: coins })}</p>
      <Link to="/ad">{t('watchAdLink')}</Link> | <Link to="/itinerary">{t('openItinerary')}</Link>
      <h3>{t('placeQuests')}</h3>
      <p>
        <small>{t('placeQuestsHint')}</small>
      </p>
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
      {general.length > 0 && (
        <>
          <h3>{t('generalQuests')}</h3>
          <p>
            <small>{t('generalQuestsHint')}</small>
          </p>
          <ul>
            {general.map((q) => (
              <li key={q.id}>
                <Link to={`/quests/${q.id}`}>{loc(q.title)}</Link> {t('rewardCoins', { n: q.rewardCoins })}{' '}
                {questStatus[q.id] === 'done' ? t('questDone') : reviewStatus[q.id]?.status === 'pending' ? t('questUnderReview') : ''}
              </li>
            ))}
          </ul>
        </>
      )}
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
