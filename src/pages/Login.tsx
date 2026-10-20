import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { consentRecord } from '../data/privacy'
import { useLang, useT } from '../i18n'
import { openInBrowser } from '../lib/openExternal'
import { supabase } from '../lib/supabase'
import { applyReferral, refreshEconomy } from '../store/economy'
import { loadRemote, startSync } from '../store/sync'
import { useAppStore, type TravelerOrigin } from '../store/useAppStore'
import './login.css'

const PENDING_REF = 'ecopet.pendingReferral'

export default function Login() {
  const navigate = useNavigate()
  const t = useT()
  const { lang, setLang } = useLang()
  const { login, reset } = useAppStore()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [origin, setOrigin] = useState<TravelerOrigin | ''>('')
  const [agree, setAgree] = useState(false)
  const [referral, setReferral] = useState('') // a friend's code (optional)
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
    if (mode === 'signup' && !origin) return setMsg(t('originRequired'))
    if (mode === 'signup' && !agree) return setMsg(t('consentRequired'))
    setBusy(true)
    setMsg('')

    const { data, error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { data: { name, traveler_type: origin, ...consentRecord() } } })
        : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setBusy(false)
      return setMsg(error.message) // comes from Supabase, in English
    }
    if (!data.session || !data.user) {
      setBusy(false)
      // the account is made but must be confirmed by e-mail first: the code is kept for the first sign-in
      if (mode === 'signup' && referral.trim()) {
        try {
          localStorage.setItem(PENDING_REF, referral.trim())
        } catch {
          /* private window: the code is simply not kept */
        }
      }
      return setMsg(t('confirmEmail'))
    }

    const had = await loadRemote(data.user.id)
    if (!had) {
      // New account: start clean so another user's cached data on this device doesn't leak in.
      reset()
      login(name.trim() || email.split('@')[0], origin || undefined)
    }
    startSync(data.user.id)

    // a referral code (typed now, or kept from the sign-up that had to be confirmed by e-mail): 20 bonus coins
    let pending = ''
    try {
      pending = (mode === 'signup' ? referral.trim() : '') || localStorage.getItem(PENDING_REF) || ''
      localStorage.removeItem(PENDING_REF)
    } catch {
      pending = mode === 'signup' ? referral.trim() : ''
    }
    if (pending) {
      const r = await applyReferral(pending)
      if (r.ok) setMsg(t('refApplied'))
      else {
        setMsg(r.error === 'invalid_code' ? t('refInvalid') : r.error === 'own_code' ? t('refOwn') : r.error === 'already_used' ? t('refUsed') : t('refFailed'))
        await new Promise((res) => setTimeout(res, 1800)) // long enough to read it before the next screen
      }
    }
    await refreshEconomy()
    setBusy(false)
    navigate(had && useAppStore.getState().activeQuestIds.length ? '/home' : '/onboarding')
  }

  return (
    <div className="lg-page">
      <div className="lg-lang" role="group" aria-label={t('language')}>
        <button className={lang === 'en' ? 'active' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
          EN
        </button>
        <button className={lang === 'vi' ? 'active' : ''} aria-pressed={lang === 'vi'} onClick={() => setLang('vi')}>
          VI
        </button>
      </div>

      <form
        className="lg-card"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="lg-brand">
          <h1>Eco-Pet</h1>
          <p>{t('loginTagline')}</p>
        </div>

        <h2 className="lg-title">{mode === 'signup' ? t('signUp') : t('signIn')}</h2>

        {mode === 'signup' && <input className="lg-input" placeholder={t('name')} aria-label={t('name')} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
        <input className="lg-input" type="email" placeholder={t('email')} aria-label={t('email')} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          className="lg-input"
          type="password"
          placeholder={t('password')}
          aria-label={t('password')}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {mode === 'signup' && (
          <fieldset className="lg-origin">
            <legend>{t('originQ')}</legend>
            <div>
              {(['domestic', 'international'] as const).map((o) => (
                <button type="button" key={o} className={origin === o ? 'active' : ''} aria-pressed={origin === o} onClick={() => setOrigin(o)}>
                  {t(o === 'domestic' ? 'originDomesticShort' : 'originInternationalShort')}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {mode === 'signup' && (
          <input
            className="lg-input"
            placeholder={t('refSignupLabel')}
            aria-label={t('refSignupLabel')}
            autoCapitalize="characters"
            maxLength={12}
            value={referral}
            onChange={(e) => setReferral(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
        )}

        {mode === 'signup' && (
          <label className="lg-consent">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              {t('consentAgree')}{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                {t('privacyPolicy')}
              </Link>
            </span>
          </label>
        )}

        {msg && <p className="lg-msg">{msg}</p>}

        <button type="submit" className="lg-btn" disabled={busy}>
          {mode === 'signup' ? t('signUp') : t('signIn')}
        </button>
        <button
          type="button"
          className="lg-switch"
          onClick={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup')
            setMsg('')
          }}
        >
          {mode === 'signup' ? t('toSignIn') : t('toSignUp')}
        </button>
      </form>

      {/* the dashboards of the shops and of the team are web pages of their own: they open in the browser */}
      <nav className="lg-links" aria-label="Eco-Pet">
        <a
          href="/vendor"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault()
            openInBrowser('/vendor')
          }}
        >
          {t('siteNavVendors')}
        </a>
        <span aria-hidden="true">·</span>
        <a
          href="/admin"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault()
            openInBrowser('/admin')
          }}
        >
          {t('siteNavAdmin')}
        </a>
      </nav>
    </div>
  )
}
