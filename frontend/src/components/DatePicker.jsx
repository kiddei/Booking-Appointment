import { useState, useEffect, useRef } from 'react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function parseISO(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDisplay(iso) {
  if (!iso) return 'Choose a date'
  const d = parseISO(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function DatePicker({ value, onChange, minISO, maxISO }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const minDate = minISO ? parseISO(minISO) : today
  const maxDate = maxISO ? parseISO(maxISO) : null

  const [open, setOpen]       = useState(false)
  const [view, setView]       = useState(() => {
    const d = value ? parseISO(value) : today
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const ref = useRef(null)

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const prevMonth = () => setView(v => v.month === 0  ? { year: v.year-1, month: 11 } : { ...v, month: v.month-1 })
  const nextMonth = () => setView(v => v.month === 11 ? { year: v.year+1, month: 0  } : { ...v, month: v.month+1 })

  const firstDow    = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()

  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const dayDate    = d => new Date(view.year, view.month, d)
  const isDisabled = d => dayDate(d) < minDate || (maxDate && dayDate(d) > maxDate)
  const isSelected = d => value && parseISO(value).getTime() === dayDate(d).getTime()
  const isToday    = d => today.getTime() === dayDate(d).getTime()

  const select = d => {
    if (isDisabled(d)) return
    onChange(toISO(dayDate(d)))
    setOpen(false)
  }

  return (
    <div className="datepicker" ref={ref}>
      <button
        type="button"
        className={`dp-trigger${open ? ' dp-trigger--open' : ''}${!value ? ' dp-trigger--empty' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <svg className="dp-cal-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className="dp-trigger-text">{fmtDisplay(value)}</span>
        <svg className="dp-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="dp-popup">
          <div className="dp-header">
            <button type="button" className="dp-nav-btn" onClick={prevMonth} aria-label="Previous month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span className="dp-month-label">{MONTHS[view.month]} {view.year}</span>
            <button type="button" className="dp-nav-btn" onClick={nextMonth} aria-label="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <div className="dp-weekdays">
            {DAYS.map(d => <span key={d}>{d}</span>)}
          </div>

          <div className="dp-days">
            {cells.map((d, i) =>
              d === null
                ? <span key={`_${i}`} />
                : <button
                    key={d}
                    type="button"
                    className={[
                      'dp-day',
                      isSelected(d) ? 'dp-day--selected' : '',
                      isToday(d)    ? 'dp-day--today'    : '',
                      isDisabled(d) ? 'dp-day--disabled' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => select(d)}
                    disabled={isDisabled(d)}
                  >{d}</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
