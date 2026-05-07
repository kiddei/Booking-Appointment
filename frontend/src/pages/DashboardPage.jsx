import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

export default function DashboardPage() {
  const { user }             = useAuth()
  const navigate             = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [cancelling, setCancelling] = useState(null)

  const load = () =>
    client.get('/bookings')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    setCancelling(id)
    try {
      await client.delete(`/bookings/${id}/cancel`)
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b))
    } catch {
      alert('Could not cancel booking.')
    } finally {
      setCancelling(null)
    }
  }

  const upcoming   = bookings.filter(b => b.status === 'CONFIRMED').length
  const cancelled  = bookings.filter(b => b.status === 'CANCELLED').length
  const totalSpent = bookings
    .filter(b => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + Number(b.totalAmount), 0)

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>My Dashboard</h1>
          <p>Welcome back, {user?.username}. Here are your bookings.</p>
        </div>
      </div>

      <div className="dashboard-page">
        <div className="container">

          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-card__label">Total Bookings</div>
              <div className="stat-card__value">{bookings.length}</div>
              <div className="stat-card__sub">all time</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Upcoming</div>
              <div className="stat-card__value">{upcoming}</div>
              <div className="stat-card__sub">confirmed sessions</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Total Spent</div>
              <div className="stat-card__value">₱{totalSpent.toFixed(2)}</div>
              <div className="stat-card__sub">excl. cancelled</div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-card__header">
              <h2>Booking History</h2>
              <Link to="/bookings/new" className="btn btn-neon btn-sm">+ New Booking</Link>
            </div>

            {loading ? (
              <div className="page-loading"><div className="loading-spinner" /></div>
            ) : bookings.length === 0 ? (
              <div className="empty-state">
                <h3>No bookings yet</h3>
                <p>Reserve a court and get on the court today.</p>
                <Link to="/bookings/new" className="btn btn-neon">Book a Court</Link>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Court</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/bookings/${b.id}`)}>
                        <td style={{ color: 'var(--text)', fontWeight: 500 }}>
                          {b.courtName}
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                            {b.courtIndoor ? 'Indoor' : 'Outdoor'}
                          </span>
                        </td>
                        <td>{formatDate(b.bookingDate)}</td>
                        <td>{formatTime(b.startTime)} – {formatTime(b.endTime)}</td>
                        <td style={{ color: 'var(--text)', fontWeight: 600 }}>₱{Number(b.totalAmount).toFixed(2)}</td>
                        <td><StatusBadge status={b.status} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          {b.status === 'CONFIRMED' && (
                            <button
                              className="btn btn-danger"
                              disabled={cancelling === b.id}
                              onClick={() => handleCancel(b.id)}
                            >
                              {cancelling === b.id ? '…' : 'Cancel'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}

function StatusBadge({ status }) {
  const map = {
    CONFIRMED: 'badge-confirmed',
    CANCELLED: 'badge-cancelled',
    PENDING:   'badge-pending',
    COMPLETED: 'badge-completed',
  }
  return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour < 12 ? 'AM' : 'PM'}`
}
