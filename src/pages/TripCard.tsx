import { quests } from '../data/quests'
import { useAppStore } from '../store/useAppStore'

export default function TripCard() {
  const { user, coins, questStatus } = useAppStore()
  const doneQuests = quests.filter((q) => questStatus[q.id] === 'done')
  return (
    <div>
      <div id="trip-card">
        <h2>Kenangan Trip {user?.name}</h2>
        <p>
          {user?.days} hari di {user?.destinations.join(', ') || 'Mekong Delta'}
        </p>
        <p>Quest selesai: {doneQuests.length}</p>
        <ul>
          {doneQuests.map((q) => (
            <li key={q.id}>{q.title}</li>
          ))}
        </ul>
        <p>Koin: {coins}</p>
      </div>
      {/* TODO: html-to-image + Web Share API (fallback download) */}
      <button onClick={() => alert('Belum fungsi')}>Share</button>
      <button onClick={() => alert('Belum fungsi')}>Download</button>
    </div>
  )
}
