import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BannerAd from '../components/BannerAd'
import SupportPopup from '../components/SupportPopup'
import { useLang, useT, type Lang } from '../i18n'
import { supabase } from '../lib/supabase'
import { stopSync } from '../store/sync'
import { economyApi } from '../lib/api'
import { isCouponExpired, useAppStore } from '../store/useAppStore'
import './profile.css'

const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
]

// A row of a list: a small icon, a label, and an arrow (a link) or a button.
function Row({ icon, label, to, onClick }: { icon: string; label: string; to?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="pf-row-ico" aria-hidden="true">
        <span className="mi">{icon}</span>
      </span>
      <span className="pf-row-label">{label}</span>
      <span className="mi pf-row-go" aria-hidden="true">
        chevron_right
      </span>
    </>
  )
  return (
    <li>
      {to ? (
        <Link className="pf-row" to={to}>
          {inner}
        </Link>
      ) : (
        <button className="pf-row" onClick={onClick}>
          {inner}
        </button>
      )}
    </li>
  )
}

// Profile: who you are (with Meilu, who can be petted), your numbers, the trip, the settings, help and the account.
export default function Profile() {
  const navigate = useNavigate()
  const t = useT()
  const { lang, setLang } = useLang()
  const { user, coins, questStatus, ownedCoupons, reset } = useAppStore()
  const [supportOpen, setSupportOpen] = useState(false)

  const logout = async () => {
    stopSync()
    await supabase?.auth.signOut()
    reset() // clear this device's cache; the account's data stays in Supabase
    navigate('/login')
  }

  const deleteAccount = async () => {
    if (!confirm(t('deleteConfirm'))) return
    const r = await economyApi('delete_account')
    if (r.error === 'vendor_account') return alert(t('deleteVendor'))
    if (!r.ok) return alert(t('deleteFailed'))
    stopSync()
    await supabase?.auth.signOut()
    reset()
    navigate('/login')
  }

  const done = Object.values(questStatus).filter((s) => s === 'done').length
  const coupons = ownedCoupons.filter((oc) => oc.status === 'unused' && !isCouponExpired(oc)).length
  // "2 days, 5 places"
  const nDays = user?.days ?? 1
  const nPlaces = user?.destinations.length ?? 0
  const stay = `${t(nDays === 1 ? 'profileDay' : 'profileDays', { n: nDays })}, ${t(nPlaces === 1 ? 'profilePlace' : 'profilePlaces', { n: nPlaces })}`

  return (
    <div className="pf-page">
      <div className="pf-body">
        <section className="pf-hero">
          <span className="pf-ava" aria-hidden="true">
            {(user?.name ?? '').trim().charAt(0).toUpperCase() || '?'}
          </span>
          <div className="pf-who">
            <h2 className="pf-name">{user?.name}</h2>
            <p className="pf-stay">{stay}</p>
          </div>
        </section>

        <ul className="pf-stats">
          <li>
            <span className="pf-stat-n pf-coins">
              <span className="mi" aria-hidden="true">
                monetization_on
              </span>
              {coins}
            </span>
            <span className="pf-stat-l">{t('profileStatCoins')}</span>
          </li>
          <li>
            <span className="pf-stat-n">{done}</span>
            <span className="pf-stat-l">{t('profileStatQuests')}</span>
          </li>
          <li>
            <span className="pf-stat-n">{coupons}</span>
            <span className="pf-stat-l">{t('profileStatCoupons')}</span>
          </li>
        </ul>

        <h3 className="pf-title">{t('profileTrip')}</h3>
        <ul className="pf-list">
          <Row icon="route" label={t('myTripTitle')} to="/itinerary" />
          <Row icon="badge" label={t('tripCardLink')} to="/trip-card" />
          <Row icon="play_circle" label={t('watchAdLink')} to="/ad" />
        </ul>

        <h3 className="pf-title">{t('profileSettings')}</h3>
        <ul className="pf-list">
          {user?.origin && (
            <li className="pf-line">
              <span className="pf-row-ico" aria-hidden="true">
                <span className="mi">swap_horiz</span>
              </span>
              <span className="pf-row-label">{t('profileTraveler')}</span>
              <span className="pf-seg" role="group" aria-label={t('profileTraveler')}>
                {(['domestic', 'international'] as const).map((o) => (
                  <button key={o} className={user.origin === o ? 'active' : ''} aria-pressed={user.origin === o} onClick={() => useAppStore.getState().setOrigin(o)}>
                    {t(o === 'domestic' ? 'originDomesticShort' : 'originInternationalShort')}
                  </button>
                ))}
              </span>
            </li>
          )}
          <li className="pf-line">
            <span className="pf-row-ico" aria-hidden="true">
              <span className="mi">translate</span>
            </span>
            <span className="pf-row-label">{t('language')}</span>
            <span className="pf-seg" role="group" aria-label={t('language')}>
              {LANGUAGES.map((l) => (
                <button key={l.code} className={lang === l.code ? 'active' : ''} aria-pressed={lang === l.code} onClick={() => setLang(l.code)}>
                  {l.label}
                </button>
              ))}
            </span>
          </li>
        </ul>

        <h3 className="pf-title">{t('profileHelp')}</h3>
        <ul className="pf-list">
          <Row icon="support_agent" label={t('profileSupport')} onClick={() => setSupportOpen(true)} />
          <Row icon="policy" label={t('privacyPolicy')} to="/privacy" />
        </ul>

        <ul className="pf-list pf-account">
          <Row icon="logout" label={t('logout')} onClick={() => void logout()} />
        </ul>
        <button className="pf-delete" onClick={() => void deleteAccount()}>
          <span className="mi" aria-hidden="true">
            delete
          </span>
          {t('deleteAccount')}
        </button>
      </div>
      <BannerAd />
      {supportOpen && <SupportPopup onClose={() => setSupportOpen(false)} />}
    </div>
  )
}
