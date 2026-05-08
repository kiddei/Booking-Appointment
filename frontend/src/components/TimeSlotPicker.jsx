import { useEffect, useRef, useState } from 'react'
import client from '../api/client'

const OPEN  = 7   // 7 AM
const CLOSE = 22  // 10 PM
const pad   = n => String(n).padStart(2, '0')

const ALL_TIMES = Array.from({ length: CLOSE - OPEN + 1 }, (_, i) => {
  const h = OPEN + i
  const label = h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`
  return { value: `${pad(h)}:00`, label, hour: h }
})
// 16 entries: 07:00…22:00

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// courtNumbers: array of selected court numbers
export default function TimeSlotPicker({ courtId, date, courtNumbers = [1], startTime, endTime, onChange }) {
  const [booked,  setBooked]  = useState([])
  const [loading, setLoading] = useState(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Merge availability for all selected courts — a slot is blocked if ANY court is booked then
  const courtKey = courtNumbers.slice().sort().join(',')

  useEffect(() => {
    if (!courtId || !date || courtNumbers.length === 0) { setBooked([]); return }
    setLoading(true)
    Promise.all(
      courtNumbers.map(n =>
        client.get(`/courts/${courtId}/availability?date=${date}&courtNumber=${n}`)
          .then(r => r.data)
          .catch(() => [])
      )
    )
      .then(results => {
        // Union of all booked slots across all selected courts
        setBooked(results.flat())
      })
      .finally(() => setLoading(false))
  }, [courtId, date, courtKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset selection when court, date, or selected courts change
  useEffect(() => {
    onChangeRef.current({ startTime: '', endTime: '' })
  }, [courtId, date, courtKey])

  const phase = !startTime ? 'start' : !endTime ? 'end' : 'done'

  const isHourBooked = h =>
    booked.some(b => toMinutes(b.start) <= h * 60 && toMinutes(b.end) > h * 60)

  const maxEndHour = startH => {
    const nexts = booked.map(b => parseInt(b.start)).filter(h => h > startH)
    return nexts.length ? Math.min(...nexts) : CLOSE
  }

  const slotClass = ({ value, hour }) => {
    const startH = startTime ? parseInt(startTime) : null
    const endH   = endTime   ? parseInt(endTime)   : null

    if (isHourBooked(hour)) return 'ts-slot ts-slot--booked'

    if (phase === 'done' && startH !== null && endH !== null) {
      if (hour === startH) return 'ts-slot ts-slot--start'
      if (hour === endH)   return 'ts-slot ts-slot--end'
      if (hour > startH && hour < endH) return 'ts-slot ts-slot--range'
      return 'ts-slot ts-slot--available'
    }

    if (phase === 'end' && startH !== null) {
      if (hour === startH) return 'ts-slot ts-slot--start'
      if (hour <= startH)  return 'ts-slot ts-slot--past'
      if (hour <= maxEndHour(startH)) return 'ts-slot ts-slot--available-end'
      return 'ts-slot ts-slot--blocked'
    }

    if (hour === CLOSE) return 'ts-slot ts-slot--no-start'
    return 'ts-slot ts-slot--available'
  }

  const handleClick = ({ value, hour }) => {
    if (isHourBooked(hour)) return
    const startH = startTime ? parseInt(startTime) : null

    if (phase === 'start') {
      if (hour === CLOSE) return
      onChange({ startTime: value, endTime: '' })
      return
    }

    if (phase === 'end' || phase === 'done') {
      if (hour <= (startH ?? -1)) {
        if (hour !== CLOSE) onChange({ startTime: value, endTime: '' })
        return
      }
      if (hour > maxEndHour(startH)) return
      onChange({ startTime, endTime: value })
    }
  }

  const fmtRange = () => {
    if (!startTime) return null
    const fmt = t => {
      const h = parseInt(t)
      return h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`
    }
    if (!endTime) return `${fmt(startTime)} → pick end time`
    return `${fmt(startTime)} – ${fmt(endTime)}`
  }

  if (!courtId || !date || courtNumbers.length === 0) {
    return (
      <div className="ts-placeholder">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Select a court and date first</span>
      </div>
    )
  }

  return (
    <div className="ts-picker">
      <div className="ts-header">
        <span className="ts-phase-label">
          {phase === 'start' && 'Tap a slot to set start time'}
          {phase === 'end'   && 'Now tap to set end time'}
          {phase === 'done'  && fmtRange()}
        </span>
        {(startTime || endTime) && (
          <button type="button" className="ts-reset" onClick={() => onChange({ startTime: '', endTime: '' })}>
            Reset
          </button>
        )}
      </div>

      {loading ? (
        <div className="ts-loading"><div className="loading-spinner" /></div>
      ) : (
        <div className="ts-grid">
          {ALL_TIMES.map(slot => (
            <button
              key={slot.value}
              type="button"
              className={slotClass(slot)}
              onClick={() => handleClick(slot)}
              disabled={isHourBooked(slot.hour) || (phase === 'start' && slot.hour === CLOSE)}
              title={isHourBooked(slot.hour) ? 'Already booked' : slot.label}
            >
              {slot.label}
            </button>
          ))}
        </div>
      )}

      <div className="ts-legend">
        <span className="ts-legend-item"><span className="ts-swatch ts-swatch--avail" />Available</span>
        <span className="ts-legend-item"><span className="ts-swatch ts-swatch--booked" />Booked</span>
        <span className="ts-legend-item"><span className="ts-swatch ts-swatch--selected" />Selected</span>
      </div>
    </div>
  )
}
