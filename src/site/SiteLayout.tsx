import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT_EMAIL } from '../data/privacy'
import { useLang, useT } from '../i18n'
import './site.css'

// Frame for the public pages: header with navigation + language switch, footer with the legal links.
export default function SiteLayout({ children }: { children: ReactNode }) {
  const t = useT()
  const { lang, setLang } = useLang()
  return (
    <div className="s-app">
      <header className="s-header">
        <div className="s-wrap">
          <Link to="/" className="s-brand">
            <img src="/icon-192.png?v=2" alt="" /> Eco-Pet
          </Link>
          <nav className="s-nav">
            <Link to="/vendor/login">{t('siteNavVendors')}</Link>
            <Link to="/privacy">{t('siteNavPrivacy')}</Link>
            <span className="s-lang" role="group" aria-label={t('language')}>
              <button className="s-btn small" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
                EN
              </button>
              <button className="s-btn small" aria-pressed={lang === 'vi'} onClick={() => setLang('vi')}>
                VI
              </button>
            </span>
            <Link to="/login" className="s-btn primary small">
              {t('siteOpenApp')}
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="s-footer">
        <div className="s-wrap">
          <div>
            <b>Eco-Pet</b>
            <div>{t('siteFooter')}</div>
            <div>{t('siteContactUs', { email: CONTACT_EMAIL })}</div>
          </div>
          <nav>
            <Link to="/">{t('siteNavHome')}</Link>
            <Link to="/login">{t('siteOpenApp')}</Link>
            <Link to="/vendor/login">{t('siteNavVendors')}</Link>
            <Link to="/privacy">{t('siteNavPrivacy')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
