import { useT } from '../i18n'
import './planning.css'

// A small popup over the dimmed screen while Meilu AI plans the days (it can take a few seconds): a turning ring and a line, so the
// traveler knows to just wait. Nothing under it can be touched.
export default function PlanningScreen() {
  const t = useT()
  return (
    <div className="popup-backdrop planning-backdrop" role="alertdialog" aria-modal="true" aria-busy="true" aria-labelledby="planning-title">
      <div className="popup-card planning-card">
        <span className="planning-ring" aria-hidden="true" />
        <h3 id="planning-title">{t('planningTitle')}</h3>
        <p>{t('planningWait')}</p>
      </div>
    </div>
  )
}
