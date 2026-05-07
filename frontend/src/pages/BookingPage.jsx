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
    courtId:     preselectedCourt || '',
    bookingDate: '',
    courtNumber: null,
    startTime:   '',
    endTime:     '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    client.get('/courts').then(r => setCourts(r.data)).catch(() => {})
  }, [])

  const selectedCourt = courts.find(c => String(c.id) === String(form.courtId))

  // Derived step for the indicator
  const currentStep =
    !form.courtId || !form.bookingDate ? 1 :
    form.courtNumber === null           ? 2 : 3

  const hours = useMemo(() => {
    if (!form.startTime || !form.endTime) return 0
    const [sh] = form.startTime.split(':').map(Number)
    const [eh] = form.endTime.split(':').map(Number)
    return Math.max(0, eh - sh)
  }, [form.startTime, form.endTime])

  const totalCost = selectedCourt ? (hours * selectedCourt.hourlyRate).toFixed(2) : '0.00'

  const handleCourtChange = e => {
    setForm(f => ({ ...f, courtId: e.target.value, courtNumber: null, startTime: '', endTime: '' }))
  }
  const handleDateChange = date => {
    setForm(f => ({ ...f, bookingDate: date, courtNumber: null, startTime: '', endTime: '' }))
  }
  const handleCourtSelect = n => {
    setForm(f => ({ ...f, courtNumber: n, startTime: '', endTime: '' }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.courtId)          { setError('Please select a court location.'); return }
    if (!form.bookingDate)      { setError('Please choose a date.');           return }
    if (form.courtNumber === null) { setError('Please select a court.');       return }
    if (!form.startTime)        { setError('Please select a start time.');     return }
    if (!form.endTime)          { setError('Please select an end time.');      return }
    setLoading(true)
    try {
      const res = await client.post('/bookings', {
        courtId:     Number(form.courtId),
        courtNumber: form.courtNumber,
        bookingDate: form.bookingDate,
        startTime:   form.startTime,
        endTime:     form.endTime,
      })
      navigate(`/bookings/${res.data.id}`)
    } catch (err) {
      setError(err.message || 'Could not create booking. The slot may already be taken.')
    } finally {
      setLoading(false)
    }
  }

  const step1Done = Boolean(form.courtId && form.bookingDate)
  const step2Done = form.courtNumber !== null
  const step3Done = Boolean(form.startTime && form.endTime)

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>New Booking</h1>
          <p>Pick a location, choose your court, then select a time — confirmation is instant.</p>
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
                    <span className="booking-step__label">Select Court</span>
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
                        <span>Choose a Court</span>
                      </div>
                      <PlayableCourtGrid
                        courtId={form.courtId}
                        date={form.bookingDate}
                        selected={form.courtNumber}
                        onSelect={handleCourtSelect}
                      />
                    </div>
                  )}

                  {/* ── Step 3: Time Slots ── */}
                  {step1Done && step2Done && (
                    <div className="booking-section">
                      <div className="booking-section__header">
                        {step3Done && <span className="section-check">✓</span>}
                        <span>Select Time — Court {form.courtNumber}</span>
                      </div>
                      <TimeSlotPicker
                        courtId={form.courtId}
                        date={form.bookingDate}
                        courtNumber={form.courtNumber}
                        startTime={form.startTime}
                        endTime={form.endTime}
                        onChange={({ startTime, endTime }) =>
                          setForm(f => ({ ...f, startTime, endTime }))
                        }
                      />
                    </div>
                  )}

                  {step1Done && step2Done && (
                    <button
                      type="submit"
                      className="btn btn-neon btn-block btn-lg"
                      disabled={loading || !step3Done}
                    >
                      {loading ? 'Confirming…' : 'Confirm Booking'}
                    </button>
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
                    {form.courtNumber !== null && ` · Court ${form.courtNumber}`}
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
              {form.courtNumber !== null && (
                <div className="cost-row">
                  <span>Court</span>
                  <span>Court {form.courtNumber}</span>
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
              <div className="cost-row cost-row--total">
                <span>Total</span>
                <span className="cost-total-value">₱{totalCost}</span>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                Instant confirmation. Cancel anytime before your session.
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
