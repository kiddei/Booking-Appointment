import { useEffect, useState } from 'react'
import client from '../api/client'

const OPERATING_HOURS = 15  // 7 AM – 10 PM

function getStatus(bookedHours) {
  const pct = bookedHours / OPERATING_HOURS
  if (pct >= 0.60) return 'full'
  if (pct >= 0.25) return 'busy'
  return 'available'
}

function CourtSVG({ status, selected }) {
  // Top-down pickleball court — 20 ft × 44 ft
  // SVG canvas 80×176 | play area x 4–76, y 8–168 (72×160)
  // Net y=88 | NVZ lines y=34, y=142
  const surface =
    status === 'full'  ? '#1c1412' :
    status === 'busy'  ? '#1e2a14' :
    selected           ? '#1a5c3a' :
                         '#14391e'

  const ln = 'rgba(255,255,255,0.72)'
  const nt = 'rgba(255,255,255,0.90)'

  return (
    <svg viewBox="0 0 80 176" xmlns="http://www.w3.org/2000/svg" className="court-svg">
      <rect x="0" y="0" width="80" height="176" rx="4" fill={surface} />

      {status === 'full'  && <rect x="0" y="0" width="80" height="176" rx="4" fill="rgba(200,40,40,0.28)" />}
      {status === 'busy'  && <rect x="0" y="0" width="80" height="176" rx="4" fill="rgba(255,160,0,0.18)" />}
      {selected           && <rect x="0" y="0" width="80" height="176" rx="4" fill="rgba(200,255,0,0.10)" />}

      <rect x="4" y="8" width="72" height="160" fill="none" stroke={ln} strokeWidth="1.5" />
      <line x1="4" y1="34"  x2="76" y2="34"  stroke={ln} strokeWidth="1" />
      <line x1="4" y1="142" x2="76" y2="142" stroke={ln} strokeWidth="1" />
      <line x1="40" y1="8"   x2="40" y2="34"  stroke={ln} strokeWidth="1" />
      <line x1="40" y1="142" x2="40" y2="168" stroke={ln} strokeWidth="1" />
      <line x1="4" y1="88" x2="76" y2="88" stroke={nt} strokeWidth="2.5" />
      <circle cx="4"  cy="88" r="2.2" fill={nt} />
      <circle cx="76" cy="88" r="2.2" fill={nt} />
    </svg>
  )
}

// selected: array of selected court numbers
// onSelect: called with courtNumber to toggle selection
export default function PlayableCourtGrid({ courtId, date, selected = [], onSelect }) {
  const [courts,  setCourts]  = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!courtId || !date) { setCourts([]); return }
    setLoading(true)
    client.get(`/courts/${courtId}/courts-status?date=${date}`)
      .then(r => setCourts(r.data))
      .catch(() => setCourts([]))
      .finally(() => setLoading(false))
  }, [courtId, date])

  if (!courtId || !date) return null

  if (loading) return (
    <div className="court-grid-loading">
      <div className="loading-spinner" />
      <span>Loading courts…</span>
    </div>
  )

  return (
    <div>
      {selected.length > 0 && (
        <div className="court-grid-selection-info">
          {selected.length === 1
            ? `Court ${selected[0]} selected`
            : `${selected.length} courts selected: ${selected.sort((a, b) => a - b).join(', ')}`}
        </div>
      )}
      <div className="court-grid">
        {courts.map(({ courtNumber, bookedHours }) => {
          const status     = getStatus(bookedHours)
          const isFull     = status === 'full'
          const isSelected = selected.includes(courtNumber)

          return (
            <button
              key={courtNumber}
              type="button"
              className={`court-card court-card--${status}${isSelected ? ' court-card--selected' : ''}`}
              onClick={() => !isFull && onSelect(courtNumber)}
              disabled={isFull}
              title={isFull ? 'Fully booked for this day' : isSelected ? `Deselect Court ${courtNumber}` : `Select Court ${courtNumber}`}
            >
              <CourtSVG status={status} selected={isSelected} />
              <div className="court-card__footer">
                <span className="court-card__number">Court {courtNumber}</span>
                <span className={`court-card__status court-card__status--${status}`}>
                  <span className="status-dot" />
                  {status === 'available' ? 'Available' : status === 'busy' ? 'Busy' : 'Full'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
