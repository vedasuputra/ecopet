import { useEffect, useRef, useState } from 'react'
import { useLocation as useRoute, useNavigate } from 'react-router-dom'
import MeiluChat from '../pages/MeiluChat'
import { useT } from '../i18n'
import { useFadeClose } from '../lib/useFadeClose'
import '../pages/chat.css'

// The chat popup, opened by the Meilu button in the bottom bar. It opens a chat popup, and Meilu can see the text of the screen
// the traveler is on (copied when the popup opens), so they can ask about what they are looking at.
export default function MeiluPopup() {
  const t = useT()
  const { pathname } = useRoute()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [pageText, setPageText] = useState('')
  const [closing, hide, reopen] = useFadeClose(() => setOpen(false))
  const [min, setMin] = useState(false) // dragged down to the small bar
  const [drag, setDrag] = useState<number | null>(null) // how far the sheet is dragged right now (px, down is +)
  const grab = useRef<{ y: number; moved: number } | null>(null)

  const onGrabDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return // the buttons are buttons, not a handle
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    grab.current = { y: e.clientY, moved: 0 }
  }
  const onGrabMove = (e: React.PointerEvent) => {
    const g = grab.current
    if (!g) return
    const dy = e.clientY - g.y
    g.moved = Math.max(g.moved, Math.abs(dy))
    // open: follow the finger downwards; small: nothing follows, the release decides
    if (!min) setDrag(Math.max(0, dy))
  }
  const onGrabUp = (e: React.PointerEvent) => {
    const g = grab.current
    grab.current = null
    if (!g) return
    const dy = e.clientY - g.y
    setDrag(null)
    if (min) {
      if (dy < -30 || g.moved < 6) setMin(false) // swiped up, or tapped
    } else if (dy > 80) {
      setMin(true)
    }
  }

  // Going to another screen closes the open chat, but the small bar stays (and Meilu now reads the new screen), unless it is the full-screen chat
  useEffect(() => {
    if (!min || pathname === '/meilu') return setOpen(false)
    const id = setTimeout(() => {
      const main = document.querySelector('main')
      setPageText(main ? (main as HTMLElement).innerText.slice(0, 2500) : '')
    }, 400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])
  // the round Meilu button in the middle of the bottom bar opens this popup
  useEffect(() => {
    const on = () => show()
    window.addEventListener('meilu:open', on)
    return () => window.removeEventListener('meilu:open', on)
  })
  const show = () => {
    if (pathname === '/meilu') return
    const main = document.querySelector('main')
    setPageText(main ? (main as HTMLElement).innerText.slice(0, 2500) : '')
    setMin(false)
    reopen()
    setOpen(true)
  }

  return (
    <>
      {open && (
        <div className={`popup-backdrop chat-backdrop${min ? ' is-min' : ''}${closing ? ' is-closing' : ''}`} role="dialog" aria-modal={!min} aria-label={t('meiluTalk')} onClick={hide}>
          <div className={`chat-sheet${drag !== null ? ' is-dragging' : ''}`} style={drag ? { transform: `translateY(${drag}px)` } : undefined} onClick={(e) => e.stopPropagation()}>
            <div className="chat-grab" onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={onGrabUp}>
            <span className="chat-handle" aria-hidden="true" />
            <div className="popup-head chat-head">
              <div className="popup-titles">
                <h3>{t('meiluTalk')}</h3>
              </div>
              <button
                className="popup-close"
                onClick={() => {
                  setOpen(false)
                  navigate('/meilu', { state: { from: pathname } })
                }}
                aria-label={t('meiluFullscreen')}
                title={t('meiluFullscreen')}
              >
                <span className="mi" aria-hidden="true">
                  open_in_full
                </span>
              </button>
              <button className="popup-close" onClick={hide} aria-label={t('close')} title={t('close')}>
                <span className="mi" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            </div>
            <MeiluChat popup pageText={pageText} />
          </div>
        </div>
      )}
    </>
  )
}
