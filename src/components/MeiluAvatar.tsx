// Placeholder. Replace with the existing Meilu animation later.
// `nodding` will trigger the head-nod animation while Meilu replies.
export default function MeiluAvatar({ nodding = false }: { nodding?: boolean }) {
  return <div aria-label="Meilu">🐦 Meilu{nodding ? ' (manggut-manggut)' : ''}</div>
}
