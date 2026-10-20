import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { stripDayPrefix } from '../lib/planner'
import { useAppStore, vnDay } from '../store/useAppStore'

const dayIndex = (start: string, today: string) => Math.round((Date.parse(today) - Date.parse(start)) / 86_400_000) + 1

// Under the chat box on Home: which day of the trip it is, and what is planned for it. Only shown when the traveler told us
// about the trip (the places they go to and how many days).
export default function TripOverview() {
  const t = useT()
  const user = useAppStore((s) => s.user)
  const itinerary = useAppStore((s) => s.itinerary)
  const questStatus = useAppStore((s) => s.questStatus)

  if (!user) return null
  // no trip yet: an invitation to plan one (the trip lives on Home and in Profile now, not in the bottom bar)
  if (user.destinations.length === 0) {
    return (
      <Link to="/onboarding" className="trip-card">
        <span className="trip-card-badge" aria-hidden="true">
          <span className="mi">route</span>
        </span>
        <span className="trip-card-text">
          <span className="trip-card-line trip-card-main">{t('tripPlanTitle')}</span>
          <span className="trip-card-line">{t('tripPlanBody')}</span>
        </span>
        <span className="mi trip-card-go" aria-hidden="true">
          chevron_right
        </span>
      </Link>
    )
  }
  // trips planned before the start date was saved: the day the plan was made
  const start = user.tripStart ?? (itinerary ? vnDay(new Date(itinerary.createdAt)) : null)
  if (!start) return null

  const day = dayIndex(start, vnDay(new Date()))
  const total = user.days // every traveler tells us how long they stay

  if (day < 1) return null
  if (day > total) {
    return (
      <Link to="/itinerary" className="trip-card">
        <span className="trip-card-text">
          <span className="trip-card-title">{t('dayOver')}</span>
        </span>
        <span className="mi trip-card-go" aria-hidden="true">
          chevron_right
        </span>
      </Link>
    )
  }

  const plan = itinerary?.days[day - 1]
  const quests = plan ? plan.questIds.filter((id) => questStatus[id] !== 'done').length : 0
  const shops = plan ? plan.vendorIds.length : 0
  // "Cai Rang Floating Market: Cai Rang Floating Market" said the same thing twice: the theme often already names the place
  const theme = plan ? stripDayPrefix(plan.theme) : ''
  const where = plan ? (theme.toLowerCase().includes(plan.destination.toLowerCase()) ? theme : `${plan.destination}: ${theme}`) : ''

  return (
    <Link to="/itinerary" className="trip-card">
      <span className="trip-card-badge" aria-hidden="true">
        <span className="trip-card-day">DAY</span>
        <span className="trip-card-num">{day}</span>
      </span>
      <span className="trip-card-text">
        <span className="trip-card-line trip-card-main">{plan ? where : t('dayIn', { places: user.destinations.join(', ') })}</span>
        <span className="trip-card-line">{plan ? t('dayCounts', { q: quests, s: shops }) : t('dayPlanNone')}</span>
      </span>
      <span className="mi trip-card-go" aria-hidden="true">
        chevron_right
      </span>
    </Link>
  )
}
