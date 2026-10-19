import { Link } from 'react-router-dom'
import { quests } from '../data/quests'
import { useAppStore } from '../store/useAppStore'

export default function Quests() {
  const { activeQuestIds, questStatus, skipQuest, coins } = useAppStore()
  const active = activeQuestIds
    .map((id) => quests.find((q) => q.id === id))
    .filter((q) => !!q)

  return (
    <div>
      <h2>Quest</h2>
      <p>Koin: {coins}</p>
      <Link to="/ad">Tonton iklan (+koin)</Link>
      <ul>
        {active.map((q) => {
          const done = questStatus[q.id] === 'done'
          return (
            <li key={q.id}>
              <Link to={`/quests/${q.id}`}>{q.title}</Link> ({q.destination}) +{q.rewardCoins} koin{' '}
              {done ? '✓ selesai' : <button onClick={() => skipQuest(q.id)}>Skip</button>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
