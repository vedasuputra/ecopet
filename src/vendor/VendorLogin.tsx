import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { errorKey, vendorApi } from './api'
import { PLANS, type PlanId } from './data'

interface Listing {
  id: string
  name: string
  category_en: string
  category_vi: string
}

export default function VendorLogin() {
  const t = useT()
  const navigate = useNavigate()
  const { lang, setLang } = useLang()
  const [tab, setTab] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [vendorId, setVendorId] = useState('')
  const [plan, setPlan] = useState<PlanId>('monthly')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // Unclaimed businesses available to register (vendors table is public-readable).
  useEffect(() => {
    supabase
      ?.from('vendors')
      .select('id,name,category_en,category_vi')
      .is('owner_id', null)
      .order('name')
      .then(({ data }) => setListings((data as Listing[]) ?? []))
  }, [tab])

  // Already signed in as a vendor? Go straight in.
  useEffect(() => {
    ;(async () => {
      if (!supabase) return
      const { data: sess } = await supabase.auth.getSession()
      const u = sess.session?.user
      if (!u) return
      const { data: acct } = await supabase.from('accounts').select('role').eq('id', u.id).maybeSingle()
      if (acct?.role === 'vendor') navigate('/vendor', { replace: true })
    })()
  }, [navigate])

  const submit = async () => {
    if (!supabase) return setMsg(t('supabaseMissing'))
    if (!email || password.length < 6) return setMsg(t('vErrCredentials'))
    if (tab === 'register' && !vendorId) return setMsg(t('vErrPickBusiness'))
    setBusy(true)
    setMsg('')

    if (tab === 'register') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setBusy(false)
        return setMsg(error.message)
      }
      if (!data.session) {
        setBusy(false)
        return setMsg(t('confirmEmail'))
      }
      const r = await vendorApi('register', { vendorId, plan })
      setBusy(false)
      if (!r.ok) {
        await supabase.auth.signOut()
        return setMsg(t(r.error === 'already_claimed' || r.error === 'unreachable' ? errorKey(r.error) : 'vErrRegister'))
      }
      return navigate('/vendor', { replace: true })
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setBusy(false)
      return setMsg(error?.message ?? t('vErrGeneric'))
    }
    const { data: acct } = await supabase.from('accounts').select('role').eq('id', data.user.id).maybeSingle()
    if (acct?.role !== 'vendor') {
      await supabase.auth.signOut()
      setBusy(false)
      return setMsg(t('vNotVendor'))
    }
    setBusy(false)
    navigate('/vendor', { replace: true })
  }

  return (
    <div className="v-login">
      <div className="v-login-card">
        <div className="v-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="v-brand" style={{ padding: 0 }}>
            <img src="/icon-192.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            Eco-Pet
          </div>
          <div className="v-lang" role="group">
            <button className="v-btn small" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
              EN
            </button>
            <button className="v-btn small" aria-pressed={lang === 'vi'} onClick={() => setLang('vi')}>
              VI
            </button>
          </div>
        </div>

        <h1>{t('vLoginTitle')}</h1>
        <p className="v-sub">{t('vLoginSub')}</p>

        <div className="v-tabs" role="tablist">
          <button className={tab === 'signin' ? 'active' : ''} onClick={() => setTab('signin')}>
            {t('vTabSignIn')}
          </button>
          <button className={tab === 'register' ? 'active' : ''} onClick={() => setTab('register')}>
            {t('vTabRegister')}
          </button>
        </div>

        <div className="v-field">
          <label htmlFor="v-email">{t('email')}</label>
          <input id="v-email" className="v-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="v-field">
          <label htmlFor="v-pass">{t('password')}</label>
          <input
            id="v-pass"
            className="v-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        {tab === 'register' && (
          <>
            <div className="v-field">
              <label htmlFor="v-biz">{t('vChooseBusiness')}</label>
              <select id="v-biz" className="v-select" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                <option value="">{t('vChoosePlaceholder')}</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({lang === 'vi' ? l.category_vi : l.category_en})
                  </option>
                ))}
              </select>
              {listings.length === 0 && <span className="v-hint">{t('vNoBusinesses')}</span>}
            </div>
            <div className="v-field">
              <label htmlFor="v-plan">{t('vPlan')}</label>
              <select id="v-plan" className="v-select" value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
                {(Object.keys(PLANS) as PlanId[]).map((p) => (
                  <option key={p} value={p}>
                    {t(p === 'monthly' ? 'vPlanMonthly' : p === 'semester' ? 'vPlanSemester' : 'vPlanAnnual')} —{' '}
                    {t('vPerMonth', { n: PLANS[p].perMonth.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB') })}
                  </option>
                ))}
              </select>
            </div>
            <p className="v-hint" style={{ marginBottom: 12 }}>
              {t('vPrototypeNote')}
            </p>
          </>
        )}

        {msg && <p className="v-error">{msg}</p>}
        <button className="v-btn primary" style={{ width: '100%' }} onClick={submit} disabled={busy}>
          {tab === 'register' ? t('vRegisterBtn') : t('vSignInBtn')}
        </button>
      </div>
    </div>
  )
}
