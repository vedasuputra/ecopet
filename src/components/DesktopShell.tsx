// On desktop the app runs inside an iframe sized like a phone. Inside the iframe the viewport
// really is 390px wide, so full-window overlays (Google's rewarded ad) stay inside the phone
// boundary and the layout behaves exactly as on a real phone.
import { useEffect } from 'react'

export default function DesktopShell() {
  // the dark slate fills the whole window, also behind the page margins
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#131720'
    return () => {
      document.body.style.background = prev
    }
  }, [])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#131720' }}>
      <iframe
        title="Eco-Pet"
        src={window.location.pathname + window.location.search}
        allow="geolocation; camera; microphone; clipboard-write; web-share; fullscreen; autoplay"
        style={{
          width: 390,
          height: 'min(844px, calc(100vh - 24px))',
          border: 0,
          borderRadius: 20,
          background: '#fff',
          // a deep dark shadow so the phone looks lifted off the background
          boxShadow: '0 0 0 1px rgba(120, 160, 220, 0.06), 0 36px 90px rgba(30, 60, 120, 0.3), 0 12px 32px rgba(10, 25, 60, 0.5)',
        }}
      />
    </div>
  )
}
