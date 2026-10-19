import { useState } from 'react'
import { useLang, useT } from '../i18n'
import type { DayPoint } from './data'
import { dateShort } from './format'

// Grouped columns: coupons claimed vs redeemed per day. Two series, validated categorical colors
// (--series-1 / --series-2), legend + hover tooltip + a table view so color is never the only channel.
const W = 640
const H = 230
const M = { l: 34, r: 8, t: 10, b: 26 }
const BAR_MAX = 14
const GAP = 2 // surface gap between touching bars

const niceMax = (v: number) => (v <= 4 ? 4 : Math.ceil(v / 4) * 4)

/** Column path with a 4px rounded data-end and a square baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return ''
  const r = Math.min(4, h, w / 2)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

export default function DailyChart({ data }: { data: DayPoint[] }) {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const [hover, setHover] = useState<number | null>(null)

  const max = niceMax(Math.max(0, ...data.flatMap((d) => [d.claimed, d.redeemed])))
  const innerW = W - M.l - M.r
  const innerH = H - M.t - M.b
  const group = innerW / data.length
  const barW = Math.min(BAR_MAX, (group - 8 - GAP) / 2)
  const y = (v: number) => M.t + innerH - (v / max) * innerH
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max]

  const hovered = hover === null ? null : data[hover]

  return (
    <figure className="v-chart">
      <div className="v-legend" aria-hidden="false">
        <span>
          <i className="v-swatch v-s1" /> {t('vClaimed')}
        </span>
        <span>
          <i className="v-swatch v-s2" /> {t('vRedeemed')}
        </span>
      </div>

      <div className="v-chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('vChartTitle')} onMouseLeave={() => setHover(null)}>
          {ticks.map((tv) => (
            <g key={tv}>
              <line x1={M.l} x2={W - M.r} y1={y(tv)} y2={y(tv)} className="v-grid" />
              <text x={M.l - 6} y={y(tv) + 3} textAnchor="end" className="v-axis">
                {Math.round(tv)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const cx = M.l + group * i + group / 2
            const x1 = cx - barW - GAP / 2
            const x2 = cx + GAP / 2
            return (
              <g key={d.key}>
                {hover === i && <rect x={M.l + group * i} y={M.t} width={group} height={innerH} className="v-hoverband" />}
                <path d={barPath(x1, y(d.claimed), barW, innerH - (y(d.claimed) - M.t))} className="v-bar1" />
                <path d={barPath(x2, y(d.redeemed), barW, innerH - (y(d.redeemed) - M.t))} className="v-bar2" />
                {(data.length - 1 - i) % 2 === 0 || data.length < 8 ? (
                  <text x={cx} y={H - 8} textAnchor="middle" className="v-axis">
                    {dateShort(d.date, lang)}
                  </text>
                ) : null}
                {/* hit target: the whole day column, bigger than the bars */}
                <rect
                  x={M.l + group * i}
                  y={M.t}
                  width={group}
                  height={innerH + M.b}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onTouchStart={() => setHover(i)}
                />
              </g>
            )
          })}
        </svg>

        {hovered && hover !== null && (
          <div
            className="v-tooltip"
            style={{ left: `${((M.l + group * hover + group / 2) / W) * 100}%` }}
            role="status"
          >
            <b>{dateShort(hovered.date, lang)}</b>
            <div>
              <i className="v-swatch v-s1" /> {t('vClaimed')}: {hovered.claimed}
            </div>
            <div>
              <i className="v-swatch v-s2" /> {t('vRedeemed')}: {hovered.redeemed}
            </div>
          </div>
        )}
      </div>

      <details className="v-table-toggle">
        <summary>{t('vShowTable')}</summary>
        <div className="v-table-scroll">
          <table className="v-table">
            <thead>
              <tr>
                <th>{t('vDay')}</th>
                <th className="v-num">{t('vClaimed')}</th>
                <th className="v-num">{t('vRedeemed')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key}>
                  <td>{dateShort(d.date, lang)}</td>
                  <td className="v-num">{d.claimed}</td>
                  <td className="v-num">{d.redeemed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
