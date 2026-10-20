import { useEffect, useState } from 'react'
import { useLocation as useRoute } from 'react-router-dom'
import MeiluChat from '../pages/MeiluChat'
import { useT } from '../i18n'

// The chat popup, opened by the Meilu button in the bottom bar. It opens a chat popup, and Meilu can see the text of the screen
// the traveler is on (copied when the popup opens), so they can ask about what they are looking at.
export default function MeiluPopup() {
  const t = useT()
  const { pathname } = useRoute()
  const [open, setOpen] = useState(false)
  const [pageText, setPageText] = useState('')

  useEffect(() => setOpen(false), [pathname])
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
    setOpen(true)
  }

  return (
    <>
      {open && (
        <div role="dialog" aria-modal="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: '18%', zIndex: 2100, background: '#fff', borderTop: '2px solid #000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 6, textAlign: 'right' }}>
            <button onClick={() => setOpen(false)}>{t('close')}</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
            <MeiluChat popup pageText={pageText} />
          </div>
        </div>
      )}
    </>
  )
}
