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

/** One line: "Open now, closes at 17:00" / "Closed now, opens Tuesday at 07:00" / "Opening hours not given". */
export default function ShopStatus({ hours }: { hours: OpenHours | null | undefined }) {
  const t = useT()
  const s = openStatus(hours)
  const text =
    s.state === 'unknown'
      ? t('shopHoursUnknown')
      : s.state === 'open'
        ? t('shopOpenNow', { t: s.closesAt })
        : !s.next
          ? t('shopClosedAlways')
          : s.next.today
            ? t('shopClosedToday', { t: s.next.time })
            : t('shopClosedLater', { d: t(DAY_KEY[s.next.day]), t: s.next.time })
  return <b>{text}</b>
}
