import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import DesktopShell from './components/DesktopShell.tsx'

// Top-level wide window -> phone-sized iframe shell. Inside the iframe (or on a real phone) -> the app.
// The vendor dashboard (/vendor) is a normal responsive web app and never goes in the phone shell.
const isWideTopLevel = () =>
  window.self === window.top && window.innerWidth > 500 && !window.location.pathname.startsWith('/vendor')

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
