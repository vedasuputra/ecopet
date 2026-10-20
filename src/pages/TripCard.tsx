import { toPng } from 'html-to-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import MeiluAvatar from '../components/MeiluAvatar'
import FilterDropdown from '../components/FilterDropdown'
import { useCatalog } from '../store/useCatalog'
import { useLang, useLoc, useT } from '../i18n'
import { FUN_FACTS, tripImpact } from '../lib/impact'
import { getReferral } from '../store/economy'
import { useAppStore } from '../store/useAppStore'
import './tripcard.css'

// The trip memory card: an Instagram story (9:16, shown at 360 x 640 and saved at 1080 x 1920) made like a postcard, with the
// traveler's own colour and photo, what they did for sustainability, and their referral code for friends.
const W = 360
const H = 640
// The colours: pastels only. A pastel is one hue made light and fresh (the gradient goes up to a lighter version of the SAME hue,
// it is never mixed with white or black, so it never looks washed out), plus the blue of the app itself.
const HUES = [204, 140, 340, 25, 265, 175, 48, 235] // blue, green, pink, peach, lavender, aqua, butter, periwinkle
const COLORS = ['app', ...HUES.map(String)]
const COLOR_KEY = 'ecopet.cardTheme'
interface Theme {
  g1: string // top of the gradient
  g2: string
  g3: string // bottom
  ink: string // the dark colour of the writing
  fill: string // the colour of the big place name
  on: string // writing right on the background
  swatch: string
}
const themeOf = (c: string): Theme => {
  if (c === 'app') return { g1: '#33b0f0', g2: '#168fd6', g3: '#0a5aa8', ink: '#0b2a5e', fill: '#ffffff', on: '#ffffff', swatch: 'linear-gradient(160deg, #33b0f0, #0a5aa8)' }
  const h = Number(c)
  return {
    g1: `hsl(${h} 100% 94%)`,
    g2: `hsl(${h} 90% 87%)`,
    g3: `hsl(${h} 85% 79%)`,
    ink: `hsl(${h} 60% 23%)`,
    fill: `hsl(${h} 100% 95%)`,
    on: `hsl(${h} 60% 23%)`,
    swatch: `hsl(${h} 90% 84%)`,
  }
}

export default function TripCard() {
  const quests = useCatalog((s) => s.quests)
  const coupons = useCatalog((s) => s.coupons)
  const t = useT()
  const loc = useLoc()
  const lang = useLang((s) => s.lang)
  const { user, questStatus, ownedCoupons } = useAppStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [color, setColor] = useState(() => {
    try {
      const saved = localStorage.getItem(COLOR_KEY)
      return saved && COLORS.includes(saved) ? saved : COLORS[0]
    } catch {
      return COLORS[0]
    }
  })
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState('')
  const [code, setCode] = useState('')
  const [codeFailed, setCodeFailed] = useState(false)
  const [note, setNote] = useState<string | null>(null) // the line at the bottom: a fact about the Mekong, or whatever the traveler writes instead
  const [scale, setScale] = useState(1)
  const [fav, setFav] = useState<string | null>(null) // the favourite quest the traveler chose to show (none chosen: the one that paid the most)

  useEffect(() => {
    void getReferral().then((r) => (r.ok && r.code ? setCode(r.code) : setCodeFailed(true)))
  }, [])
  // the card is drawn at a fixed size and shrunk to fit a narrow screen
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / W))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pick = (c: string) => {
    setColor(c)
    try {
      localStorage.setItem(COLOR_KEY, c)
    } catch {
      /* private window: the colour is only kept for this visit */
    }
  }

  const impact = useMemo(() => tripImpact(quests, questStatus, ownedCoupons, (id) => coupons.find((c) => c.id === id)?.vendorId), [quests, questStatus, ownedCoupons, coupons])
  const days = user?.days ?? 1
  const doneQuests = useMemo(() => quests.filter((q) => questStatus[q.id] === 'done'), [quests, questStatus])
  const favQuest = doneQuests.find((q) => q.id === fav) ?? [...doneQuests].sort((a, b) => b.rewardCoins - a.rewardCoins)[0]
  const name = user?.name ?? ''
  const place = t('cardPlace')
  const [factIdx, setFactIdx] = useState((name.length + days) % FUN_FACTS.length)
  const fact = FUN_FACTS[factIdx]
  // another fact, never the same one twice in a row
  const randomFact = () => {
    setNote(null)
    setFactIdx((i) => (i + 1 + Math.floor(Math.random() * (FUN_FACTS.length - 1))) % FUN_FACTS.length)
  }
  const noteText = note ?? (lang === 'vi' ? fact.vi : fact.en)

  // the photo is shrunk first (a phone photo is huge), and stays on this device
  const onPhoto = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const s = Math.min(1, 1200 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
      setPhoto(c.toDataURL('image/jpeg', 0.85))
      setPhotoName(file.name)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  // Renders the card element to a PNG: 360 x 640 at 3x is exactly the size of an Instagram story (1080 x 1920).
  const render = async (): Promise<Blob> => {
    if (!cardRef.current) throw new Error('no card')
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true, width: W, height: H })
    return await (await fetch(dataUrl)).blob()
  }

  const download = (blob: Blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ecopet-story.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const run = async (mode: 'share' | 'download') => {
    setBusy(true)
    setMsg(t('cardPreparing'))
    try {
      const blob = await render()
      const file = new File([blob], 'ecopet-story.png', { type: 'image/png' })
      if (mode === 'share' && navigator.canShare?.({ files: [file] })) {
        // Native share sheet (phones). Falls through to download on desktop browsers.
        await navigator.share({ files: [file], title: 'Eco-Pet', text: code ? t('cardShareText', { code }) : t('shareText') })
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

  const theme = themeOf(color)
  // only a phone has a share menu to send the picture to Instagram and the like; a computer just saves the image
  const phone = typeof navigator.share === 'function' && !!window.matchMedia?.('(pointer: coarse)').matches
  const lines = [
    t('cardLineQuests', { n: impact.questsDone }),
    t('cardLinePlastic', { n: impact.plasticFree }),
    t('cardLineBus', { n: impact.busRides }),
    t('cardLineLocal', { n: impact.localBusinesses }),
  ]

  return (
    <div className="tm-page">
      <div className="tm-stage" ref={stageRef} style={{ height: H * scale }}>
        <div className="tm-scale" style={{ transform: `scale(${scale})` }}>
          {/* The story itself: this element is what gets saved as the image (no icon font in it, only text, shapes and Meilu). */}
          <div ref={cardRef} className="tm-story" style={
              {
                ['--tm-g1' as string]: theme.g1,
                ['--tm-g2' as string]: theme.g2,
                ['--tm-g3' as string]: theme.g3,
                ['--tm-ink' as string]: theme.ink,
                ['--tm-fill' as string]: theme.fill,
                ['--tm-on' as string]: theme.on,
                width: W,
                height: H,
              } as React.CSSProperties
            }>
            {/* the front of the postcard: the traveler's photo (or a drawing of the river) and where they were */}
            <div className="tm-post tm-front">
              <div className="tm-photo">
                <img src={photo ?? '/card-default.png'} alt="" crossOrigin="anonymous" />
                <div className="tm-greet">
                  <span>{t('cardGreetings')}</span>
                  <b style={{ fontSize: place.length > 16 ? 22 : place.length > 10 ? 28 : 34 }}>{place}</b>
                </div>
                <div className="tm-sticker">
                  <MeiluAvatar size={132} spinner={false} />
                </div>
              </div>
            </div>

            {/* the back: what they did for the Delta, and the code for friends */}
            <div className="tm-post tm-back">
              <div className="tm-msg">
                <h3>{t('cardHello')}</h3>
                <p>{t('cardDaysLine', { n: days })}</p>
                <ul>
                  {lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
                {favQuest && (
                  <div className="tm-fav">
                    <span>{t('cardFav')}</span>
                    <b>★ {loc(favQuest.title)}</b>
                  </div>
                )}
                <em>{t('cardSign', { name })}</em>
              </div>
              <div className="tm-side">
                <p className="tm-for">
                  <b>{t('cardForTitle')}</b>
                  <span>{t('cardFor')}</span>
                </p>
                <div className="tm-ref">
                  <span>{t('cardRefTitle')}</span>
                  <b>{code || (codeFailed ? '- - -' : '······')}</b>
                  <i>{t('cardRefBonus')}</i>
                </div>
              </div>
            </div>

            {noteText.trim() && <div className="tm-fact">{noteText}</div>}
            <div className="tm-tag">{t('cardTagline')}</div>
            <div className="tm-app">Eco-Pet</div>
          </div>
        </div>
      </div>

      {/* make it yours: the colour, the line at the bottom, and the photo */}
      <div className="tm-tools">
        <div className="tm-field">
          <span className="tm-label">{t('cardColor')}</span>
          <span className="tm-colors" role="group" aria-label={t('cardColor')}>
            {COLORS.map((c) => (
              <button key={c} className={`tm-swatch${color === c ? ' active' : ''}`} style={{ background: themeOf(c).swatch }} onClick={() => pick(c)} aria-label={c === 'app' ? 'Eco-Pet' : `${c}`} aria-pressed={color === c} />
            ))}
          </span>
        </div>

        {doneQuests.length > 0 && (
          <div className="tm-field">
            <span className="tm-label">{t('cardFavLabel')}</span>
            <FilterDropdown
              label={t('cardFavLabel')}
              value={favQuest?.id ?? ''}
              matchWidth
              onChange={setFav}
              options={doneQuests.map((q) => ({ value: q.id, label: loc(q.title), sub: loc(q.description) }))}
            />
          </div>
        )}

        <div className="tm-field">
          <label className="tm-label" htmlFor="tm-note">
            {t('cardNote')}
          </label>
          <input
            id="tm-note"
            className="tm-note-input"
            maxLength={42}
            value={noteText}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('cardNotePlaceholder')}
          />
          <button type="button" className="tm-small" onClick={randomFact}>
            {t('cardFactNew')}
          </button>
        </div>

        <div className="tm-field">
          <span className="tm-label">{t('cardPhoto')}</span>
          {/* one big box: click it to choose a photo; once there is one it shows the name of the file */}
          <button type="button" className={`tm-drop${photo ? ' has' : ''}`} onClick={() => fileRef.current?.click()}>
            <span className="mi" aria-hidden="true">
              {photo ? 'image' : 'add_photo_alternate'}
            </span>
            <span className="tm-drop-text">{photo ? photoName || t('cardPhotoChosen') : t('cardPhotoBox')}</span>
            {photo && <span className="tm-drop-sub">{t('cardPhotoChange')}</span>}
          </button>
          {photo && (
            <button
              type="button"
              className="tm-link"
              onClick={() => {
                setPhoto(null)
                setPhotoName('')
              }}
            >
              {t('cardPhotoRemove')}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        </div>
      </div>

      <div className={`tm-actions${phone ? '' : ' one'}`}>
        <button className={`tm-btn${phone ? '' : ' tm-primary'}`} onClick={() => run('download')} disabled={busy}>
          {t('cardSave')}
        </button>
        {phone && (
          <button className="tm-btn tm-primary" onClick={() => run('share')} disabled={busy}>
            {t('cardShareStory')}
          </button>
        )}
      </div>
      {codeFailed && <p className="tm-msgline">{t('cardNoCode')}</p>}
      {msg && <p className="tm-msgline">{msg}</p>}
    </div>
  )
}
