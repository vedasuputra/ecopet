// On desktop the app runs inside an iframe sized like a phone. Inside the iframe the viewport
// really is 390px wide, so full-window overlays (Google's rewarded ad) stay inside the phone
// boundary and the layout behaves exactly as on a real phone.
export default function DesktopShell() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <iframe
        title="Eco-Pet"
        src={window.location.pathname + window.location.search}
        allow="geolocation; camera; microphone; clipboard-write; web-share; fullscreen; autoplay"
        style={{
          width: 390,
          height: 'min(844px, calc(100vh - 24px))',
          border: '2px solid #000',
          background: '#fff',
        }}
      />
    </div>
  )
}
