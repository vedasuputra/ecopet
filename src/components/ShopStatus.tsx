import type { Key } from '../i18n'
import { useT } from '../i18n'
import { openStatus, type Day, type OpenHours } from '../lib/openHours'

export const DAY_KEY: Record<Day, Key> = {
  mon: 'dayMon',
  tue: 'dayTue',
  wed: 'dayWed',
  thu: 'dayThu',
  fri: 'dayFri',
  sat: 'daySat',
  sun: 'daySun',
}
/** Short names of the days ("Wed", "T4"), for the one-line status. */
const DAY_SHORT: Record<Day, Key> = {
  mon: 'dayMonS',
  tue: 'dayTueS',
  wed: 'dayWedS',
  thu: 'dayThuS',
  fri: 'dayFriS',
  sat: 'daySatS',
  sun: 'daySunS',
}

/**
 * One short line: "Open · Closes @ 17:00" (Open in green), "Closed · Opens @ Wed 07:00" (Closed in red) or "Opening hours
 * not given".
 */
export default function ShopStatus({ hours, short = false }: { hours: OpenHours | null | undefined; short?: boolean }) {
  const t = useT()
  const s = openStatus(hours)
  // short: only the word, "Open" in green or "Closed" in red
  if (short && s.state !== 'unknown') return <span className="shop-status"><span className={s.state === 'open' ? 'st-open' : 'st-closed'}>{s.state === 'open' ? t('shopOpenWord') : t('shopClosedWord')}</span></span>
  if (s.state === 'unknown') return <span className="shop-status">{t('shopHoursUnknown')}</span>
  if (s.state === 'open')
    return (
      <span className="shop-status">
        <span className="st-open">{t('shopOpenWord')}</span> · {t('shopClosesAt', { t: s.closesAt })}
      </span>
    )
  if (!s.next)
    return (
      <span className="shop-status">
        <span className="st-closed">{t('shopClosedWord')}</span>
      </span>
    )
  return (
    <span className="shop-status">
      <span className="st-closed">{t('shopClosedWord')}</span> · {s.next.today ? t('shopOpensAt', { t: s.next.time }) : t('shopOpensDay', { d: t(DAY_SHORT[s.next.day]), t: s.next.time })}
    </span>
  )
}
