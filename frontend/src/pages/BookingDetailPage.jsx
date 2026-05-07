import { useEffect, useState } from 'react'
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
      await client.delete(`/bookings/${id}/cancel`)
      setBooking(b => ({ ...b, status: 'CANCELLED' }))
    } catch {
      alert('Could not cancel booking.')
    } finally {
      setCancelling(false)
    }
  }

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
                {booking.notes && (
                  <div className="detail-item">
                    <span className="detail-item__label">Notes</span>
                    <span className="detail-item__value" style={{ maxWidth: 260 }}>{booking.notes}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-item__label">Booked on</span>
                  <span className="detail-item__value">{formatDate(booking.createdAt?.split('T')[0])}</span>
                </div>
              </div>
            </div>

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

              {booking.status === 'CONFIRMED' && (
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

function StatusBadge({ status }) {
  const map = { CONFIRMED: 'badge-confirmed', CANCELLED: 'badge-cancelled', PENDING: 'badge-pending', COMPLETED: 'badge-completed' }
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
