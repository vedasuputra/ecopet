import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation as useRoute, useNavigate } from 'react-router-dom'
import ChatMap, { placesIn } from '../components/ChatMap'
import ChatText from '../components/ChatText'
import MeiluAvatar from '../components/MeiluAvatar'
import { whereAt } from '../data/arrival'
import { findCachedAnswer, suggestedQuestions } from '../data/meiluCache'
import { areaLabel, nearestKnown } from '../data/places'
import { planSummary } from '../lib/planner'
import { useLang, useT } from '../i18n'
import { askMeilu, failureMessage } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useChatMap, type MapPlace } from '../store/useChatMap'
import { useLocation } from '../store/useLocation'
import './chat.css'

const FAKE_TYPING_MS = 700

export default function MeiluChat({ pageText, popup = false }: { pageText?: string; popup?: boolean } = {}) {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { chatHistory, addChat, activeQuestIds } = useAppStore()
  const userName = (useAppStore((s) => s.user?.name) ?? '').trim()
  const initial = userName.charAt(0).toUpperCase() || '?'
  const { lat, lng, placeName } = useLocation()
  const [text, setText] = useState('')
  const [reaction, setReaction] = useState<'' | 'nod' | 'hop' | 'think'>('')
  const reactTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [busy, setBusy] = useState(false)
  const mapOpen = useChatMap((s) => s.open)
  // the place picked on the map: Meilu keeps it in mind for the next messages, until it is removed (the chip above the box)
  const [topic, setTopic] = useState<MapPlace | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const toggleMap = useChatMap((s) => s.toggle)
  const area = areaLabel(lat, lng, placeName)
  const end = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const from = (useRoute().state as { from?: string } | null)?.from ?? '/home' // the screen it was opened from
  const leave = (asPopup: boolean) => {
    navigate(from === '/meilu' ? '/home' : from, { replace: true })
    if (asPopup) setTimeout(() => window.dispatchEvent(new Event('meilu:open')), 150) // comes back as the popup over that screen
  }
  // the newest message (or the typing dots) is always in view
  useLayoutEffect(() => {
    const down = () => end.current?.scrollIntoView({ block: 'end' })
    down() // straight away, before the screen is painted
    const raf = requestAnimationFrame(down) // and once more when the new row has its real height
    const later = setTimeout(down, 320) // and after the row's fade-in
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(later)
    }
  }, [chatHistory.length, busy])
  useEffect(() => () => clearTimeout(reactTimer.current), [])

  const reply = (answer: string) => {
    addChat({ role: 'meilu', text: answer })
    // the places she recommends (the ones the app knows) show up on the map at once
    const named = placesIn(answer)
    if (named.length) useChatMap.getState().show(named)
    // her reaction to what she just said: excited (!) = a hop, a question = a curious tilt, otherwise a nod
    setReaction(answer.includes('!') ? 'hop' : answer.trim().endsWith('?') ? 'think' : 'nod')
    clearTimeout(reactTimer.current)
    reactTimer.current = setTimeout(() => setReaction(''), 1800)
  }

  const send = async (override?: string, focus: MapPlace | null = topic) => {
    try {
      await sendInner(override, focus ?? undefined)
    } catch {
      addChat({ role: 'meilu', text: t('meiluCant') })
    } finally {
      setBusy(false)
    }
  }

  const sendInner = async (override?: string, focus?: MapPlace) => {
    const q = (override ?? text).trim()
    if (!q || busy) return
    addChat({ role: 'user', text: q, ...(focus ? { place: focus.name } : {}) })
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
      style: useAppStore.getState().user?.style,
      pageText,
      // a place picked on the map: Meilu talks about it
      focusPlace: focus ? { name: focus.name, detail: focus.detail, lat: focus.lat, lng: focus.lng, kind: focus.kind } : undefined,
      // the same "you are here" as the map and the arrival hello
      hereAt: (() => {
        const { vendors, coupons } = useCatalog.getState()
        const at = whereAt(lat, lng, vendors, coupons)
        return at ? { kind: at.kind, name: at.kind === 'shop' ? at.shop.name : at.spot.name } : undefined
      })(),
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

  // the rows of the chat: Meilu's hello, then the conversation, then the typing dots. Her picture sits at the LAST row that is
  // hers, so it moves down with every new answer and reacts to the newest message.
  const rows: { key: string; me?: boolean; text?: string; place?: string; typing?: boolean }[] = [
    { key: 'hello', text: t('meiluHello') },
    ...chatHistory.map((m, i) => ({ key: `m${i}`, me: m.role === 'user', text: m.text, place: m.place })),
    ...(busy ? [{ key: 'typing', typing: true }] : []),
  ]
  const lastHers = rows.map((r) => !r.me).lastIndexOf(true)
  const shownReaction = busy ? 'think' : reaction

  return (
    <div className={`chat${popup ? ' is-popup' : ''}`}>
      {!popup && (
        <div className="chat-title">
          <h3>{t('meiluTalk')}</h3>
          <div className="chat-title-btns">
            <button className={`popup-close chat-map-btn${mapOpen ? ' on' : ''}`} onClick={toggleMap} aria-pressed={mapOpen} aria-label={t('mapToggle')} title={t('mapToggle')}>
              <span className="mi" aria-hidden="true">
                map
              </span>
            </button>
            <button className="popup-close" onClick={() => leave(true)} aria-label={t('meiluPopupMode')} title={t('meiluPopupMode')}>
              <span className="mi" aria-hidden="true">
                close_fullscreen
              </span>
            </button>
            <button className="popup-close" onClick={() => leave(false)} aria-label={t('close')} title={t('close')}>
              <span className="mi" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        </div>
      )}
      {mapOpen && (
        <ChatMap
          busy={busy}
          onAsk={(p) => {
            // the place becomes the topic; the message is only suggested, to edit or replace before sending
            setTopic(p)
            if (!text.trim()) setText(t('mapAskText', { name: p.name }))
            requestAnimationFrame(() => {
              const el = inputRef.current
              if (!el) return
              el.focus()
              el.setSelectionRange(el.value.length, el.value.length)
            })
          }}
        />
      )}
      <div className="chat-log">
        <ul className="chat-list" aria-live="polite">
          {rows.map((r, i) => (
            <li key={r.key} className={`chat-row ${r.me ? 'is-me' : 'is-meilu'}`}>
              {/* her picture is on all her messages, but only the newest one moves */}
              <span className="chat-slot">
                {r.me ? (
                  <span className="chat-me-ava" aria-hidden="true">
                    {initial}
                  </span>
                ) : (
                  <span className={`chat-ava${i === lastHers ? ' is-latest' : ''}`}>
                    <span className="chat-ava-in">
                      <MeiluAvatar spinner={false} size={83} reaction={i === lastHers ? shownReaction : ''} still={i !== lastHers} />
                    </span>
                  </span>
                )}
              </span>
              <div className="chat-body">
                <span className="chat-name">{r.me ? userName || t('you') : 'Meilu'}</span>
                {r.typing ? (
                  <span className="chat-typing" aria-label={t('meiluTyping')} title={t('meiluTyping')}>
                    <span />
                    <span />
                    <span />
                  </span>
                ) : r.me ? (
                  <>
                    {r.place && (
                      <span className="chat-about">
                        <span className="mi" aria-hidden="true">
                          location_on
                        </span>
                        <span>
                          {t('mapTopic')} <b>{r.place}</b>
                        </span>
                      </span>
                    )}
                    <div className="chat-text">{r.text}</div>
                  </>
                ) : (
                  <div className="chat-text">
                    <ChatText text={r.text ?? ''} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div ref={end} />
      </div>
      <div className="chat-foot">
        <div className="chat-chips">
          {suggestedQuestions(area, lang).map((q) => (
            <button key={q} className="chat-chip" onClick={() => send(q)} disabled={busy}>
              {q}
            </button>
          ))}
        </div>
        {topic && (
          <div className="chat-topic">
            <span className="mi" aria-hidden="true">
              location_on
            </span>
            <span className="chat-topic-text">
              {t('mapTopic')} <b>{topic.name}</b>
            </span>
            <button type="button" onClick={() => setTopic(null)} aria-label={t('mapTopicRemove')} title={t('mapTopicRemove')}>
              <span className="mi" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        )}
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <input ref={inputRef} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={t('askPlaceholder')} aria-label={t('askPlaceholder')} />
          <button type="submit" className="chat-send" disabled={busy || !text.trim()} aria-label={t('send')} title={t('send')}>
            <span className="mi" aria-hidden="true">
              send
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
