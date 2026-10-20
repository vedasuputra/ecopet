import { useState } from 'react'
import { useT, type Key } from '../i18n'
import { BUDGETS, COMPANIES, DEFAULT_STYLE, INTERESTS, PACES, type Interest, type TravelerStyle } from '../lib/travelerStyle'
import MeiluAvatar from './MeiluAvatar'

// Meilu asks "what kind of traveler are you?" one question at a time. Used in onboarding and right
// before Meilu plans the days. Every answer has a default, so the quiz can always be finished.

const STEPS = ['pace', 'interests', 'company', 'budget', 'morning'] as const
type Step = (typeof STEPS)[number]

const QUESTION: Record<Step, Key> = { pace: 'qPace', interests: 'qInterests', company: 'qCompany', budget: 'qBudget', morning: 'qMorning' }
const LABEL: Record<string, Key> = {
  relaxed: 'paceRelaxed',
  balanced: 'paceBalanced',
  packed: 'pacePacked',
  nature: 'intNature',
  food: 'intFood',
  markets: 'intMarkets',
  culture: 'intCulture',
  adventure: 'intAdventure',
  relax: 'intRelax',
  solo: 'compSolo',
  friends: 'compFriends',
  couple: 'compCouple',
  family: 'compFamily',
  low: 'budgetLow',
  mid: 'budgetMid',
  high: 'budgetHigh',
}
export const styleLabel = (key: string): Key => LABEL[key]

export default function TravelerQuiz({
  initial,
  intro,
  doneLabel,
  onDone,
  onSkip,
  onBack,
}: {
  initial?: TravelerStyle | null
  intro: string
  doneLabel?: string
  onDone: (style: TravelerStyle) => void
  onSkip?: () => void
  onBack?: () => void
}) {
  const t = useT()
  const [i, setI] = useState(0)
  const [a, setA] = useState<TravelerStyle>(initial ?? DEFAULT_STYLE)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  const toggle = (x: Interest) =>
    setA((s) => ({ ...s, interests: s.interests.includes(x) ? s.interests.filter((y) => y !== x) : [...s.interests, x] }))

  const choice = (name: string, options: readonly string[], value: string, set: (v: string) => void) =>
    options.map((o) => (
      <div key={o}>
        <label>
          <input type="radio" name={name} checked={value === o} onChange={() => set(o)} /> {t(LABEL[o])}
        </label>
      </div>
    ))

  return (
    <div>
      <h2>{t('quizTitle')}</h2>
      <MeiluAvatar size={90} />
      {i === 0 && <p>{intro}</p>}
      <p>
        <small>{t('quizProgress', { n: i + 1, total: STEPS.length })}</small>
      </p>
      <p>
        <b>{t(QUESTION[step])}</b>
        {step === 'interests' && (
          <>
            {' '}
            <small>{t('quizPickAny')}</small>
          </>
        )}
      </p>

      {step === 'pace' && choice('pace', PACES, a.pace, (v) => setA({ ...a, pace: v as TravelerStyle['pace'] }))}
      {step === 'interests' &&
        INTERESTS.map((x) => (
          <div key={x}>
            <label>
              <input type="checkbox" checked={a.interests.includes(x)} onChange={() => toggle(x)} /> {t(LABEL[x])}
            </label>
          </div>
        ))}
      {step === 'company' && choice('company', COMPANIES, a.company, (v) => setA({ ...a, company: v as TravelerStyle['company'] }))}
      {step === 'budget' && choice('budget', BUDGETS, a.budget, (v) => setA({ ...a, budget: v as TravelerStyle['budget'] }))}
      {step === 'morning' && (
        <>
          <div>
            <label>
              <input type="radio" name="morning" checked={a.earlyRiser} onChange={() => setA({ ...a, earlyRiser: true })} /> {t('morningYes')}
            </label>
          </div>
          <div>
            <label>
              <input type="radio" name="morning" checked={!a.earlyRiser} onChange={() => setA({ ...a, earlyRiser: false })} /> {t('morningNo')}
            </label>
          </div>
        </>
      )}

      <p>
        {i > 0 ? (
          <button onClick={() => setI(i - 1)}>{t('quizBack')}</button>
        ) : (
          onBack && <button onClick={onBack}>{t('quizBack')}</button>
        )}
        {last ? (
          <button onClick={() => onDone(a)}>{doneLabel ?? t('quizDone')}</button>
        ) : (
          <button onClick={() => setI(i + 1)}>{t('quizNext')}</button>
        )}
        {onSkip && <button onClick={onSkip}>{t('quizSkip')}</button>}
      </p>
    </div>
  )
}
