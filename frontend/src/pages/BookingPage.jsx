import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import client from '../api/client'
import DatePicker from '../components/DatePicker'
import PlayableCourtGrid from '../components/PlayableCourtGrid'
import TimeSlotPicker from '../components/TimeSlotPicker'

function todayISO() { return new Date().toISOString().split('T')[0] }
function maxDateISO() {
  const d = new Date(); d.setDate(d.getDate() + 60)
  return d.toISOString().split('T')[0]
}
function fmt(t) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BookingPage() {
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const preselectedCourt = searchParams.get('courtId')

  const [courts,  setCourts]  = useState([])
  const [form,    setForm]    = useState({
    courtId:      preselectedCourt || '',
    bookingDate:  '',
    courtNumbers: [],   // array — supports multi-select
    startTime:    '',
    endTime:      '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    client.get('/courts').then(r => setCourts(r.data)).catch(() => {})
  }, [])

  const selectedCourt = courts.find(c => String(c.id) === String(form.courtId))

  const step1Done = Boolean(form.courtId && form.bookingDate)
  const step2Done = form.courtNumbers.length > 0
  const step3Done = Boolean(form.startTime && form.endTime)
  const currentStep = !step1Done ? 1 : !step2Done ? 2 : 3

  const hours = useMemo(() => {
    if (!form.startTime || !form.endTime) return 0
    const [sh] = form.startTime.split(':').map(Number)
    const [eh] = form.endTime.split(':').map(Number)
    return Math.max(0, eh - sh)
  }, [form.startTime, form.endTime])

  const totalCost = selectedCourt
    ? (hours * selectedCourt.hourlyRate * Math.max(1, form.courtNumbers.length)).toFixed(2)
    : '0.00'

  const handleCourtChange = e => {
    setForm(f => ({ ...f, courtId: e.target.value, courtNumbers: [], startTime: '', endTime: '' }))
  }
  const handleDateChange = date => {
    setForm(f => ({ ...f, bookingDate: date, courtNumbers: [], startTime: '', endTime: '' }))
  }
  // Toggle a court number in/out of the selection array
  const handleCourtToggle = n => {
    setForm(f => {
      const already = f.courtNumbers.includes(n)
      const courtNumbers = already
        ? f.courtNumbers.filter(x => x !== n)
        : [...f.courtNumbers, n]
      return { ...f, courtNumbers, startTime: '', endTime: '' }
    })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.courtId)              { setError('Please select a court location.'); return }
    if (!form.bookingDate)          { setError('Please choose a date.');           return }
    if (form.courtNumbers.length === 0) { setError('Please select at least one court.'); return }
    if (!form.startTime)            { setError('Please select a start time.');     return }
    if (!form.endTime)              { setError('Please select an end time.');      return }

    setLoading(true)
    try {
      const results = await Promise.allSettled(
        form.courtNumbers.map(n =>
          client.post('/bookings', {
            courtId:     Number(form.courtId),
            courtNumber: n,
            bookingDate: form.bookingDate,
            startTime:   form.startTime,
            endTime:     form.endTime,
          })
        )
      )

      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length === results.length) {
        // All failed
        const msg = failed[0].reason?.message || 'Could not create bookings. The slots may already be taken.'
        setError(msg)
        return
      }
      if (failed.length > 0) {
        setError(`${failed.length} court(s) could not be booked — the slots may already be taken. Successful bookings are on your dashboard.`)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Could not create booking.')
    } finally {
      setLoading(false)
    }
  }

  const courtLabel = form.courtNumbers.length === 0
    ? '—'
    : form.courtNumbers.length === 1
    ? `Court ${form.courtNumbers[0]}`
    : `Courts ${form.courtNumbers.slice().sort((a, b) => a - b).join(', ')}`

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>New Booking</h1>
          <p>Pick a location, choose your court(s), then select a time — confirmation is instant.</p>
        </div>
      </div>

      <div className="booking-page">
        <div className="container">
          <div className="booking-layout">

            {/* ── Form ── */}
            <div className="booking-form-card">
              <div className="booking-form-card__header">
                <h2>Booking Details</h2>
              </div>
              <div className="booking-form-card__body">

                {/* Step indicator */}
                <div className="booking-steps">
                  <div className={`booking-step${currentStep === 1 ? ' active' : step1Done ? ' done' : ''}`}>
                    <span className="booking-step__dot">{step1Done ? '✓' : '1'}</span>
                    <span className="booking-step__label">Location &amp; Date</span>
                  </div>
                  <div className="booking-step__line" />
                  <div className={`booking-step${currentStep === 2 ? ' active' : step2Done ? ' done' : ''}`}>
                    <span className="booking-step__dot">{step2Done ? '✓' : '2'}</span>
                    <span className="booking-step__label">Select Court(s)</span>
                  </div>
                  <div className="booking-step__line" />
                  <div className={`booking-step${currentStep === 3 ? ' active' : step3Done ? ' done' : ''}`}>
                    <span className="booking-step__dot">{step3Done ? '✓' : '3'}</span>
                    <span className="booking-step__label">Pick Time</span>
                  </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>

                  {/* ── Step 1: Location & Date ── */}
                  <div className="booking-section">
                    <div className="booking-section__header">
                      {step1Done && <span className="section-check">✓</span>}
                      <span>Court Location &amp; Date</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="courtId">Location</label>
                      <select
                        id="courtId" name="courtId"
                        value={form.courtId}
                        onChange={handleCourtChange}
                        required
                      >
                        <option value="">Select a court location…</option>
                        {courts.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} — {c.indoor ? 'Indoor' : 'Outdoor'} · ₱{Number(c.hourlyRate).toFixed(2)}/hr
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Date</label>
                      <DatePicker
                        value={form.bookingDate}
                        onChange={handleDateChange}
                        minISO={todayISO()}
                        maxISO={maxDateISO()}
                      />
                    </div>
                  </div>

                  {/* ── Step 2: Court Selection ── */}
                  {step1Done && (
                    <div className="booking-section">
                      <div className="booking-section__header">
                        {step2Done && <span className="section-check">✓</span>}
                        <span>Choose Court(s)</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
                        Tap to select one or more courts. A shared time slot will be booked for all.
                      </p>
                      <PlayableCourtGrid
                        courtId={form.courtId}
                        date={form.bookingDate}
                        selected={form.courtNumbers}
                        onSelect={handleCourtToggle}
                      />
                    </div>
                  )}

                  {/* ── Step 3: Time Slots ── */}
                  {step1Done && step2Done && (
                    <div className="booking-section">
                      <div className="booking-section__header">
                        {step3Done && <span className="section-check">✓</span>}
                        <span>Select Time — {courtLabel}</span>
                      </div>
                      <TimeSlotPicker
                        courtId={form.courtId}
                        date={form.bookingDate}
                        courtNumbers={form.courtNumbers}
                        startTime={form.startTime}
                        endTime={form.endTime}
                        onChange={({ startTime, endTime }) =>
                          setForm(f => ({ ...f, startTime, endTime }))
                        }
                      />
                    </div>
                  )}

                  {step1Done && step2Done && (
                    <>
                      <button
                        type="submit"
                        className="btn btn-neon btn-block btn-lg"
                        disabled={loading || !step3Done}
                      >
                        {loading
                          ? `Booking ${form.courtNumbers.length} court${form.courtNumbers.length !== 1 ? 's' : ''}…`
                          : `Confirm ${form.courtNumbers.length > 1 ? `${form.courtNumbers.length} Courts` : 'Booking'}`}
                      </button>

                      <div className="booking-wait-note">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Expect a <strong>5–10 minute</strong> wait for admin confirmation after submitting your payment receipt.
                      </div>
                    </>
                  )}

                </form>
              </div>
            </div>

            {/* ── Summary ── */}
            <div className="cost-summary">
              <h3>Booking Summary</h3>

              {selectedCourt ? (
                <div className="court-preview-mini">
                  <div className="court-preview-mini__name">{selectedCourt.name}</div>
                  <div className="court-preview-mini__meta">
                    {selectedCourt.indoor ? 'Indoor' : 'Outdoor'}
                    {form.courtNumbers.length > 0 && ` · ${courtLabel}`}
                  </div>
                </div>
              ) : (
                <div className="court-preview-mini">
                  <div className="court-preview-mini__meta" style={{ color: 'var(--text-3)' }}>No location selected</div>
                </div>
              )}

              <div className="cost-row">
                <span>Rate</span>
                <span>{selectedCourt ? `₱${Number(selectedCourt.hourlyRate).toFixed(2)} / hr` : '—'}</span>
              </div>
              {form.bookingDate && (
                <div className="cost-row">
                  <span>Date</span>
                  <span>{fmtDate(form.bookingDate)}</span>
                </div>
              )}
              {form.courtNumbers.length > 0 && (
                <div className="cost-row">
                  <span>Courts</span>
                  <span>{courtLabel}</span>
                </div>
              )}
              <div className="cost-row">
                <span>Duration</span>
                <span>{hours > 0 ? `${hours} hr${hours !== 1 ? 's' : ''}` : '—'}</span>
              </div>
              {form.startTime && form.endTime && (
                <div className="cost-row">
                  <span>Time</span>
                  <span>{fmt(form.startTime)} – {fmt(form.endTime)}</span>
                </div>
              )}
              {form.courtNumbers.length > 1 && selectedCourt && hours > 0 && (
                <div className="cost-row" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  <span>× {form.courtNumbers.length} courts</span>
                  <span>₱{(hours * selectedCourt.hourlyRate).toFixed(2)} each</span>
                </div>
              )}
              <div className="cost-row cost-row--total">
                <span>Total</span>
                <span className="cost-total-value">₱{totalCost}</span>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                Payment via GCash. Confirmation within 5–10 minutes of receipt upload.
              </p>

              <Link to="/courts" className="btn btn-outline btn-block" style={{ marginTop: 12 }}>
                ← Browse Courts
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
