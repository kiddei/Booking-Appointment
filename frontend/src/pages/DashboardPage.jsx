import { useEffect, useState, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

function groupBookings(bookings) {
  const groups = new Map()
  bookings.forEach(b => {
    const key = `${b.courtId}-${b.bookingDate}-${b.startTime}-${b.endTime}`
    if (groups.has(key)) {
      const g = groups.get(key)
      g.ids.push(b.id)
      g.courtNumbers.push(b.courtNumber)
      g.courtDetails.push({ id: b.id, courtNumber: b.courtNumber, amount: b.totalAmount })
      g.totalAmount = (Number(g.totalAmount) + Number(b.totalAmount)).toFixed(2)
    } else {
      groups.set(key, {
        key,
        primaryId:    b.id,
        ids:          [b.id],
        status:       b.status,
        bookingDate:  b.bookingDate,
        startTime:    b.startTime,
        endTime:      b.endTime,
        courtName:    b.courtName,
        courtIndoor:  b.courtIndoor,
        courtNumbers: [b.courtNumber],
        courtDetails: [{ id: b.id, courtNumber: b.courtNumber, amount: b.totalAmount }],
        totalAmount:  b.totalAmount,
      })
    }
  })
  return [...groups.values()]
}

export default function DashboardPage() {
  const { user }                  = useAuth()
  const navigate                  = useNavigate()
  const [bookings,   setBookings] = useState([])
  const [loading,    setLoading]  = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState(new Set())

  useEffect(() => {
    client.get('/bookings')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (ids) => {
    if (!window.confirm('Cancel this booking?')) return
    setCancelling(ids[0])
    try {
      await Promise.allSettled(ids.map(id => client.delete(`/bookings/${id}/cancel`)))
      setBookings(bs => bs.map(b => ids.includes(b.id) ? { ...b, status: 'CANCELLED' } : b))
    } catch {
      alert('Could not cancel booking.')
    } finally {
      setCancelling(null)
    }
  }

  const toggleGroup = key => setExpandedGroups(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const groups     = groupBookings(bookings)
  const upcoming   = groups.filter(g => g.status === 'CONFIRMED' || g.status === 'PENDING').length
  const pending    = groups.filter(g => g.status === 'PENDING').length
  const totalSpent = groups
    .filter(g => g.status !== 'CANCELLED')
    .reduce((sum, g) => sum + Number(g.totalAmount), 0)

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
              <div className="stat-card__value">{groups.length}</div>
              <div className="stat-card__sub">all time</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Active</div>
              <div className="stat-card__value">{upcoming}</div>
              <div className="stat-card__sub">{pending > 0 ? `${pending} awaiting payment` : 'confirmed sessions'}</div>
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
            ) : groups.length === 0 ? (
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
                    {groups.map(g => {
                      const multi    = g.courtNumbers.length > 1
                      const expanded = expandedGroups.has(g.key)
                      const sortedDetails = [...g.courtDetails].sort((a, b) => a.courtNumber - b.courtNumber)
                      return (
                        <Fragment key={g.key}>
                          {/* ── Main group row ── */}
                          <tr
                            className={multi ? 'booking-group-row' : ''}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/bookings/${g.primaryId}`)}
                          >
                            <td>
                              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{g.courtName}</span>
                              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                {g.courtIndoor ? 'Indoor' : 'Outdoor'}
                              </span>
                              {multi ? (
                                <button
                                  className="court-expand-btn"
                                  onClick={e => { e.stopPropagation(); toggleGroup(g.key) }}
                                >
                                  {g.courtNumbers.length} courts {expanded ? '▲' : '▼'}
                                </button>
                              ) : (
                                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Court {g.courtNumbers[0]}</span>
                              )}
                            </td>
                            <td>{formatDate(g.bookingDate)}</td>
                            <td>{formatTime(g.startTime)} – {formatTime(g.endTime)}</td>
                            <td>
                              <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                                ₱{Number(g.totalAmount).toFixed(2)}
                              </span>
                              {multi && (
                                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                                  {g.courtNumbers.length} courts combined
                                </span>
                              )}
                            </td>
                            <td><StatusBadge status={g.status} /></td>
                            <td onClick={e => e.stopPropagation()}>
                              {g.status === 'PENDING' && (
                                <Link
                                  to={`/bookings/${g.primaryId}`}
                                  className="btn btn-neon"
                                  style={{ fontSize: 12, padding: '5px 10px' }}
                                >
                                  Pay Now
                                </Link>
                              )}
                              {g.status === 'CONFIRMED' && (
                                <button
                                  className="btn btn-danger"
                                  disabled={cancelling === g.ids[0]}
                                  onClick={() => handleCancel(g.ids)}
                                >
                                  {cancelling === g.ids[0] ? '…' : 'Cancel'}
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* ── Per-court breakdown sub-rows (expanded) ── */}
                          {multi && expanded && sortedDetails.map(d => (
                            <tr
                              key={d.id}
                              className="booking-sub-row"
                              onClick={() => navigate(`/bookings/${d.id}`)}
                            >
                              <td>
                                <span className="sub-row-indent">↳</span>
                                <span className="sub-row-label">Court {d.courtNumber}</span>
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatDate(g.bookingDate)}</td>
                              <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatTime(g.startTime)} – {formatTime(g.endTime)}</td>
                              <td style={{ fontSize: 13, fontWeight: 500 }}>₱{Number(d.amount).toFixed(2)}</td>
                              <td><StatusBadge status={g.status} /></td>
                              <td />
                            </tr>
                          ))}
                        </Fragment>
                      )
                    })}
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
