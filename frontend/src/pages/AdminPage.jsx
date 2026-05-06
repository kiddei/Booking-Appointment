import { useEffect, useState } from 'react'
import client from '../api/client'

export default function AdminPage() {
  const [tab, setTab] = useState('courts')

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Admin Panel</h1>
          <p>Manage courts and view all bookings.</p>
        </div>
      </div>

      <div className="admin-page">
        <div className="container">
          <div className="admin-tabs">
            <button className={`admin-tab${tab === 'courts' ? ' active' : ''}`} onClick={() => setTab('courts')}>Courts</button>
            <button className={`admin-tab${tab === 'bookings' ? ' active' : ''}`} onClick={() => setTab('bookings')}>All Bookings</button>
          </div>

          {tab === 'courts'   && <CourtsTab />}
          {tab === 'bookings' && <BookingsTab />}
        </div>
      </div>
    </>
  )
}

/* ── Courts Tab ─────────────────────────────────────────── */
function CourtsTab() {
  const [courts, setCourts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = () =>
    client.get('/admin/courts')
      .then(r => setCourts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this court? It will no longer be bookable.')) return
    try {
      await client.delete(`/admin/courts/${id}`)
      setCourts(cs => cs.filter(c => c.id !== id))
    } catch {
      alert('Could not deactivate court.')
    }
  }

  return (
    <>
      <div className="admin-actions">
        <button className="btn btn-neon" onClick={() => setShowModal(true)}>+ Add Court</button>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="page-loading"><div className="loading-spinner" /></div>
        ) : courts.length === 0 ? (
          <div className="empty-state"><h3>No courts yet</h3><p>Add your first court.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Max Players</th>
                  <th>Rate / hr</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {courts.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>
                      {c.name}
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{c.description}</span>
                    </td>
                    <td><span className="court-card__badge">{c.indoor ? 'Indoor' : 'Outdoor'}</span></td>
                    <td>{c.maxPlayers}</td>
                    <td style={{ color: 'var(--neon)', fontWeight: 600 }}>${Number(c.hourlyRate).toFixed(2)}</td>
                    <td>
                      <button className="btn btn-danger" onClick={() => handleDeactivate(c.id)}>Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddCourtModal
          onClose={() => setShowModal(false)}
          onAdded={c => { setCourts(cs => [...cs, c]); setShowModal(false) }}
        />
      )}
    </>
  )
}

/* ── Add Court Modal ────────────────────────────────────── */
function AddCourtModal({ onClose, onAdded }) {
  const [form, setForm]       = useState({ name: '', description: '', hourlyRate: '', indoor: false, maxPlayers: 4 })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await client.post('/admin/courts', {
        name:        form.name,
        description: form.description,
        hourlyRate:  Number(form.hourlyRate),
        indoor:      form.indoor,
        maxPlayers:  Number(form.maxPlayers),
        active:      true,
      })
      onAdded(res.data)
    } catch (err) {
      setError(err.message || 'Failed to add court.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <h3>Add New Court</h3>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Court name</label>
            <input name="name" type="text" placeholder="Court A" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" placeholder="Short description…" value={form.description} onChange={handleChange} rows={2} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Rate ($/hr)</label>
              <input name="hourlyRate" type="number" min="1" step="0.01" placeholder="25.00" value={form.hourlyRate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Max players</label>
              <input name="maxPlayers" type="number" min="2" max="8" value={form.maxPlayers} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input id="indoor" name="indoor" type="checkbox" checked={form.indoor} onChange={handleChange} style={{ width: 'auto', accentColor: 'var(--neon)' }} />
            <label htmlFor="indoor" style={{ textTransform: 'none', marginBottom: 0, fontSize: 14, color: 'var(--text-2)' }}>Indoor court</label>
          </div>
          <button type="submit" className="btn btn-neon btn-block" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Adding…' : 'Add Court'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Bookings Tab ───────────────────────────────────────── */
function BookingsTab() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    client.get('/admin/bookings')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="table-card">
      {loading ? (
        <div className="page-loading"><div className="loading-spinner" /></div>
      ) : bookings.length === 0 ? (
        <div className="empty-state"><h3>No bookings yet</h3></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Court</th>
                <th>Date</th>
                <th>Time</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td style={{ color: 'var(--text-3)' }}>{b.id}</td>
                  <td style={{ color: 'var(--text)', fontWeight: 500 }}>{b.courtName}</td>
                  <td>{formatDate(b.bookingDate)}</td>
                  <td>{formatTime(b.startTime)} – {formatTime(b.endTime)}</td>
                  <td style={{ color: 'var(--neon)', fontWeight: 600 }}>${Number(b.totalAmount).toFixed(2)}</td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = { CONFIRMED: 'badge-confirmed', CANCELLED: 'badge-cancelled', PENDING: 'badge-pending', COMPLETED: 'badge-completed' }
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
