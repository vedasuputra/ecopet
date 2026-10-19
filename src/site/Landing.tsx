import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLoc, useT } from '../i18n'
import { LANDING as C } from './content'
import SiteLayout from './SiteLayout'

// The public front page: explains Eco-Pet in plain words, for travelers, shop owners and reviewers.
export default function Landing() {
  const t = useT()
  const loc = useLoc()
  useEffect(() => {
    document.title = 'Eco-Pet: sustainable travel rewards in the Mekong Delta'
  }, [])

  return (
    <SiteLayout>
      <main>
        <div className="s-wrap">
          <section className="s-hero">
            <div>
              <h1>{loc(C.heroTitle)}</h1>
              <p>{loc(C.heroText)}</p>
              <div className="s-actions">
                <Link to="/login" className="s-btn primary">
                  {t('siteOpenApp')}
                </Link>
                <Link to="/vendor/login" className="s-btn">
                  {t('siteVendorCta')}
                </Link>
              </div>
              <p className="s-pilot">{loc(C.pilot)}</p>
            </div>
            <img src="/meilu.png" alt="Meilu, the Eco-Pet bird guide" />
          </section>

          <section className="s-section">
            <h2>{loc(C.howTitle)}</h2>
            <div className="s-steps">
              {C.steps.map((s, i) => (
                <div className="s-card" key={i}>
                  <span className="s-num">{i + 1}</span>
                  <h3>{loc(s.title)}</h3>
                  <p>{loc(s.text)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="s-section">
            <div className="s-two">
              <img src="/meilu.png" alt="" />
              <div>
                <h2>{loc(C.meiluTitle)}</h2>
                <p>{loc(C.meiluText)}</p>
              </div>
            </div>
          </section>

          <section className="s-section">
            <h2>{loc(C.vendorsTitle)}</h2>
            <p>{loc(C.vendorsText)}</p>
            <ul className="s-list">
              {C.vendorBullets.map((b, i) => (
                <li key={i}>{loc(b)}</li>
              ))}
            </ul>
            <p>
              <Link to="/vendor/login" className="s-btn primary" style={{ marginTop: 16 }}>
                {t('siteVendorCta')}
              </Link>
            </p>
          </section>

          <section className="s-section">
            <h2>{loc(C.deltaTitle)}</h2>
            {C.deltaParagraphs.map((p, i) => (
              <p key={i}>{loc(p)}</p>
            ))}
          </section>

          <section className="s-section s-faq">
            <h2>{loc(C.faqTitle)}</h2>
            {C.faq.map((f, i) => (
              <details key={i}>
                <summary>{loc(f.q)}</summary>
                <p>
                  {loc(f.a)}{' '}
                  {i === 3 && <Link to="/privacy">{t('siteNavPrivacy')}</Link>}
                </p>
              </details>
            ))}
          </section>
        </div>
      </main>
    </SiteLayout>
  )
}
