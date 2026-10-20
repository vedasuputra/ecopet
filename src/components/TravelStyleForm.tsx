import { useT, type Key } from '../i18n'
import { BUDGETS, COMPANIES, INTERESTS, PACES, type Interest, type StyleAnswers } from '../lib/travelerStyle'
import './travelstyle.css'

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

export const STYLE_STEPS = ['pace', 'interests', 'company', 'budget', 'morning'] as const
export type StyleStep = (typeof STYLE_STEPS)[number]

// One question of "what kind of traveler are you?" (the answers are buttons). Picking changes the style at once.
export default function TravelStyleForm({ style, onChange, step, disabled = false }: { style: StyleAnswers; onChange: (s: StyleAnswers) => void; step: StyleStep; disabled?: boolean }) {
  const t = useT()
  const toggle = (x: Interest) => onChange({ ...style, interests: style.interests.includes(x) ? style.interests.filter((y) => y !== x) : [...style.interests, x] })

  // a question with one answer: the answers are buttons side by side (two per row when there are many)
  const one = <T extends string>(question: Key, options: readonly T[], value: T | undefined, set: (v: T) => void) => (
    <fieldset className="tsf-q" disabled={disabled}>
      <legend>{t(question)}</legend>
      <div className={`tsf-choices${options.length === 4 ? ' two' : ' one'}`}>
        {options.map((o) => (
          <button key={o} className={`tsf-opt${value === o ? ' active' : ''}`} aria-pressed={value === o} onClick={() => set(o)}>
            {t(LABEL[o])}
          </button>
        ))}
      </div>
    </fieldset>
  )

  return (
    <div className="tsf">
      {step === 'pace' && one('qPace', PACES, style.pace, (v) => onChange({ ...style, pace: v }))}

      {step === 'interests' && (
        <fieldset className="tsf-q" disabled={disabled}>
          <legend>{t('qInterests')}</legend>
          <p className="tsf-sub">{t('quizPickAny')}</p>
          <div className="tsf-choices one">
            {INTERESTS.map((x) => {
              const on = style.interests.includes(x)
              return (
                <button key={x} className={`tsf-opt${on ? ' active' : ''}`} aria-pressed={on} onClick={() => toggle(x)}>
                  {on && (
                    <span className="mi" aria-hidden="true">
                      check
                    </span>
                  )}
                  {t(LABEL[x])}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      {step === 'company' && one('qCompany', COMPANIES, style.company, (v) => onChange({ ...style, company: v }))}
      {step === 'budget' && one('qBudget', BUDGETS, style.budget, (v) => onChange({ ...style, budget: v }))}

      {step === 'morning' && (
        <fieldset className="tsf-q" disabled={disabled}>
          <legend>{t('qMorning')}</legend>
          <p className="tsf-sub">{t('qMorningHint')}</p>
          <div className="tsf-choices one">
            <button className={`tsf-opt${style.earlyRiser === true ? ' active' : ''}`} aria-pressed={style.earlyRiser === true} onClick={() => onChange({ ...style, earlyRiser: true })}>
              {t('morningYes')}
            </button>
            <button className={`tsf-opt${style.earlyRiser === false ? ' active' : ''}`} aria-pressed={style.earlyRiser === false} onClick={() => onChange({ ...style, earlyRiser: false })}>
              {t('morningNo')}
            </button>
          </div>
        </fieldset>
      )}
    </div>
  )
}
