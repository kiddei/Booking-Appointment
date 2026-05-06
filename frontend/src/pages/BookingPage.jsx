import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import client from '../api/client'
import DatePicker from '../components/DatePicker'
import TimeSlotPicker from '../components/TimeSlotPicker'

function todayISO() { return new Date().toISOString().split('T')[0] }
function maxDateISO() {
  const d = new Date(); d.setDate(d.getDate() + 60)
  return d.toISOString().split('T')[0]
}
function fmt(t) {
  if (!t) return '—'
  const h = parseInt(t)
  return h === 12 ? '12:00 PM' : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

export default function BookingPage() {
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const preselectedCourt = searchParams.get('courtId')

  const [courts,  setCourts]  = useState([])
  const [form,    setForm]    = useState({
    courtId:     preselectedCourt || '',
    bookingDate: '',
    startTime:   '',
    endTime:     '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    client.get('/courts').then(r => setCourts(r.data)).catch(() => {})
  }, [])

  const selectedCourt = courts.find(c => String(c.id) === String(form.courtId))

  const hours = useMemo(() => {
    if (!form.startTime || !form.endTime) return 0
    return parseInt(form.endTime) - parseInt(form.startTime)
  }, [form.startTime, form.endTime])

  const totalCost = selectedCourt ? (hours * selectedCourt.hourlyRate).toFixed(2) : '0.00'

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.courtId)     { setError('Please select a court.');            return }
    if (!form.bookingDate) { setError('Please choose a date.');             return }
    if (!form.startTime)   { setError('Please select a start time.');       return }
    if (!form.endTime)     { setError('Please select an end time.');        return }
    setLoading(true)
    try {
      const res = await client.post('/bookings', {
        courtId:     Number(form.courtId),
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

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>New Booking</h1>
          <p>Pick a court, date and time — confirmation is instant.</p>
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
                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>

                  {/* Court */}
                  <div className="form-group">
                    <label htmlFor="courtId">Court</label>
                    <select
                      id="courtId" name="courtId"
                      value={form.courtId}
                      onChange={e => setForm(f => ({ ...f, courtId: e.target.value, startTime: '', endTime: '' }))}
                      required
                    >
                      <option value="">Select a court…</option>
                      {courts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.indoor ? 'Indoor' : 'Outdoor'} · ${Number(c.hourlyRate).toFixed(2)}/hr
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="form-group">
                    <label>Date</label>
                    <DatePicker
                      value={form.bookingDate}
                      onChange={date => setForm(f => ({ ...f, bookingDate: date, startTime: '', endTime: '' }))}
                      minISO={todayISO()}
                      maxISO={maxDateISO()}
                    />
                  </div>

                  {/* Time slots */}
                  <div className="form-group">
                    <label>Time</label>
                    <TimeSlotPicker
                      courtId={form.courtId}
                      date={form.bookingDate}
                      startTime={form.startTime}
                      endTime={form.endTime}
                      onChange={({ startTime, endTime }) =>
                        setForm(f => ({ ...f, startTime, endTime }))
                      }
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-neon btn-block btn-lg"
                    disabled={loading || !selectedCourt || !form.bookingDate || !form.startTime || !form.endTime}
                  >
                    {loading ? 'Confirming…' : 'Confirm Booking'}
                  </button>

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
                    {selectedCourt.indoor ? 'Indoor' : 'Outdoor'} · Up to {selectedCourt.maxPlayers} players
                  </div>
                </div>
              ) : (
                <div className="court-preview-mini">
                  <div className="court-preview-mini__meta" style={{ color: 'var(--text-3)' }}>No court selected</div>
                </div>
              )}

              <div className="cost-row">
                <span>Rate</span>
                <span>{selectedCourt ? `$${Number(selectedCourt.hourlyRate).toFixed(2)} / hr` : '—'}</span>
              </div>
              <div className="cost-row">
                <span>Duration</span>
                <span>{hours > 0 ? `${hours} hr${hours !== 1 ? 's' : ''}` : '—'}</span>
              </div>
              {form.bookingDate && (
                <div className="cost-row">
                  <span>Date</span>
                  <span>{new Date(form.bookingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              {form.startTime && form.endTime && (
                <div className="cost-row">
                  <span>Time</span>
                  <span>{fmt(form.startTime)} – {fmt(form.endTime)}</span>
                </div>
              )}
              <div className="cost-row cost-row--total">
                <span>Total</span>
                <span className="cost-total-value">${totalCost}</span>
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
