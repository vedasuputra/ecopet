import { useEffect, useRef, useState, type ReactNode } from 'react'
import './filterdropdown.css'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

// A pill button with a list that opens under it, to filter by one thing (a place, a category...) or to pick how the list is
// grouped. `prefix` is the name of the filter ("Location"), shown before the chosen value. The list is drawn with fixed
// position, so it floats over the content (it never pushes it down) and is not cut off by the sliding row it sits in. It closes
// when something is picked, when the focus leaves, and when the screen is scrolled. The first option is the "no filter" one.
export default function FilterDropdown({
  icon,
  prefix,
  value,
  options,
  onChange,
  label,
}: {
  icon: string
  prefix?: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  label: string
}) {
  const btn = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const current = options.find((o) => o.value === value) ?? options[0]
  const active = value !== options[0]?.value

  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [pos])

  const toggle = () => {
    if (pos) return setPos(null)
    const r = btn.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 228)) })
  }
  return (
    <>
      <button
        ref={btn}
        className={`fd-btn${active ? ' active' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={!!pos}
        aria-label={label}
        onClick={toggle}
        onBlur={() => setPos(null)}
      >
        <span className="mi" aria-hidden="true">
          {icon}
        </span>
        <span className="fd-label">
          {prefix ? `${prefix}: ` : ''}
          {current?.label}
        </span>
        <span className="mi" aria-hidden="true">
          expand_more
        </span>
      </button>
      {pos && (
        // mousedown must not take the focus away from the button, or the list would close before a click lands
        <ul className="fd-list" role="listbox" style={{ top: pos.top, left: pos.left }} onMouseDown={(e) => e.preventDefault()}>
          {options.map((o) => (
            <li key={o.value}>
              <button
                role="option"
                aria-selected={o.value === value}
                className={o.value === value ? 'active' : ''}
                onClick={() => {
                  onChange(o.value)
                  setPos(null)
                }}
              >
                <span>{o.label}</span>
                {o.count !== undefined && <span className="fd-n">{o.count}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// The row of dropdowns: edge to edge, and they slide sideways together.
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="fd-bar">
      <div className="fd-row" role="group">
        {children}
      </div>
    </div>
  )
}

// The search box and, next to it, a square button that clears the filters (faded while there is nothing to clear).
export function SearchRow({ children, canClear, onClear, clearLabel }: { children: ReactNode; canClear: boolean; onClear: () => void; clearLabel: string }) {
  return (
    <div className="fd-searchrow">
      {children}
      <button className="fd-clear" onClick={onClear} disabled={!canClear} aria-label={clearLabel} title={clearLabel}>
        <span className="mi" aria-hidden="true">
          filter_alt_off
        </span>
      </button>
    </div>
  )
}

// The title of a group in a grouped list.
export function GroupTitle({ label, n }: { label: string; n: number }) {
  return (
    <h3 className="grp-title">
      <span className="grp-name">{label}</span>
      <span className="grp-n">{n}</span>
    </h3>
  )
}

// Splits a list into groups, in the order the groups first appear (or in `order`, when it is given).
export function groupBy<T>(list: T[], keyOf: (x: T) => string, order?: string[]): { key: string; items: T[] }[] {
  const m = new Map<string, T[]>()
  for (const x of list) {
    const k = keyOf(x)
    m.set(k, [...(m.get(k) ?? []), x])
  }
  const keys = order ? order.filter((k) => m.has(k)) : [...m.keys()]
  return keys.map((key) => ({ key, items: m.get(key) ?? [] }))
}
