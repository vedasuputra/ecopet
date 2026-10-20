import type { ReactNode } from 'react'

// Desktop: 390x844 bordered phone, centered. <=500px: full screen.
const css = `
.phone-outer { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #021a37; }
.phone-frame { position: relative; width: 390px; height: 844px; border: 0; border-radius: 20px; background: #fff; box-shadow: 0 0 0 1px rgba(120, 160, 220, 0.06), 0 36px 90px rgba(30, 60, 120, 0.3), 0 12px 32px rgba(10, 25, 60, 0.5); display: flex; flex-direction: column; overflow: hidden; }
.phone-scroll { flex: 1; overflow-y: auto; isolation: isolate; } /* its own layer: the screens' sticky bars cannot rise above the small chat bar */
@media (max-width: 500px) {
  .phone-outer { display: block; min-height: 0; }
  .phone-frame { width: 100%; height: 100dvh; border-radius: 0; box-shadow: none; }
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
