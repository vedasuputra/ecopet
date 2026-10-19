import { Link, useNavigate } from 'react-router-dom'
import MeiluAvatar from '../components/MeiluAvatar'
import { useLang, useT, type Lang } from '../i18n'
import { supabase } from '../lib/supabase'
import { stopSync } from '../store/sync'
import { useAppStore } from '../store/useAppStore'

const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
]

export default function Profile() {
  const navigate = useNavigate()
  const t = useT()
  const { lang, setLang } = useLang()
  const { user, coins, questStatus, reset } = useAppStore()

  const logout = async () => {
    stopSync()
    await supabase?.auth.signOut()
    reset() // clear this device's cache; the account's data stays in Supabase
    navigate('/login')
  }

  return (
    <div>
      <MeiluAvatar />
      <h2>{user?.name}</h2>
      <p>
        {t('stays', { days: user?.days ?? 1, dest: user?.destinations.join(', ') || '-' })}
      </p>
      <p>{t('profileStats', { coins, quests: Object.keys(questStatus).length })}</p>
      <Link to="/trip-card">{t('tripCardLink')}</Link> | <Link to="/ad">{t('watchAdLink')}</Link> |{' '}
      <Link to="/onboarding">{t('changePlan')}</Link>

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
    </div>
  )
}
