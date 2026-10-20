import { toPng } from 'html-to-image'
import { useRef, useState } from 'react'
import MeiluAvatar from '../components/MeiluAvatar'
import { useCatalog } from '../store/useCatalog'
import { useLoc, useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'

const MAX_LISTED = 5

export default function TripCard() {
  const quests = useCatalog((s) => s.quests)
  const t = useT()
  const loc = useLoc()
  const { user, coins, questStatus } = useAppStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const doneQuests = quests.filter((q) => questStatus[q.id] === 'done')
  const listed = doneQuests.slice(0, MAX_LISTED)

  // Renders the card element to a PNG (2x for sharpness).
  const render = async (): Promise<Blob> => {
    if (!cardRef.current) throw new Error('no card')
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' })
    return await (await fetch(dataUrl)).blob()
  }

  const download = (blob: Blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ecopet-trip-card.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const run = async (mode: 'share' | 'download') => {
    setBusy(true)
    setMsg(t('cardPreparing'))
    try {
      const blob = await render()
      const file = new File([blob], 'ecopet-trip-card.png', { type: 'image/png' })
      if (mode === 'share' && navigator.canShare?.({ files: [file] })) {
        // Native share sheet (phones). Falls through to download on desktop browsers.
        await navigator.share({ files: [file], title: 'Eco-Pet', text: t('shareText') })
        setMsg('')
      } else {
        download(blob)
        setMsg(t('cardSaved'))
      }
    } catch (e) {
      // User closing the share sheet is not an error.
      setMsg((e as Error).name === 'AbortError' ? '' : t('cardFailed'))
    }
    setBusy(false)
  }

  return (
    <div>
      {/* The card itself: this element is what gets exported as the image. Placeholder styling until the design pass. */}
      <div
        ref={cardRef}
        id="trip-card"
        style={{ width: 320, padding: 20, background: '#fff', border: '1px solid #000', margin: '0 auto', textAlign: 'center' }}
      >
        <MeiluAvatar size={110} />
        <h2 style={{ margin: '8px 0' }}>{t('tripTitle', { name: user?.name ?? '' })}</h2>
        <p>
          {t('tripLine', {
            days: user?.days ?? 1,
            dest: user?.destinations.join(', ') || t('mekongDelta'),
          })}
        </p>
        <p>
          <b>{t('questsCompleted', { n: doneQuests.length })}</b> · {t('coinsLine', { n: coins })}
        </p>
        {listed.length === 0 ? (
          <p>{t('cardNoQuests')}</p>
        ) : (
          <ul style={{ textAlign: 'left' }}>
            {listed.map((q) => (
              <li key={q.id}>{loc(q.title)}</li>
            ))}
            {doneQuests.length > MAX_LISTED && <li>{t('cardMore', { n: doneQuests.length - MAX_LISTED })}</li>}
          </ul>
        )}
        <p style={{ fontSize: 12, marginBottom: 0 }}>{t('cardFooter')}</p>
      </div>

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button onClick={() => run('share')} disabled={busy}>
          {t('share')}
        </button>
        <button onClick={() => run('download')} disabled={busy}>
          {t('download')}
        </button>
        {msg && <p>{msg}</p>}
      </div>
    </div>
  )
}
