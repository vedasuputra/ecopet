import { useState } from 'react'
import MeiluAvatar from '../components/MeiluAvatar'
import { useAppStore } from '../store/useAppStore'

export default function MeiluChat() {
  const { chatHistory, addChat } = useAppStore()
  const [text, setText] = useState('')
  const [nodding, setNodding] = useState(false)

  const send = () => {
    const t = text.trim()
    if (!t) return
    addChat({ role: 'user', text: t })
    setText('')
    // Fake reply. Later: POST /api/chat with place name, coords, active quests, language.
    setNodding(true)
    setTimeout(() => {
      addChat({ role: 'meilu', text: 'Halo, aku Meilu' })
      setNodding(false)
    }, 600)
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
      </ul>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        placeholder="Tanya Meilu..."
      />
      <button onClick={send}>Kirim</button>
    </div>
  )
}
