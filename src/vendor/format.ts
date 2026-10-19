import type { Lang } from '../i18n'

export const localeOf = (lang: Lang) => (lang === 'vi' ? 'vi-VN' : 'en-GB')

export const num = (n: number, lang: Lang) => Math.round(n).toLocaleString(localeOf(lang))
export const vnd = (n: number, lang: Lang) => `${num(n, lang)} VND`
export const pct = (x: number) => `${Math.round(x * 100)}%`

export const dateShort = (iso: string | Date, lang: Lang) =>
  new Date(iso).toLocaleDateString(localeOf(lang), { day: '2-digit', month: 'short' })

export const dateTime = (iso: string | Date, lang: Lang) =>
  new Date(iso).toLocaleString(localeOf(lang), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const dateLong = (iso: string | Date, lang: Lang) =>
  new Date(iso).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long', year: 'numeric' })

/** Anonymous traveler tag: last 4 of the coupon uid. Vendors never see who the traveler is. */
export const travelerTag = (uid: string) => uid.slice(-4)
