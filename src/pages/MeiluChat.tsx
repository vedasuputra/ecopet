import { useState } from 'react'
import MeiluAvatar from '../components/MeiluAvatar'
import { findCachedAnswer, suggestedQuestions } from '../data/meiluCache'
import { areaLabel, nearestKnown } from '../data/places'
import { planSummary } from '../lib/planner'
import { useLang, useT } from '../i18n'
import { askMeilu, failureMessage } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'

const FAKE_TYPING_MS = 700

export default function MeiluChat() {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { chatHistory, addChat, activeQuestIds } = useAppStore()
  const { lat, lng, placeName } = useLocation()
  const [text, setText] = useState('')
  const [nodding, setNodding] = useState(false)
  const [busy, setBusy] = useState(false)
  const area = areaLabel(lat, lng, placeName)

  const reply = (answer: string) => {
    addChat({ role: 'meilu', text: answer })
    setNodding(true)
    setTimeout(() => setNodding(false), 1800)
  }

  const send = async (override?: string) => {
    const q = (override ?? text).trim()
    if (!q || busy) return
    addChat({ role: 'user', text: q })
    setText('')
    setBusy(true)

    // Gemini always goes first. The pre-written answers are only a fallback for when
    // Gemini fails (rate limit, offline, server error), so the demo never shows a dead chat.
    const r = await askMeilu({
      message: q,
      history: chatHistory,
      placeName: area === placeName ? placeName : `${area} (${placeName})`,
      lat,
      lng,
      nearest: nearestKnown(lat, lng),
      activeQuests: activeQuestIds.map((id) => {
        const quest = useCatalog.getState().quests.find((x) => x.id === id)
        return quest ? quest.title.en : id
      }),
      language: lang,
      plan: planSummary(
        useAppStore.getState().itinerary,
        useCatalog.getState().quests.map((x) => ({ id: x.id, title: x.title.en })),
      ),
    })
    if (r.ok) {
      setBusy(false)
      return reply(String(r.reply))
    }

    // Gemini failed: use the matching pre-written answer if there is one...
    const cached = findCachedAnswer(q, lang)
    if (cached) {
      await new Promise((res) => setTimeout(res, FAKE_TYPING_MS))
      setBusy(false)
      return reply(cached)
    }
    // ...otherwise show why, in the app language (incl. the free-plan rate limit notice).
    setBusy(false)
    addChat({ role: 'meilu', text: failureMessage(r, t, 'meiluCant') })
  }

  return (
    <div>
      <MeiluAvatar nodding={nodding} interactive />
      <ul>
        {chatHistory.map((m, i) => (
          <li key={i} style={{ whiteSpace: 'pre-line' }}>
            <b>{m.role === 'user' ? t('you') : 'Meilu'}:</b> {m.text}
          </li>
        ))}
        {busy && <li>{t('meiluTyping')}</li>}
      </ul>
      <div>
        <small>{t('tryAsking', { area })}</small>
        {suggestedQuestions(area, lang).map((q) => (
          <div key={q}>
            <button onClick={() => send(q)} disabled={busy}>
              {q}
            </button>
          </div>
        ))}
      </div>
      <input
        value={text}
        maxLength={500}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        placeholder={t('askPlaceholder')}
      />
      <button onClick={() => send()} disabled={busy}>
        {t('send')}
      </button>
    </div>
  )
}
