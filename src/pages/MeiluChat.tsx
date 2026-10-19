import { useState } from 'react'
import MeiluAvatar from '../components/MeiluAvatar'
import { quests } from '../data/quests'
import { askMeilu } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { useLocation } from '../store/useLocation'

export default function MeiluChat() {
  const { chatHistory, addChat, activeQuestIds } = useAppStore()
  const { lat, lng, placeName } = useLocation()
  const [text, setText] = useState('')
  const [nodding, setNodding] = useState(false)
  const [busy, setBusy] = useState(false)

  const send = async () => {
    const t = text.trim()
    if (!t || busy) return
    addChat({ role: 'user', text: t })
    setText('')
    setBusy(true)
    const r = await askMeilu({
      message: t,
      history: chatHistory,
      placeName,
      lat,
      lng,
      activeQuests: activeQuestIds.map((id) => quests.find((q) => q.id === id)?.title ?? id),
    })
    setBusy(false)
    // Shows the server's message as-is, including the free-plan rate limit notice.
    addChat({ role: 'meilu', text: r.ok ? String(r.reply) : (r.message ?? 'Meilu sedang tidak bisa menjawab.') })
    if (r.ok) {
      setNodding(true)
      setTimeout(() => setNodding(false), 1800)
    }
  }

  return (
    <div>
      <MeiluAvatar nodding={nodding} />
      <ul>
        {chatHistory.map((m, i) => (
          <li key={i}>
            <b>{m.role === 'user' ? 'Kamu' : 'Meilu'}:</b> {m.text}
          </li>
        ))}
        {busy && <li>Meilu sedang mengetik...</li>}
      </ul>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        placeholder="Tanya Meilu..."
      />
      <button onClick={send} disabled={busy}>
        Kirim
      </button>
    </div>
  )
}
