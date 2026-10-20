import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import DesktopShell from './components/DesktopShell.tsx'

// Top-level wide window -> phone-sized iframe shell. Inside the iframe (or on a real phone) -> the app.
// The public pages (/, /privacy) and the vendor dashboard (/vendor) are normal responsive web pages and
// never go in the phone shell. Everything else is the traveler app.
const isWebPage = (path: string) => path === '/' || path.startsWith('/privacy') || path.startsWith('/vendor') || path.startsWith('/admin')
const isWideTopLevel = () => window.self === window.top && window.innerWidth > 500 && !isWebPage(window.location.pathname)

function Root() {
  const [shell, setShell] = useState(isWideTopLevel)
  useEffect(() => {
    const onResize = () => setShell(isWideTopLevel())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return shell ? <DesktopShell /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
