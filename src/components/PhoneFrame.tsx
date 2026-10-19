import type { ReactNode } from 'react'

// Desktop: 390x844 bordered phone, centered. <=500px: full screen.
const css = `
.phone-outer { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.phone-frame { position: relative; width: 390px; height: 844px; border: 2px solid #000; display: flex; flex-direction: column; overflow: hidden; }
.phone-scroll { flex: 1; overflow-y: auto; }
@media (max-width: 500px) {
  .phone-outer { display: block; min-height: 0; }
  .phone-frame { width: 100%; height: 100dvh; border: 0; }
}
`

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-outer">
      <style>{css}</style>
      <div className="phone-frame">{children}</div>
    </div>
  )
}
