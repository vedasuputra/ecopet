import { useCallback, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { supabase } from '../lib/supabase'
import type { VendorCtx } from './context'
import type { IssuedRow, VendorInfo } from './data'

const REFRESH_MS = 8000

type Auth = { status: 'loading' } | { status: 'out' } | { status: 'ready'; vendor: VendorInfo; userId: string }

// Gate + chrome for the dashboard: loads the signed-in vendor account, its business and its
// coupon ledger (RLS only returns this business's rows), refreshes every few seconds.
export default function VendorShell() {
  const t = useT()
  const navigate = useNavigate()
  const [auth, setAuth] = useState<Auth>({ status: 'loading' })
  const [rows, setRows] = useState<IssuedRow[]>([])

  const loadRows = useCallback(async (vendorId: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('coupons_issued')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('issued_at', { ascending: false })
      .limit(2000)
    if (data) setRows(data as IssuedRow[])
  }, [])

  useEffect(() => {
    let dead = false
    ;(async () => {
      if (!supabase) return setAuth({ status: 'out' })
      const { data: sess } = await supabase.auth.getSession()
      const user = sess.session?.user
      if (!user) return setAuth({ status: 'out' })

      const { data: acct } = await supabase.from('accounts').select('role,vendor_id').eq('id', user.id).maybeSingle()
      if (!acct || acct.role !== 'vendor' || !acct.vendor_id) return setAuth({ status: 'out' })

      const { data: vendor } = await supabase.from('vendors').select('*').eq('id', acct.vendor_id).maybeSingle()
      if (dead) return
      if (!vendor) return setAuth({ status: 'out' })
      setAuth({ status: 'ready', vendor: vendor as VendorInfo, userId: user.id })
      await loadRows(vendor.id)
    })()
    return () => {
      dead = true
    }
  }, [loadRows])

  const vendorId = auth.status === 'ready' ? auth.vendor.id : null
  useEffect(() => {
    if (!vendorId) return
    const id = setInterval(() => void loadRows(vendorId), REFRESH_MS)
    return () => clearInterval(id)
  }, [vendorId, loadRows])

  if (auth.status === 'loading') return <p style={{ padding: 24 }}>{t('vLoading')}</p>
  if (auth.status === 'out') return <Navigate to="/vendor/login" replace />

  const { vendor } = auth
  const ctx: VendorCtx = { vendor, rows, reload: () => loadRows(vendor.id) }

  const signOut = async () => {
    await supabase?.auth.signOut()
    navigate('/vendor/login', { replace: true })
  }

  return <VendorChrome vendor={vendor} ctx={ctx} onSignOut={signOut} />
}

/** Sidebar / mobile drawer / top bar around the pages. Pure UI, no data loading. */
export function VendorChrome({ vendor, ctx, onSignOut }: { vendor: VendorInfo; ctx: VendorCtx; onSignOut: () => void }) {
  const t = useT()
  const { lang, setLang } = useLang()
  const [menu, setMenu] = useState(false)
  const close = () => setMenu(false)

  const items = [
    { to: '/vendor', label: t('vOverview'), end: true },
    { to: '/vendor/scan', label: t('vScan') },
    { to: '/vendor/redemptions', label: t('vRedemptions') },
    { to: '/vendor/fees', label: t('vFees') },
  ]

  return (
    <div className="v-layout">
      <div className="v-topbar">
        <button className="v-btn small" onClick={() => setMenu(true)} aria-label={t('vMenu')}>
          ☰ {t('vMenu')}
        </button>
        <strong>{vendor.name}</strong>
      </div>
      <div className={`v-backdrop ${menu ? 'open' : ''}`} onClick={close} />

      <aside className={`v-side ${menu ? 'open' : ''}`}>
        <div className="v-brand">
          <img src="/icon-192.png" alt="" />
          Eco-Pet
        </div>
        <div className="v-biz">
          <b>{vendor.name}</b>
          {lang === 'vi' ? vendor.category_vi : vendor.category_en}
        </div>
        <nav className="v-nav">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} onClick={close}>
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="v-side-bottom">
          <div className="v-lang" role="group" aria-label={t('vLanguage')}>
            <button className="v-btn small" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
              English
            </button>
            <button className="v-btn small" aria-pressed={lang === 'vi'} onClick={() => setLang('vi')}>
              Tiếng Việt
            </button>
          </div>
          <button className="v-btn" onClick={onSignOut}>
            {t('vSignOut')}
          </button>
        </div>
      </aside>

      <main className="v-main">
        <Outlet context={ctx} />
      </main>
    </div>
  )
}
