import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import client from '../api/client'

export default function BookingDetailPage() {
  const { id }               = useParams()
  const navigate             = useNavigate()
  const [booking, setBooking]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    client.get(`/bookings/${id}`)
      .then(r => setBooking(r.data))
      .catch(() => setError('Booking not found.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleCancel = async () => {
    if (!window.confirm('Cancel this booking?')) return
    setCancelling(true)
    try {
      const res = await client.delete(`/bookings/${id}/cancel`)
      setBooking(res.data)
    } catch {
      alert('Could not cancel booking.')
    } finally {
      setCancelling(false)
    }
  }

  const handleReceiptSubmit = (updated) => setBooking(updated)

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>

  if (error || !booking) return (
    <div className="page-header">
      <div className="container">
        <h1>Booking not found</h1>
        <p><Link to="/dashboard" style={{ color: 'var(--neon)' }}>← Back to dashboard</Link></p>
      </div>
    </div>
  )

  const hours = (() => {
    const [sh] = booking.startTime.split(':').map(Number)
    const [eh] = booking.endTime.split(':').map(Number)
    return Math.max(0, eh - sh)
  })()

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Booking #{booking.id}</h1>
          <p><Link to="/dashboard" style={{ color: 'var(--neon)' }}>← Back to dashboard</Link></p>
        </div>
      </div>

      <div className="booking-detail-page">
        <div className="container">
          <div className="detail-grid">

            {/* ── Left column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="detail-card">
                <div className="detail-card__header">
                  <h2>Booking Details</h2>
                  <StatusBadge status={booking.status} />
                </div>
                <div className="detail-list">
                  <div className="detail-item">
                    <span className="detail-item__label">Court</span>
                    <span className="detail-item__value">
                      {booking.courtName}
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)' }}>
                        {booking.courtIndoor ? 'Indoor' : 'Outdoor'}
                        {booking.courtNumber ? ` · Court ${booking.courtNumber}` : ''}
                      </span>
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-item__label">Date</span>
                    <span className="detail-item__value">{formatDate(booking.bookingDate)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-item__label">Time</span>
                    <span className="detail-item__value">{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-item__label">Duration</span>
                    <span className="detail-item__value">{hours} hr{hours !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-item__label">Booked on</span>
                    <span className="detail-item__value">{formatDate(booking.createdAt?.split('T')[0])}</span>
                  </div>
                </div>
              </div>

              {/* ── Payment section (PENDING only) ── */}
              {booking.status === 'PENDING' && (
                booking.paymentReceipt
                  ? <UnderReviewCard />
                  : <PaymentCard booking={booking} bookingId={id} onSubmit={handleReceiptSubmit} />
              )}
            </div>

            {/* ── Right column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="detail-card">
                <div className="detail-card__header"><h2>Cost</h2></div>
                <div className="detail-list">
                  <div className="detail-item">
                    <span className="detail-item__label">Total</span>
                    <span className="detail-item__value" style={{ fontSize: 24, fontWeight: 700, color: 'var(--neon)' }}>
                      ₱{Number(booking.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
                <button
                  className="btn btn-danger btn-block"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling…' : 'Cancel Booking'}
                </button>
              )}

              <Link to="/bookings/new" className="btn btn-outline btn-block">
                Book Another Court
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

/* ── Payment Card: QR + receipt upload ────────────────── */
function PaymentCard({ booking, bookingId, onSubmit }) {
  const [receipt, setReceipt]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]           = useState('')
  const fileRef                 = useRef(null)

  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setReceipt(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!receipt) { setErr('Please upload your payment receipt first.'); return }
    setErr('')
    setSubmitting(true)
    try {
      const res = await client.patch(`/bookings/${bookingId}/receipt`, { paymentReceipt: receipt })
      onSubmit(res.data)
    } catch (e) {
      setErr(e.message || 'Could not submit receipt.')
    } finally {
      setSubmitting(false)
    }
  }

  const qr = booking.court?.gcashQrCode

  return (
    <div className="payment-card">
      <div className="payment-card__title">Complete Your Payment</div>

      <div className="payment-qr-section">
        {qr ? (
          <img src={qr} alt="GCash QR" className="payment-qr-img" />
        ) : (
          <div className="payment-qr-placeholder">
            QR code not available — contact the court owner directly.
          </div>
        )}
        <div className="payment-instructions">
          Scan the QR code to pay{' '}
          <span className="payment-amount">₱{Number(booking.totalAmount).toFixed(2)}</span>{' '}
          via GCash, then upload your receipt below.
        </div>
      </div>

      <div className="receipt-section">
        <div className="receipt-section__label">Upload Payment Receipt</div>

        {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

        {receipt ? (
          <div className="receipt-attached" style={{ marginBottom: 12 }}>
            <img src={receipt} alt="Receipt" className="receipt-thumb" />
            <div className="receipt-attached__info">
              <div className="receipt-attached__name">Receipt attached</div>
              <div className="receipt-attached__sub">Ready to submit</div>
            </div>
            <div className="receipt-attached__actions">
              <button type="button" className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }}
                onClick={() => fileRef.current?.click()}>Change</button>
            </div>
          </div>
        ) : (
          <button type="button" className="receipt-dropzone" style={{ marginBottom: 12 }}
            onClick={() => fileRef.current?.click()}>
            <div className="receipt-dropzone__plus">+</div>
            <span style={{ fontSize: 13 }}>Tap to attach receipt image</span>
          </button>
        )}

        <button
          className="btn btn-neon btn-block"
          onClick={handleSubmit}
          disabled={submitting || !receipt}
        >
          {submitting ? 'Submitting…' : 'Submit for Review'}
        </button>
      </div>
    </div>
  )
}

/* ── Under Review card ─────────────────────────────────── */
function UnderReviewCard() {
  return (
    <div className="under-review-card">
      <div className="under-review-card__title">
        <span>⏳</span> Under Review
      </div>
      <div className="under-review-card__body">
        Your payment receipt has been submitted and is being reviewed by an admin.
        You'll see a <strong>Confirmed</strong> status here once it's approved — usually within a few hours.
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = { CONFIRMED: 'badge-confirmed', CANCELLED: 'badge-cancelled', PENDING: 'badge-pending' }
  return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour < 12 ? 'AM' : 'PM'}`
}
