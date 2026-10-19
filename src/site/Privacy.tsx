import { useEffect } from 'react'
import { useLoc, useT } from '../i18n'
import { PRIVACY, PRIVACY_NOTICE, PRIVACY_UPDATED } from './content'
import SiteLayout from './SiteLayout'

// The privacy policy the sign-up forms link to. Content lives in site/content.ts (both languages).
export default function Privacy() {
  const t = useT()
  const loc = useLoc()
  useEffect(() => {
    document.title = 'Privacy Policy · Eco-Pet'
  }, [])

  return (
    <SiteLayout>
      <main className="s-wrap">
        <article className="s-doc">
          <h1>{t('privacyTitle')}</h1>
          <p>{loc(PRIVACY_UPDATED)}</p>
          <div className="s-notice">{loc(PRIVACY_NOTICE)}</div>
          {PRIVACY.map((s, i) => (
            <section key={i}>
              <h2>{loc(s.title)}</h2>
              {s.paragraphs?.map((p, j) => <p key={j}>{loc(p)}</p>)}
              {s.bullets && (
                <ul>
                  {s.bullets.map((b, j) => (
                    <li key={j}>{loc(b)}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </main>
    </SiteLayout>
  )
}
