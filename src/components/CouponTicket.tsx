import { Link } from 'react-router-dom'
import { COUPON_CATEGORY_ICON, type CouponCategory } from '../data/couponCategory'
import { useT } from '../i18n'
import './ticket.css'

type State = 'owned' | 'used' | 'expired' | 'soldout'

// One coupon as a ticket. `state` says what the stub shows: the price (default), a QR icon (a coupon you have and can show),
// or a word for a ticket that cannot be used (used, expired, sold out). Colour and icon follow the category of the shop.
export default function CouponTicket({
  to,
  title,
  shop,
  distance,
  expires,
  category,
  deal,
  dealIsWord = false,
  cost,
  coins,
  state,
  fromHome = false,
  linkState,
  lit = false,
  faded = false,
}: {
  to?: string // without it the ticket is not a link (the welcome gift shows tickets to look at)
  title: string
  shop: string
  distance?: string
  expires?: string
  category: CouponCategory
  deal: string
  dealIsWord?: boolean
  cost?: number
  coins?: number
  state?: State
  fromHome?: boolean // opened from Home: the popup then stays over Home
  linkState?: unknown // opened from another popup (a shop): the popup comes back there when it is closed
  lit?: boolean // highlighted (the one the spin is on)
  faded?: boolean // the others once the spin has landed
}) {
  const t = useT()
  const dim = state === 'used' || state === 'expired' || state === 'soldout'
  const word = state === 'used' ? t('couponUsedWord') : state === 'expired' ? t('couponExpiredWord') : state === 'soldout' ? t('couponSoldOutWord') : null
  return (
    <li className={`ticket-wrap cat-${category}${lit ? ' is-lit' : ''}${faded ? ' is-faded' : ''}`}>
      <Body to={to} state={linkState ?? (fromHome ? { from: 'home' } : undefined)} className={`ticket${dim ? ' is-dim' : ''}`}>
        <span className="mi ticket-cat" aria-hidden="true">
          {COUPON_CATEGORY_ICON[category]}
        </span>
        <span className="ticket-main">
          <span className="ticket-title">{title}</span>
          <span className="ticket-meta">
            <span className="mi" aria-hidden="true">
              storefront
            </span>
            <span className="ticket-shop">{shop}</span>
            {distance && <span className="ticket-dist">· {distance}</span>}
          </span>
          {expires && <span className="ticket-meta">{expires}</span>}
        </span>
        <span className="ticket-stub">
          <span className={`ticket-off${dealIsWord ? ' is-word' : ''}`}>{deal}</span>
          {word ? (
            <span className="ticket-state">{word}</span>
          ) : state === 'owned' && cost !== undefined ? (
            // a coupon you already bought: the price is shown faded, to say it is yours
            <span className="ticket-cost cost-paid" aria-label={t('costCoins', { n: cost })} title={t('costCoins', { n: cost })}>
              <span className="mi" aria-hidden="true">
                monetization_on
              </span>
              {cost}
            </span>
          ) : cost !== undefined && coins !== undefined ? (
            // green = you have enough coins, red = not yet
            <span className={`ticket-cost ${coins >= cost ? 'cost-ok' : 'cost-short'}`} aria-label={t('costCoins', { n: cost })} title={t('costCoins', { n: cost })}>
              <span className="mi" aria-hidden="true">
                monetization_on
              </span>
              {cost}
              {coins < cost && <span className="sr-only">{t('notEnoughCoins')}</span>}
            </span>
          ) : null}
        </span>
      </Body>
    </li>
  )
}

// the ticket itself: a link when it has a place to go to, otherwise a plain box
function Body({ to, state, className, children }: { to?: string; state?: unknown; className: string; children: React.ReactNode }) {
  return to ? (
    <Link to={to} state={state} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  )
}
