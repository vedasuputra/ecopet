import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLang, useT } from '../i18n'
import { askMeiluDash, failureMessage } from '../lib/api'
import ChatText from './ChatText'

// Meilu in the shop and team dashboards: an "Ask Meilu" button at the bottom right that opens a small chat box. She knows whom she
// is helping (a shop owner, or the Eco-Pet team) and remembers that conversation on this device, separately for each role.
type Role = 'vendor' | 'admin'
type Msg = { role: 'user' | 'meilu'; text: string }
type L = { en: string; vi: string }

const MAX_KEPT = 40 // messages remembered per role
const storeKey = (role: Role) => `ecopet-dash-chat-${role}`

const TEXT: Record<string, L> = {
  ask: { en: 'Ask Meilu', vi: 'Hỏi Meilu' },
  placeholder: { en: 'Ask Meilu…', vi: 'Hỏi Meilu…' },
  send: { en: 'Send', vi: 'Gửi' },
  close: { en: 'Close', vi: 'Đóng' },
  clear: { en: 'New chat', vi: 'Cuộc trò chuyện mới' },
  typing: { en: 'Meilu is typing', vi: 'Meilu đang trả lời' },
}
const SUB: Record<Role, L> = {
  vendor: { en: 'Your Eco-Pet shop helper', vi: 'Trợ lý cửa hàng Eco-Pet' },
  admin: { en: 'Your Eco-Pet team assistant', vi: 'Trợ lý đội Eco-Pet' },
}
const HELLO: Record<Role, L> = {
  vendor: {
    en: 'Hi! I am Meilu 🐦 Not sure how something works here? Ask me anything about scanning coupons, your offers, fees or your plan.',
    vi: 'Chào bạn! Mình là Meilu 🐦 Có gì chưa rõ? Cứ hỏi mình về quét phiếu, ưu đãi, phí hay gói dịch vụ nhé.',
  },
  admin: {
    en: 'Hi team! I am Meilu 🐦 Ask me about reviewing quest photos, answering travelers, referrals or the impact numbers.',
    vi: 'Chào đội! Mình là Meilu 🐦 Hỏi mình về duyệt ảnh nhiệm vụ, trả lời du khách, giới thiệu bạn bè hay số liệu tác động nhé.',
  },
}
// what each role often wonders when starting out
const QUESTIONS: Record<Role, { en: string[]; vi: string[] }> = {
  vendor: {
    en: ['How do I scan a traveler’s coupon?', 'Why can’t travelers see my coupons?', 'What does the 5% commission mean?', 'How do I make a coupon travelers like?'],
    vi: ['Làm sao để quét phiếu của khách?', 'Sao khách không thấy phiếu của mình?', 'Phí hoa hồng 5% nghĩa là gì?', 'Làm sao tạo phiếu được khách thích?'],
  },
  admin: {
    en: [
      'How do I decide on a photo in the review queue?',
      'What do the red flags and AI confidence mean?',
      'Many checks fail on one quest. What should I do?',
      'How should I answer a customer service report?',
    ],
    vi: [
      'Làm sao quyết định một ảnh trong hàng chờ duyệt?',
      'Dấu hiệu đáng ngờ và độ tin cậy AI nghĩa là gì?',
      'Một nhiệm vụ bị kiểm tra trượt nhiều, mình nên làm gì?',
      'Nên trả lời báo cáo của du khách thế nào?',
    ],
  },
}

function load(role: Role): Msg[] {
  try {
    const v = JSON.parse(localStorage.getItem(storeKey(role)) ?? '[]')
    return Array.isArray(v) ? v.filter((m) => m && (m.role === 'user' || m.role === 'meilu') && typeof m.text === 'string') : []
  } catch {
    return []
  }
}
function save(role: Role, msgs: Msg[]) {
  try {
    localStorage.setItem(storeKey(role), JSON.stringify(msgs.slice(-MAX_KEPT)))
  } catch {
    /* private window: the chat just is not remembered */
  }
}

export default function DashChat({ role, shop }: { role: Role; shop?: { name: string; plan: string; status: string; coupons: number } }) {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(() => load(role))
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => save(role, msgs), [role, msgs])
  useLayoutEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [msgs, busy, open])
  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])

  const send = async (override?: string) => {
    const q = (override ?? text).trim()
    if (!q || busy) return
    const history = msgs
    setMsgs([...history, { role: 'user', text: q }])
    setText('')
    setBusy(true)
    const r = await askMeiluDash({ role, message: q, history, language: lang, shop })
    setBusy(false)
    setMsgs((m) => [...m, { role: 'meilu', text: r.ok ? String(r.reply) : failureMessage(r, t, 'meiluCant') }])
  }

  if (!open)
    return (
      <button className="vm-fab" onClick={() => setOpen(true)} aria-label={TEXT.ask[lang]}>
        <img className="vm-fab-icon" src="/icon-192.png?v=4" alt="" aria-hidden="true" />
        {TEXT.ask[lang]}
      </button>
    )

  return (
    <section className="vm-box" role="dialog" aria-label={TEXT.ask[lang]}>
      <header className="vm-head">
        <img className="vm-fab-icon" src="/icon-192.png?v=4" alt="" aria-hidden="true" />
        <div>
          <b>Meilu</b>
          <span>{SUB[role][lang]}</span>
        </div>
        {msgs.length > 0 && (
          <button className="vm-close" onClick={() => setMsgs([])} disabled={busy} aria-label={TEXT.clear[lang]} title={TEXT.clear[lang]}>
            <span className="mi" aria-hidden="true">
              refresh
            </span>
          </button>
        )}
        <button className="vm-close" onClick={() => setOpen(false)} aria-label={TEXT.close[lang]} title={TEXT.close[lang]}>
          <span className="mi" aria-hidden="true">
            close
          </span>
        </button>
      </header>

      <div className="vm-log" ref={log} aria-live="polite">
        <div className="vm-msg is-meilu">{HELLO[role][lang]}</div>
        {msgs.map((m, i) => (
          <div key={i} className={`vm-msg ${m.role === 'user' ? 'is-me' : 'is-meilu'}`}>
            {m.role === 'meilu' ? <ChatText text={m.text} /> : m.text}
          </div>
        ))}
        {busy && (
          <div className="vm-msg is-meilu vm-typing" aria-label={TEXT.typing[lang]} title={TEXT.typing[lang]}>
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      {/* questions to start with: only before the first message */}
      {msgs.length === 0 && (
        <div className="vm-chips">
          {QUESTIONS[role][lang].map((q) => (
            <button key={q} onClick={() => void send(q)} disabled={busy}>
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        className="vm-form"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={TEXT.placeholder[lang]} maxLength={500} aria-label={TEXT.placeholder[lang]} />
        <button type="submit" disabled={busy || !text.trim()} aria-label={TEXT.send[lang]} title={TEXT.send[lang]}>
          <span className="mi" aria-hidden="true">
            send
          </span>
        </button>
      </form>
    </section>
  )
}
