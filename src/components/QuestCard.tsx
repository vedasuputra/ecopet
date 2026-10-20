import { Link } from 'react-router-dom'
import { QUEST_ICON } from '../data/questIcons'
import type { QuestType } from '../data/quests'
import { useT } from '../i18n'
import './questcard.css'

// One quest as a card (Home and the Quests screen): an icon for the kind of quest, the title, where it is, and the coins it
// pays. A quest tied to a place has a blue tint from the right, a quest for anywhere a warm sand one. A quest that is done or
// waiting for a review shows that instead of the coins.
export default function QuestCard({
  to,
  title,
  place,
  general,
  type,
  reward,
  state,
  pinned = false,
  fromHome = false,
}: {
  to: string
  title: string
  place: string
  general: boolean
  type: QuestType
  reward: number
  state?: 'done' | 'review'
  pinned?: boolean
  fromHome?: boolean // opened from Home: the popup then stays over Home
}) {
  const t = useT()
  return (
    <li className={`qcard ${general ? 'is-general' : 'is-specific'}${state === 'done' ? ' is-done' : ''}${pinned ? ' is-pinned' : ''}`}>
      <Link to={to} state={fromHome ? { from: 'home' } : undefined} className="qcard-main">
        <span className="qcard-icon" aria-hidden="true">
          <span className="mi">{QUEST_ICON[type]}</span>
        </span>
        <span className="qcard-text">
          <span className="qcard-title">
            {pinned && (
              <span className="mi qcard-pin" aria-label={t('questPinned')} title={t('questPinned')}>
                push_pin
              </span>
            )}
            <span className="qcard-title-text">{title}</span>
          </span>
          <span className="qcard-meta">
            <span className="mi" aria-hidden="true">
              {general ? 'near_me' : 'location_on'}
            </span>
            <span className="qcard-place">{place}</span>
          </span>
        </span>
        {state === 'done' ? (
          <span className="qcard-end qcard-state is-done">
            <span className="mi" aria-hidden="true">
              check_circle
            </span>
            {t('questStateDone')}
          </span>
        ) : state === 'review' ? (
          <span className="qcard-end qcard-state">
            <span className="mi" aria-hidden="true">
              schedule
            </span>
            {t('questStateReview')}
          </span>
        ) : (
          <span className="qcard-end qcard-reward" aria-label={t('rewardCoins', { n: reward })} title={t('rewardCoins', { n: reward })}>
            <span className="mi" aria-hidden="true">
              monetization_on
            </span>
            +{reward}
          </span>
        )}
      </Link>
    </li>
  )
}
