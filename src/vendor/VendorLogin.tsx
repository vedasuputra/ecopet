import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang, useT, type Key } from '../i18n'
import { consentRecord } from '../data/privacy'
import { searchPlaces, type Place } from '../lib/geocode'
import { supabase } from '../lib/supabase'
import { errorKey, vendorApi } from './api'
import { COUPON_KINDS, type CouponCategory } from '../data/couponCategory'
import { KIND_KEY } from './kinds'
import { PLANS, type PlanId } from './data'

interface Listing {
  id: string
  name: string
  category_en: string
  category_vi: string
}

// Where to search places from when a new business picks its location (Mekong Delta centre).
const SEARCH_NEAR = { lat: 10.0452, lng: 105.7469 }

export default function VendorLogin() {
  const t = useT()
  const navigate = useNavigate()
  const { lang, setLang } = useLang()
  const [tab, setTab] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [listed, setListed] = useState(true) // claim a listed business vs add a new one
  const [vendorId, setVendorId] = useState('')
  const [plan, setPlan] = useState<PlanId>('monthly')
  const [bizName, setBizName] = useState('')
  const [catEn, setCatEn] = useState('')
  const [catVi, setCatVi] = useState('')
  const [kind, setKind] = useState<CouponCategory>('food_drink')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [picked, setPicked] = useState<{ label: string; lat: number; lng: number } | null>(null)
  const [agree, setAgree] = useState(false)
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

  // Debounced place search for a new business's location.
  useEffect(() => {
    if (listed || query.trim().length < 3 || picked) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(query.trim(), SEARCH_NEAR, ctrl.signal)
        .then(setResults)
        .catch(() => {})
    }, 400)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [query, listed, picked])

  const submit = async () => {
    if (!supabase) return setMsg(t('supabaseMissing'))
    if (!email || password.length < 6) return setMsg(t('vErrCredentials'))
    if (tab === 'register') {
      if (!agree) return setMsg(t('consentRequired'))
      if (listed && !vendorId) return setMsg(t('vErrPickBusiness'))
      if (!listed && (bizName.trim().length < 2 || catEn.trim().length < 2 || catVi.trim().length < 2 || !picked)) return setMsg(t('vErrNewBiz'))
    }
    setBusy(true)
    setMsg('')

    if (tab === 'register') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: consentRecord() } })
      if (error) {
        setBusy(false)
        return setMsg(error.message)
      }
      if (!data.session) {
        setBusy(false)
        return setMsg(t('confirmEmail'))
      }
      const r = await vendorApi(
        'register',
        listed
          ? { vendorId, plan }
          : { plan, newBusiness: { name: bizName, categoryEn: catEn, categoryVi: catVi, kind, lat: picked!.lat, lng: picked!.lng } },
      )
      setBusy(false)
      if (!r.ok) {
        await supabase.auth.signOut()
        const key: Key = r.error === 'already_claimed' || r.error === 'unreachable' ? errorKey(r.error) : r.error === 'bad_business' ? 'vErrNewBiz' : 'vErrRegister'
        return setMsg(t(key))
      }
      // new vendors land on the page where they pay for their plan
      return navigate('/vendor/billing', { replace: true })
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
            <img src="/icon-192.png?v=4" alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
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
            <div className="v-tabs" role="tablist">
              <button className={listed ? 'active' : ''} onClick={() => setListed(true)}>
                {t('vRegisterListed')}
              </button>
              <button className={!listed ? 'active' : ''} onClick={() => setListed(false)}>
                {t('vRegisterUnlisted')}
              </button>
            </div>

            {listed ? (
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
            ) : (
              <>
                <div className="v-field">
                  <label htmlFor="v-name">{t('vNewName')}</label>
                  <input id="v-name" className="v-input" maxLength={60} value={bizName} onChange={(e) => setBizName(e.target.value)} />
                </div>
                <div className="v-row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <div className="v-field" style={{ flex: 1 }}>
                    <label htmlFor="v-cen">{t('vNewCategoryEn')}</label>
                    <input id="v-cen" className="v-input" maxLength={40} value={catEn} onChange={(e) => setCatEn(e.target.value)} />
                  </div>
                  <div className="v-field" style={{ flex: 1 }}>
                    <label htmlFor="v-cvi">{t('vNewCategoryVi')}</label>
                    <input id="v-cvi" className="v-input" maxLength={40} value={catVi} onChange={(e) => setCatVi(e.target.value)} />
                  </div>
                </div>
                <div className="v-field">
                  <label htmlFor="v-kind">{t('vKindLabel')}</label>
                  <select id="v-kind" className="v-select" value={kind} onChange={(e) => setKind(e.target.value as CouponCategory)}>
                    {COUPON_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(KIND_KEY[k])}
                      </option>
                    ))}
                  </select>
                  <span className="v-hint">{t('vKindHint')}</span>
                </div>
                <div className="v-field">
                  <label htmlFor="v-loc">{t('vNewLocation')}</label>
                  {picked ? (
                    <div className="v-row">
                      <span>{t('vPickedLocation', { place: picked.label })}</span>
                      <button className="v-btn small" onClick={() => { setPicked(null); setQuery('') }}>
                        {t('changeLocation')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <input id="v-loc" className="v-input" value={query} onChange={(e) => setQuery(e.target.value)} />
                      <span className="v-hint">{t('vNewLocationHint')}</span>
                      {results.map((p, i) => (
                        <button
                          key={`${p.lat},${p.lng},${i}`}
                          className="v-btn small"
                          style={{ textAlign: 'left', whiteSpace: 'normal' }}
                          onClick={() => setPicked({ label: p.area && p.area !== p.name ? `${p.name}, ${p.area}` : p.name, lat: p.lat, lng: p.lng })}
                        >
                          {p.name} <span className="v-hint">{p.detail}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}

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
            <div className="v-field">
              <label>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> {t('consentAgree')}{' '}
                <Link to="/privacy" target="_blank">
                  {t('privacyPolicy')}
                </Link>
              </label>
            </div>
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
