import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { consentRecord } from '../data/privacy'
import { useLang, useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { refreshEconomy } from '../store/economy'
import { loadRemote, startSync } from '../store/sync'
import { useAppStore } from '../store/useAppStore'

export default function Login() {
  const navigate = useNavigate()
  const t = useT()
  const { lang, setLang } = useLang()
  const { login, reset } = useAppStore()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // Already signed in (session restored): load the account and continue.
  useEffect(() => {
    supabase?.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user
      if (!u) return
      const had = await loadRemote(u.id)
      startSync(u.id)
      navigate(had && useAppStore.getState().activeQuestIds.length ? '/home' : '/onboarding', { replace: true })
    })
  }, [navigate])

  const submit = async () => {
    if (!supabase) return setMsg(t('supabaseMissing'))
    if (!email || password.length < 6) return setMsg(t('fillFields'))
    if (mode === 'signup' && !agree) return setMsg(t('consentRequired'))
    setBusy(true)
    setMsg('')

    const { data, error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { data: { name, ...consentRecord() } } })
        : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setBusy(false)
      return setMsg(error.message) // comes from Supabase, in English
    }
    if (!data.session || !data.user) {
      setBusy(false)
      return setMsg(t('confirmEmail'))
    }

    const had = await loadRemote(data.user.id)
    if (!had) {
      // New account: start clean so another user's cached data on this device doesn't leak in.
      reset()
      login(name.trim() || email.split('@')[0])
    }
    startSync(data.user.id)
    await refreshEconomy()
    setBusy(false)
    navigate(had && useAppStore.getState().activeQuestIds.length ? '/home' : '/onboarding')
  }

  return (
    <div>
      <p>
        {t('language')}:{' '}
        <button onClick={() => setLang('en')} disabled={lang === 'en'}>
          English
        </button>
        <button onClick={() => setLang('vi')} disabled={lang === 'vi'}>
          Tiếng Việt
        </button>
      </p>
      <h1>Eco-Pet</h1>
      <p>{t('loginTagline')}</p>
      {mode === 'signup' && (
        <div>
          <input placeholder={t('name')} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      <div>
        <input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      {mode === 'signup' && (
        <p>
          <label>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> {t('consentAgree')}{' '}
            <Link to="/privacy" target="_blank">
              {t('privacyPolicy')}
            </Link>
          </label>
        </p>
      )}
      <button onClick={submit} disabled={busy}>
        {mode === 'signup' ? t('signUp') : t('signIn')}
      </button>
      <button onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
        {mode === 'signup' ? t('toSignIn') : t('toSignUp')}
      </button>
      {msg && <p>{msg}</p>}
    </div>
  )
}
