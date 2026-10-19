import { useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import en from './en'
import vendorEn from './vendor.en'
import vendorVi from './vendor.vi'
import vi from './vi'

export type Lang = 'en' | 'vi'
const enAll = { ...en, ...vendorEn }
export type Key = keyof typeof enAll
/** Text that exists in every supported language (used for quest/coupon content). */
export type Localized = Record<Lang, string>

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()(
  persist(
    (set) => ({
      lang: 'en', // default language
      setLang: (lang) => {
        document.documentElement.lang = lang
        set({ lang })
      },
    }),
    {
      name: 'ecopet-lang',
      onRehydrateStorage: () => (s) => {
        if (s) document.documentElement.lang = s.lang
      },
    },
  ),
)

const dict: Record<Lang, Record<Key, string>> = { en: enAll, vi: { ...vi, ...vendorVi } }

export function translate(lang: Lang, key: Key, params?: Record<string, string | number>): string {
  let s: string = dict[lang][key] ?? enAll[key]
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

/** t('key', { n: 5 }) in the current language. Re-renders when the language changes. */
export function useT() {
  const lang = useLang((s) => s.lang)
  return useCallback((key: Key, params?: Record<string, string | number>) => translate(lang, key, params), [lang])
}

/** Picks the current-language text from a Localized value. */
export function useLoc() {
  const lang = useLang((s) => s.lang)
  return useCallback((l: Localized) => l[lang] ?? l.en, [lang])
}
