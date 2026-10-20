import { Link, useNavigate } from 'react-router-dom'
import BannerAd from '../components/BannerAd'
import LocationPanel from '../components/LocationPanel'
import MeiluAvatar from '../components/MeiluAvatar'
import { useLang, useLoc, useT, type Lang } from '../i18n'
import { supabase } from '../lib/supabase'
import { stopSync } from '../store/sync'
import { economyApi } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'

const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
]

export default function Profile() {
  const quests = useCatalog((s) => s.quests)
  const loc = useLoc()
  const navigate = useNavigate()
  const t = useT()
  const { lang, setLang } = useLang()
  const { user, coins, questStatus, reset } = useAppStore()
  const placeQuests = quests.filter((q) => q.scope !== 'general')

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

  return (
    <div>
      <MeiluAvatar interactive />
      <small>{t('petHint')}</small>
      <h2>{user?.name}</h2>
      <p>
        {t('stays', { days: user?.days ?? 1, dest: user?.destinations.join(', ') || '-' })}
      </p>
      <p>{t('profileStats', { coins, quests: Object.keys(questStatus).length })}</p>
      <Link to="/trip-card">{t('tripCardLink')}</Link> | <Link to="/ad">{t('watchAdLink')}</Link> |{' '}
      <Link to="/itinerary">{t('openItinerary')}</Link> | <Link to="/onboarding">{t('changePlan')}</Link>

      <section>
        <h3>{t('settingsLocation')}</h3>
        <p>
          <small>{t('settingsLocationHint')}</small>
        </p>
        <LocationPanel />
        <p>
          <label>
            {t('simulatePickQuest')}{' '}
            <select
              value=""
              onChange={(e) => {
                const q = placeQuests.find((x) => x.id === e.target.value)
                if (q) useLocation.getState().setSimulated(q.lat, q.lng, q.destination)
              }}
            >
              <option value="">{t('pickQuestSpot')}</option>
              {placeQuests.map((q) => (
                <option key={q.id} value={q.id}>
                  {loc(q.title)} ({q.destination})
                </option>
              ))}
            </select>
          </label>
        </p>
      </section>

      <div>
        <p>{t('language')}:</p>
        {LANGUAGES.map((l) => (
          <button key={l.code} onClick={() => setLang(l.code)} disabled={lang === l.code}>
            {l.label}
          </button>
        ))}
      </div>

      <div>
        <button onClick={logout}>{t('logout')}</button>
      </div>
      <p>
        <Link to="/privacy">{t('privacyPolicy')}</Link>
      </p>
      <BannerAd />
      <div>
        <button onClick={() => void deleteAccount()}>{t('deleteAccount')}</button>
      </div>
    </div>
  )
}
