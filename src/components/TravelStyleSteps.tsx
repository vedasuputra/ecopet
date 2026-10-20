import { useState } from 'react'
import { useT } from '../i18n'
import { isComplete, type StyleAnswers } from '../lib/travelerStyle'
import TravelStyleForm, { STYLE_STEPS } from './TravelStyleForm'

// "What kind of traveler are you?" one question at a time: the question on top, and Previous / Next at the bottom (the first
// Previous leaves, the last Next is the button that finishes). The pages give the classes for their own card and buttons.
export default function TravelStyleSteps({
  style,
  onChange,
  onDone,
  onExit,
  doneLabel,
  busy = false,
  cardClass,
  barClass,
  btnClass,
  primaryClass,
}: {
  style: StyleAnswers
  onChange: (s: StyleAnswers) => void
  onDone: () => void
  onExit: () => void
  doneLabel: string
  busy?: boolean
  cardClass: string
  barClass: string
  btnClass: string
  primaryClass: string
}) {
  const t = useT()
  const [i, setI] = useState(() => (isComplete(style) ? STYLE_STEPS.length - 1 : 0)) // a retry with every answer there opens at the last question
  const last = i === STYLE_STEPS.length - 1
  // nothing is chosen at first: every question but the interests needs an answer before Next
  const step = STYLE_STEPS[i]
  const answered = step === 'interests' || (step === 'pace' ? !!style.pace : step === 'company' ? !!style.company : step === 'budget' ? !!style.budget : style.earlyRiser !== undefined)
  return (
    <>
      <section className={cardClass}>
        <p className="tsf-progress">{t('quizProgress', { n: i + 1, total: STYLE_STEPS.length })}</p>
        <TravelStyleForm style={style} onChange={onChange} step={STYLE_STEPS[i]} disabled={busy} />
      </section>
      <div className={barClass}>
        <button className={btnClass} onClick={() => (i === 0 ? onExit() : setI(i - 1))} disabled={busy}>
          {t('tripPrevious')}
        </button>
        <button className={`${btnClass} ${primaryClass}`} onClick={() => (last ? onDone() : setI(i + 1))} disabled={busy || !answered}>
          {last ? (busy ? t('planning') : doneLabel) : t('quizNext')}
        </button>
      </div>
    </>
  )
}
