// white confetti: left %, size px, fall time s, delay s, sideways drift px
const CONFETTI: [number, number, number, number, number][] = [
  [4, 7, 3.4, 0.0, 20], [9, 5, 4.1, 0.6, -14], [14, 8, 3.7, 1.1, 24], [19, 6, 4.4, 0.3, -20], [24, 9, 3.2, 1.5, 12],
  [29, 5, 4.0, 0.9, -26], [34, 7, 3.6, 0.2, 18], [39, 6, 4.3, 1.3, -10], [44, 8, 3.3, 0.7, 22], [49, 5, 4.2, 1.7, -18],
  [54, 7, 3.5, 0.4, 16], [59, 9, 3.9, 1.0, -24], [64, 6, 3.4, 1.9, 10], [69, 8, 4.0, 0.1, -16], [74, 5, 3.6, 1.4, 26],
  [79, 7, 4.2, 0.8, -12], [84, 6, 3.3, 1.6, 20], [89, 9, 3.8, 0.5, -22], [94, 5, 4.1, 1.2, 14], [97, 7, 3.5, 2.0, -18],
  [2, 6, 3.9, 2.2, 12], [31, 8, 3.2, 2.4, -20], [61, 6, 4.4, 2.1, 18], [86, 7, 3.7, 2.3, -14],
]

// White confetti falling behind a popup card (put it inside the popup backdrop, before the card).
export default function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {CONFETTI.map(([x, s, d, delay, drift], i) => (
        <i key={i} style={{ left: `${x}%`, width: s, height: s * 1.6, animationDuration: `${d}s`, animationDelay: `${delay}s`, ['--drift' as string]: `${drift}px` }} />
      ))}
    </div>
  )
}
