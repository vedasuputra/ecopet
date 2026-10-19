// Meilu is a flat PNG, so animation is limited to CSS transforms on the whole image.
// `nodding` triggers a head-nod (tilt + dip) while Meilu replies.
const css = `
@keyframes meilu-nod {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(-4deg) translateY(4px); }
  50% { transform: rotate(0deg) translateY(0); }
  75% { transform: rotate(-4deg) translateY(4px); }
}
.meilu-nod { animation: meilu-nod 0.9s ease-in-out infinite; transform-origin: 50% 90%; }
`

export default function MeiluAvatar({ nodding = false, size = 120 }: { nodding?: boolean; size?: number }) {
  return (
    <>
      <style>{css}</style>
      <img
        src="/meilu.png"
        alt="Meilu"
        width={size}
        className={nodding ? 'meilu-nod' : undefined}
        draggable={false}
      />
    </>
  )
}
