import { useEffect, useState, useCallback, useRef, useMemo, Fragment } from 'react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 10

/* ── User color palette for calendar ───────────────────── */
const USER_COLORS = [
  { bg: 'rgba(200,255,0,0.10)',   border: 'rgba(200,255,0,0.45)',   text: '#c8ff00'  },
  { bg: 'rgba(100,180,255,0.10)', border: 'rgba(100,180,255,0.45)', text: '#64b4ff'  },
  { bg: 'rgba(255,100,160,0.10)', border: 'rgba(255,100,160,0.45)', text: '#ff64a0'  },
  { bg: 'rgba(255,165,0,0.10)',   border: 'rgba(255,165,0,0.45)',   text: '#ffa500'  },
  { bg: 'rgba(160,100,255,0.10)', border: 'rgba(160,100,255,0.45)', text: '#a064ff'  },
  { bg: 'rgba(50,210,140,0.10)',  border: 'rgba(50,210,140,0.45)',  text: '#32d28c'  },
  { bg: 'rgba(255,80,80,0.10)',   border: 'rgba(255,80,80,0.45)',   text: '#ff5050'  },
  { bg: 'rgba(0,210,210,0.10)',   border: 'rgba(0,210,210,0.45)',   text: '#00d2d2'  },
]
function getUserColor(userId) { return USER_COLORS[(userId ?? 0) % USER_COLORS.length] }

/* ── Page shell ─────────────────────────────────────────── */
export default function AdminPage() {
  const { user }    = useAuth()
  const [tab, setTab] = useState('overview')

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Admin Panel</h1>
          <p>Manage courts, users, and bookings.</p>
        </div>
      </div>

      <div className="admin-page">
        <div className="container">
          <div className="admin-tabs">
            {[
              { key: 'overview',  label: 'Overview'  },
              { key: 'courts',    label: 'Courts'    },
              { key: 'bookings',  label: 'Bookings'  },
              { key: 'payments',  label: 'Payments'  },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`admin-tab${tab === key ? ' active' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'overview'  && <OverviewTab />}
          {tab === 'courts'    && <CourtsTab adminId={user?.id} />}
          {tab === 'bookings'  && <BookingsTab />}
          {tab === 'payments'  && <PaymentsTab />}
        </div>
      </div>
    </>
  )
}

/* ── Overview ───────────────────────────────────────────── */
function OverviewTab() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>
  if (!stats)  return <div className="empty-state"><h3>Could not load stats.</h3></div>

  return (
    <div className="admin-stats-grid">
      <StatCard label="Total Courts"       value={stats.totalCourts}  sub={`${stats.activeCourts} active`} />
      <StatCard label="Registered Users"   value={stats.totalUsers} />
      <StatCard label="Confirmed Bookings" value={stats.totalBookings} sub={stats.pendingBookings > 0 ? `${stats.pendingBookings} pending` : undefined} />
      <StatCard
        label="Total Revenue"
        value={`₱${Number(stats.totalRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
        accent
      />
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`admin-stat-card${accent ? ' admin-stat-card--accent' : ''}`}>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  )
}

/* ── Courts Tab ─────────────────────────────────────────── */
function CourtsTab({ adminId }) {
  const [courts,    setCourts]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [editCourt, setEditCourt] = useState(null)
  const [page,      setPage]      = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    client.get('/admin/courts')
      .then(r => setCourts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(courts.length / PAGE_SIZE)
  const pageCourts = courts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleToggleActive = async (court) => {
    const action = court.active ? 'deactivate' : 'reactivate'
    const label  = court.active ? 'Deactivate' : 'Reactivate'
    if (!window.confirm(`${label} "${court.name}"?`)) return
    try {
      const res = await client.patch(`/admin/courts/${court.id}/${action}`)
      setCourts(cs => cs.map(c => c.id === court.id ? res.data : c))
    } catch {
      alert(`Could not ${action} court.`)
    }
  }

  return (
    <>
      <div className="admin-actions">
        <button className="btn btn-neon" onClick={() => setShowAdd(true)}>+ Add Court</button>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="page-loading"><div className="loading-spinner" /></div>
        ) : courts.length === 0 ? (
          <div className="empty-state"><h3>No courts yet.</h3><p>Add your first court.</p></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Court</th>
                    <th>Location</th>
                    <th>Owner</th>
                    <th>Contact</th>
                    <th>Type</th>
                    <th># Courts</th>
                    <th>Rate/hr</th>
                    <th>GCash</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageCourts.map(c => {
                    const isOwner = c.createdByAdminId === adminId
                    return (
                      <tr key={c.id} className={!c.active ? 'row-inactive' : ''}>
                        <td>
                          <span className="td-primary">{c.name}</span>
                          {c.description && <span className="td-sub">{c.description}</span>}
                          {!isOwner && (
                            <span style={{
                              display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 600,
                              color: 'var(--text-3)', background: 'rgba(255,255,255,0.06)',
                              borderRadius: 3, padding: '1px 6px', letterSpacing: '0.5px',
                            }}>
                              VIEW ONLY
                            </span>
                          )}
                        </td>
                        <td className="td-muted">{c.location || '—'}</td>
                        <td className="td-muted">{c.ownerName || '—'}</td>
                        <td className="td-muted">{c.contactNumber || '—'}</td>
                        <td><span className="court-card__badge">{c.indoor ? 'Indoor' : 'Outdoor'}</span></td>
                        <td className="td-center">{c.totalCourts ?? 1}</td>
                        <td className="td-accent">₱{Number(c.hourlyRate).toFixed(2)}</td>
                        <td>
                          {c.gcashQrCode
                            ? <img src={c.gcashQrCode} alt="QR" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4, background: '#fff', cursor: 'pointer' }} onClick={() => window.open(c.gcashQrCode)} title="View GCash QR" />
                            : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                          }
                        </td>
                        <td><ActiveBadge active={c.active} /></td>
                        <td>
                          {isOwner ? (
                            <div className="td-actions">
                              <button className="btn-icon btn-icon--edit" onClick={() => setEditCourt(c)} title="Edit">✎</button>
                              <button
                                className={`btn-icon ${c.active ? 'btn-icon--danger' : 'btn-icon--success'}`}
                                onClick={() => handleToggleActive(c)}
                                title={c.active ? 'Deactivate' : 'Reactivate'}
                              >
                                {c.active ? '✕' : '✓'}
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} setPage={setPage} totalPages={totalPages} />
          </>
        )}
      </div>

      {showAdd && (
        <CourtModal
          onClose={() => setShowAdd(false)}
          onSaved={c => { setCourts(cs => [...cs, c]); setShowAdd(false) }}
        />
      )}
      {editCourt && (
        <CourtModal
          court={editCourt}
          onClose={() => setEditCourt(null)}
          onSaved={updated => {
            setCourts(cs => cs.map(c => c.id === updated.id ? updated : c))
            setEditCourt(null)
          }}
        />
      )}
    </>
  )
}

/* ── Court Modal (Add / Edit) ───────────────────────────── */
const EMPTY_COURT = {
  name: '', description: '', location: '', ownerName: '',
  contactNumber: '', gcashQrCode: '', hourlyRate: '', indoor: false,
  totalCourts: 1, openTime: '07:00', closeTime: '22:00',
}

const HOUR_OPTIONS = Array.from({ length: 19 }, (_, i) => {
  const h = i + 5
  const label = h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`
  return { value: `${String(h).padStart(2, '0')}:00`, label }
})

function CourtModal({ court, onClose, onSaved }) {
  const isEdit = Boolean(court)

  const [form,    setForm]    = useState(court ? {
    name:          court.name,
    description:   court.description   ?? '',
    location:      court.location      ?? '',
    ownerName:     court.ownerName     ?? '',
    gcashQrCode:   court.gcashQrCode   ?? '',
    hourlyRate:    court.hourlyRate,
    indoor:        court.indoor,
    totalCourts:   court.totalCourts   ?? 1,
    contactNumber: (court.contactNumber ?? '').replace(/\D/g, ''),
    openTime:      court.openTime      ?? '07:00',
    closeTime:     court.closeTime     ?? '22:00',
  } : EMPTY_COURT)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const qrInputRef = useRef(null)

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleQrFile = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, gcashQrCode: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!/^\d{11}$/.test(form.contactNumber)) {
      setError('Contact number must be exactly 11 digits (e.g. 09171234567).')
      return
    }
    if (parseInt(form.closeTime) <= parseInt(form.openTime)) {
      setError('Closing time must be later than opening time.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        hourlyRate:  Number(form.hourlyRate),
        totalCourts: Number(form.totalCourts),
      }
      const res = isEdit
        ? await client.patch(`/admin/courts/${court.id}`, payload)
        : await client.post('/admin/courts', payload)
      onSaved(res.data)
    } catch (err) {
      setError(err.message || 'Failed to save court.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide">
        <div className="modal__header">
          <h3>{isEdit ? 'Edit Court' : 'Add New Court'}</h3>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Court Name *</label>
            <input name="name" type="text" placeholder="Court A" value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea name="description" placeholder="Short description…" value={form.description} onChange={handleChange} rows={2} />
          </div>

          <div className="form-group">
            <label>Location *</label>
            <textarea
              name="location"
              placeholder="Unit / Floor, Building Name, Street, City, Province"
              value={form.location}
              onChange={handleChange}
              rows={3}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Owner Name *</label>
              <input name="ownerName" type="text" placeholder="Juan dela Cruz" value={form.ownerName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Rate (₱/hr) *</label>
              <input
                name="hourlyRate" type="number" min="1" step="0.01"
                placeholder="500.00" value={form.hourlyRate}
                onChange={handleChange} required
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>Contact Number *</span>
              <span className={`phone-digit-count${
                form.contactNumber.length > 0 && form.contactNumber.length !== 11
                  ? ' phone-digit-count--error'
                  : form.contactNumber.length === 11
                    ? ' phone-digit-count--ok'
                    : ''
              }`}>{form.contactNumber.length}/11</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={11}
              placeholder="09171234567"
              value={form.contactNumber}
              className={form.contactNumber.length > 0 && form.contactNumber.length !== 11 ? 'input-invalid' : ''}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                setForm(f => ({ ...f, contactNumber: digits }))
              }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Opening Time *</label>
              <select name="openTime" value={form.openTime} onChange={handleChange} required>
                {HOUR_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Closing Time *</label>
              <select name="closeTime" value={form.closeTime} onChange={handleChange} required>
                {HOUR_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Court Type</label>
            <div className="court-type-toggle">
              <button
                type="button"
                className={`court-type-btn${!form.indoor ? ' active' : ''}`}
                onClick={() => setForm(f => ({ ...f, indoor: false }))}
              >
                ☀ Outdoor
              </button>
              <button
                type="button"
                className={`court-type-btn${form.indoor ? ' active' : ''}`}
                onClick={() => setForm(f => ({ ...f, indoor: true }))}
              >
                🏠 Indoor
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Number of Playable Courts</label>
            <input
              name="totalCourts" type="number" min="1" max="20" step="1"
              value={form.totalCourts}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>GCash QR Code</label>
            <input
              ref={qrInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleQrFile}
            />
            {form.gcashQrCode ? (
              <div className="qr-attached">
                <div className="qr-preview">
                  <img src={form.gcashQrCode} alt="GCash QR" />
                </div>
                <div className="qr-attached__actions">
                  <button type="button" className="qr-replace-btn" onClick={() => qrInputRef.current?.click()}>
                    ↺ Replace
                  </button>
                  <button
                    type="button"
                    className="qr-remove-btn"
                    onClick={() => setForm(f => ({ ...f, gcashQrCode: '' }))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="qr-dropzone" onClick={() => qrInputRef.current?.click()}>
                <div className="qr-dropzone__plus">+</div>
                <span className="qr-dropzone__label">Attach QR Code</span>
              </button>
            )}
          </div>

          <button type="submit" className="btn btn-neon btn-block" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Court'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Bookings Tab ───────────────────────────────────────── */
function groupBookings(bookings) {
  const groups = new Map()
  bookings.forEach(b => {
    const key = `${b.userId}-${b.courtId}-${b.bookingDate}-${b.startTime}-${b.endTime}`
    if (groups.has(key)) {
      const g = groups.get(key)
      g.ids.push(b.id)
      g.courtNumbers.push(b.courtNumber)
      g.totalAmount = (Number(g.totalAmount) + Number(b.totalAmount)).toFixed(2)
      g.bookings.push(b)
    } else {
      groups.set(key, {
        key, ids: [b.id], status: b.status,
        bookingDate: b.bookingDate, startTime: b.startTime, endTime: b.endTime,
        courtName: b.courtName, courtNumbers: [b.courtNumber], totalAmount: b.totalAmount,
        username: b.username, userEmail: b.userEmail,
        userId: b.userId, courtId: b.courtId, createdAt: b.createdAt,
        bookings: [b],
      })
    }
  })
  return [...groups.values()]
}

function BookingsTab() {
  const [bookings,        setBookings]        = useState([])
  const [courts,          setCourts]          = useState([])
  const [loading,         setLoading]         = useState(true)
  const [search,          setSearch]          = useState('')
  const [sortKey,         setSortKey]         = useState('createdAt')
  const [sortDir,         setSortDir]         = useState('desc')
  const [page,            setPage]            = useState(1)
  const [expanded,        setExpanded]        = useState(new Set())
  const [calModal,        setCalModal]        = useState(null)
  const [selectedCourtId, setSelectedCourtId] = useState(null)
  const [calendarDate,    setCalendarDate]    = useState(() => localDateISO(new Date()))

  useEffect(() => {
    Promise.all([
      client.get('/admin/bookings'),
      client.get('/admin/courts'),
    ]).then(([bRes, cRes]) => {
      setBookings(bRes.data)
      setCourts(cRes.data)
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const activeCourts = useMemo(() => courts.filter(c => c.active), [courts])
  const multiLocation = activeCourts.length >= 2

  useEffect(() => {
    if (activeCourts.length === 1) setSelectedCourtId(activeCourts[0].id)
  }, [activeCourts])

  const selectedCourt = activeCourts.find(c => c.id === selectedCourtId) ?? null

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return bookings.filter(b => !q ||
      String(b.id).includes(q) ||
      b.username.toLowerCase().includes(q) ||
      b.userEmail.toLowerCase().includes(q) ||
      b.courtName.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q)
    )
  }, [bookings, search])

  const groups = useMemo(() => {
    const gs = groupBookings(filtered)
    return gs.sort((a, b) => {
      let va, vb
      if (sortKey === 'id') { va = a.ids[0]; vb = b.ids[0] }
      else if (sortKey === 'totalAmount') { va = Number(a.totalAmount); vb = Number(b.totalAmount) }
      else { va = a[sortKey] ?? ''; vb = b[sortKey] ?? '' }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
  }, [filtered, sortKey, sortDir])

  useEffect(() => { setPage(1) }, [search, sortKey, sortDir])

  const totalPages  = Math.ceil(groups.length / PAGE_SIZE)
  const pageGroups  = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const todayISO      = localDateISO(new Date())
  const isCalToday    = calendarDate === todayISO

  const navigateCalDate = (delta) => {
    const [y, m, d] = calendarDate.split('-').map(Number)
    const date = new Date(y, m - 1, d + delta)
    setCalendarDate(localDateISO(date))
  }

  const todayBookings = bookings.filter(b =>
    (b.status === 'CONFIRMED' || b.status === 'PENDING') &&
    b.bookingDate === calendarDate &&
    (selectedCourtId ? b.courtId === selectedCourtId : true)
  )

  const openHour  = selectedCourt?.openTime  ? parseInt(selectedCourt.openTime)  : 7
  const closeHour = selectedCourt?.closeTime ? parseInt(selectedCourt.closeTime) : 22
  const HOURS     = Array.from({ length: closeHour - openHour + 1 }, (_, i) => i + openHour)
  const numCourts = selectedCourt?.totalCourts ?? 1
  const courtNums = Array.from({ length: numCourts }, (_, i) => i + 1)

  const getBookingAt = (hour, cn) =>
    todayBookings.find(b => b.courtNumber === cn && parseInt(b.startTime) === hour) ?? null

  const getCoveringBooking = (hour, cn) =>
    todayBookings.find(b =>
      b.courtNumber === cn && parseInt(b.startTime) < hour && parseInt(b.endTime) >= hour
    ) ?? null

  const calendarUsers = useMemo(() => {
    const seen = new Map()
    todayBookings.forEach(b => { if (!seen.has(b.userId)) seen.set(b.userId, { userId: b.userId, username: b.username }) })
    return [...seen.values()].sort((a, b) => a.username.localeCompare(b.username))
  }, [todayBookings])

  const fmtHour = h => h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`

  const SortTh = ({ label, k }) => (
    <th className={`sortable${sortKey === k ? ` ${sortDir}` : ''}`} onClick={() => toggleSort(k)}>
      {label}<span className="sort-arrow">{sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}</span>
    </th>
  )

  return (
    <>
      {/* ── Schedule Calendar ── */}
      <div className="today-calendar">
        <div className="today-calendar__header">
          {isCalToday ? "Today's Schedule" : 'Schedule'} —{' '}
          {new Date(calendarDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          })}
        </div>

        {/* Date navigation */}
        <div className="cal-date-nav">
          <button className="cal-nav-btn" onClick={() => navigateCalDate(-1)} title="Previous day">← Prev</button>
          <button
            className={`cal-nav-btn${isCalToday ? ' cal-nav-btn--active' : ''}`}
            onClick={() => setCalendarDate(todayISO)}
          >Today</button>
          <input
            type="date"
            className="cal-date-input"
            value={calendarDate}
            onChange={e => setCalendarDate(e.target.value)}
          />
          <button className="cal-nav-btn" onClick={() => navigateCalDate(1)} title="Next day">Next →</button>
        </div>

        {/* User color legend */}
        {calendarUsers.length > 0 && (
          <div className="cal-legend">
            {calendarUsers.map(u => {
              const c = getUserColor(u.userId)
              return (
                <div key={u.userId} className="cal-legend__item">
                  <span className="cal-legend__dot" style={{ background: c.border }} />
                  <span className="cal-legend__name">{u.username}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Location selector / back button */}
        {multiLocation && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            {selectedCourtId ? (
              <button className="cal-back-btn" onClick={() => setSelectedCourtId(null)}>
                ← All Locations
              </button>
            ) : (
              <div className="location-selector">
                <div className="location-selector__label">Select a location to view its schedule:</div>
                <div className="location-selector__grid">
                  {activeCourts.map(c => (
                    <button key={c.id} className="location-card" onClick={() => setSelectedCourtId(c.id)}>
                      <div className="location-card__name">{c.name}</div>
                      <div className="location-card__sub">
                        {c.totalCourts} court{c.totalCourts !== 1 ? 's' : ''} · {c.indoor ? 'Indoor' : 'Outdoor'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center' }}><div className="loading-spinner" /></div>
        ) : !selectedCourt ? (
          multiLocation
            ? <div className="today-calendar__empty">Choose a location above to see today's schedule.</div>
            : <div className="today-calendar__empty">No confirmed or pending bookings scheduled for today.</div>
        ) : (
          <div className="today-calendar__grid" style={{ overflowX: 'auto' }}>
            <div
              className="cal-grid"
              style={{ gridTemplateColumns: `64px repeat(${numCourts}, minmax(100px, 1fr))` }}
            >
              {/* Header row */}
              <div className="cal-grid__corner" />
              {courtNums.map(cn => (
                <div key={cn} className="cal-grid__col-header">Court {cn}</div>
              ))}

              {/* Hour rows */}
              {HOURS.map(hour => (
                <Fragment key={hour}>
                  <div className="cal-grid__hour-label">{fmtHour(hour)}</div>
                  {courtNums.map(cn => {
                    const booking  = getBookingAt(hour, cn)
                    const covering = !booking ? getCoveringBooking(hour, cn) : null
                    const uc       = booking ? getUserColor(booking.userId) : covering ? getUserColor(covering.userId) : null
                    return (
                      <div
                        key={cn}
                        className={`cal-grid__cell${booking ? ' cal-cell--booked' : covering ? ' cal-cell--covered' : ''}`}
                        style={covering ? { background: uc.bg, borderLeft: `3px solid ${uc.border}` } : undefined}
                      >
                        {booking && (
                          <button
                            className="cal-booking"
                            style={{
                              background: uc.bg, borderColor: uc.border, color: uc.text,
                              ...(booking.status === 'PENDING' ? { borderStyle: 'dashed' } : {}),
                            }}
                            onClick={() => setCalModal(booking)}
                          >
                            <span className="cal-booking__user">{booking.username}</span>
                            <span className="cal-booking__time">{formatTime(booking.startTime)}–{formatTime(booking.endTime)}</span>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bookings Table ── */}
      <div className="table-card">
        <div className="table-toolbar">
          <input
            className="table-search"
            placeholder="Search by ID, user, court or status…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => setSearch('')}>
              Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>
            {groups.length} session{groups.length !== 1 ? 's' : ''} · {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="page-loading"><div className="loading-spinner" /></div>
        ) : groups.length === 0 ? (
          <div className="empty-state"><h3>{search ? 'No results found.' : 'No bookings yet.'}</h3></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <SortTh label="#"      k="id" />
                    <SortTh label="User"   k="username" />
                    <th>Court</th>
                    <SortTh label="Date"   k="bookingDate" />
                    <th>Time</th>
                    <SortTh label="Amount" k="totalAmount" />
                    <SortTh label="Status" k="status" />
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageGroups.map(g => {
                    const isMulti    = g.ids.length > 1
                    const isExpanded = expanded.has(g.key)
                    const toggleExpand = () => setExpanded(prev => {
                      const next = new Set(prev)
                      if (next.has(g.key)) next.delete(g.key); else next.add(g.key)
                      return next
                    })
                    const courtLabel = isMulti
                      ? `Courts ${[...g.courtNumbers].sort((a, b) => a - b).join(', ')}`
                      : `Court ${g.courtNumbers[0]}`
                    return (
                      <Fragment key={g.key}>
                        <tr>
                          <td className="td-muted">
                            {isMulti && (
                              <button className="expand-toggle" onClick={toggleExpand} title={isExpanded ? 'Collapse' : 'Expand'}>
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            )}{' '}
                            {isMulti ? `#${g.ids[0]} +${g.ids.length - 1}` : `#${g.ids[0]}`}
                          </td>
                          <td>
                            <span className="td-primary">{g.username}</span>
                            <span className="td-sub">{g.userEmail}</span>
                          </td>
                          <td>
                            <span className="td-primary">{g.courtName}</span>
                            <span className="td-sub">{courtLabel}</span>
                          </td>
                          <td className="td-muted">{formatDate(g.bookingDate)}</td>
                          <td className="td-muted">{formatTime(g.startTime)} – {formatTime(g.endTime)}</td>
                          <td className="td-accent">₱{Number(g.totalAmount).toFixed(2)}</td>
                          <td><StatusBadge status={g.status} /></td>
                          <td>
                            <div className="td-actions">
                              {g.status === 'PENDING' && (
                                <button className="btn-icon btn-icon--success"
                                  onClick={() => handleConfirmGroup(g.ids, setBookings)}
                                  title={isMulti ? `Confirm all ${g.ids.length} courts` : 'Confirm booking'}>✓</button>
                              )}
                              {(g.status === 'CONFIRMED' || g.status === 'PENDING') && (
                                <button className="btn-icon btn-icon--danger"
                                  onClick={() => handleCancelGroup(g.ids, setBookings)}
                                  title={isMulti ? `Cancel all ${g.ids.length} courts` : 'Cancel booking'}>✕</button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isMulti && isExpanded && g.bookings.map(b => (
                          <tr key={b.id} className="booking-sub-row">
                            <td className="td-muted" style={{ paddingLeft: 28 }}>#{b.id}</td>
                            <td />
                            <td><span className="td-sub">Court {b.courtNumber}</span></td>
                            <td /><td />
                            <td className="td-accent">₱{Number(b.totalAmount).toFixed(2)}</td>
                            <td><StatusBadge status={b.status} /></td>
                            <td />
                          </tr>
                        ))}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} setPage={setPage} totalPages={totalPages} />
          </>
        )}
      </div>

      {/* ── Calendar booking detail modal ── */}
      {calModal && (
        <div className="modal-overlay" onClick={() => setCalModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Booking #{calModal.id}</h3>
              <button className="modal__close" onClick={() => setCalModal(null)}>×</button>
            </div>
            <div className="detail-list" style={{ padding: '0 0 4px' }}>
              <div className="detail-item">
                <span className="detail-item__label">Status</span>
                <span className="detail-item__value"><StatusBadge status={calModal.status} /></span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Court</span>
                <span className="detail-item__value">
                  {calModal.courtName}
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)' }}>
                    {calModal.courtIndoor ? 'Indoor' : 'Outdoor'} · Court {calModal.courtNumber}
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Date</span>
                <span className="detail-item__value">{formatDate(calModal.bookingDate)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Time</span>
                <span className="detail-item__value">{formatTime(calModal.startTime)} – {formatTime(calModal.endTime)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">User</span>
                <span className="detail-item__value">
                  {calModal.username}
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)' }}>{calModal.userEmail}</span>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Amount</span>
                <span className="detail-item__value" style={{ color: 'var(--neon)', fontWeight: 700, fontSize: 18 }}>
                  ₱{Number(calModal.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>
            {(calModal.status === 'CONFIRMED' || calModal.status === 'PENDING') && (
              <div style={{ display: 'flex', gap: 8, padding: '16px 24px 20px' }}>
                {calModal.status === 'PENDING' && (
                  <button
                    className="btn btn-neon"
                    style={{ flex: 1 }}
                    onClick={() => { handleConfirm(calModal.id, setBookings); setCalModal(null) }}
                  >
                    ✓ Confirm
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => { handleCancel(calModal.id); setCalModal(null) }}
                >
                  ✕ Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* ── Payments Tab ───────────────────────────────────────── */
function groupPayments(bookings) {
  const groups = new Map()
  bookings.forEach(b => {
    const key = `${b.userId}-${b.courtId}-${b.bookingDate}-${b.startTime}-${b.endTime}`
    if (groups.has(key)) {
      const g = groups.get(key)
      g.ids.push(b.id)
      g.courtNumbers.push(b.courtNumber)
      g.totalAmount = (Number(g.totalAmount) + Number(b.totalAmount)).toFixed(2)
    } else {
      groups.set(key, {
        key,
        ids:          [b.id],
        status:       b.status,
        bookingDate:  b.bookingDate,
        startTime:    b.startTime,
        endTime:      b.endTime,
        courtName:    b.courtName,
        courtNumbers: [b.courtNumber],
        totalAmount:  b.totalAmount,
        paymentReceipt: b.paymentReceipt,
        username:     b.username,
        userEmail:    b.userEmail,
      })
    }
  })
  return [...groups.values()]
}

function PaymentsTab() {
  const [bookings,     setBookings]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [receiptModal, setReceiptModal] = useState(null)
  const [page,         setPage]         = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    client.get('/admin/bookings/pending')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const groups     = useMemo(() => groupPayments(bookings), [bookings])
  const totalPages = Math.ceil(groups.length / PAGE_SIZE)
  const pageGroups = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleConfirmLocal = async (ids) => {
    if (!window.confirm('Confirm this booking?')) return
    try {
      await Promise.allSettled(ids.map(id => client.patch(`/admin/bookings/${id}/confirm`)))
      setBookings(bs => bs.filter(b => !ids.includes(b.id)))
    } catch {
      alert('Could not confirm booking.')
    }
  }

  const handleCancelLocal = async (ids) => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      await Promise.allSettled(ids.map(id => client.patch(`/admin/bookings/${id}/cancel`)))
      setBookings(bs => bs.filter(b => !ids.includes(b.id)))
    } catch {
      alert('Could not cancel booking.')
    }
  }

  const courtLabel = g =>
    g.courtNumbers.length === 1
      ? `, Court ${g.courtNumbers[0]}`
      : `, Courts ${[...g.courtNumbers].sort((a, b) => a - b).join(', ')}`

  return (
    <>
      {loading ? (
        <div className="page-loading"><div className="loading-spinner" /></div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <h3>No pending payments.</h3>
          <p>All bookings have been reviewed.</p>
        </div>
      ) : (
        <>
          <div className="payment-cards">
            {pageGroups.map(g => (
              <div key={g.key} className="payment-card-admin">
                <div className="payment-card-admin__header">
                  <div>
                    <span className="payment-card-admin__id">
                      #{g.ids.length === 1 ? g.ids[0] : `${g.ids[0]}+${g.ids.length - 1}`}
                    </span>
                    <span className="payment-card-admin__court-label">
                      {' · '}{g.courtName}{courtLabel(g)}
                    </span>
                  </div>
                  <span className="badge badge-pending">PENDING</span>
                </div>

                <div className="payment-card-admin__body">
                  <div className="payment-card-admin__date">
                    {formatDate(g.bookingDate)} · {formatTime(g.startTime)} – {formatTime(g.endTime)}
                  </div>
                  <div className="payment-card-admin__user">
                    <span className="td-primary">{g.username}</span>
                    <span className="td-sub">{g.userEmail}</span>
                  </div>
                  <div className="payment-card-admin__amount">₱{Number(g.totalAmount).toFixed(2)}</div>

                  <div className="payment-card-admin__receipt">
                    {g.paymentReceipt ? (
                      <button
                        className="receipt-view-btn"
                        onClick={() => setReceiptModal(g.paymentReceipt)}
                        title="View receipt"
                      >
                        <img src={g.paymentReceipt} alt="Receipt" className="receipt-thumb-sm" />
                        <span>View Receipt</span>
                      </button>
                    ) : (
                      <span className="payment-no-receipt">No receipt uploaded yet</span>
                    )}
                  </div>
                </div>

                <div className="payment-card-admin__actions">
                  <button
                    className="btn btn-neon"
                    style={{ flex: 1 }}
                    onClick={() => handleConfirmLocal(g.ids)}
                  >
                    ✓ Confirm{g.ids.length > 1 ? ` All (${g.ids.length})` : ''}
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => handleCancelLocal(g.ids)}
                  >
                    ✕ Cancel{g.ids.length > 1 ? ' All' : ''}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} setPage={setPage} totalPages={totalPages} />
        </>
      )}

      {receiptModal && (
        <div className="modal-overlay" onClick={() => setReceiptModal(null)}>
          <div className="modal" style={{ maxWidth: 480, padding: 0, overflow: 'hidden' }}>
            <div className="modal__header">
              <h3>Payment Receipt</h3>
              <button className="modal__close" onClick={() => setReceiptModal(null)}>×</button>
            </div>
            <img src={receiptModal} alt="Payment receipt" style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain', background: '#fff' }} />
          </div>
        </div>
      )}
    </>
  )
}

/* ── Shared helpers ─────────────────────────────────────── */

function localDateISO(date) {
  const y  = date.getFullYear()
  const m  = String(date.getMonth() + 1).padStart(2, '0')
  const d  = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function handleConfirm(id, setBookings) {
  if (!window.confirm('Confirm this booking?')) return
  try {
    const res = await client.patch(`/admin/bookings/${id}/confirm`)
    setBookings(bs => bs.map(b => b.id === id ? res.data : b))
  } catch {
    alert('Could not confirm booking.')
  }
}

async function handleConfirmGroup(ids, setBookings) {
  if (!window.confirm(`Confirm this booking${ids.length > 1 ? ` (${ids.length} courts)` : ''}?`)) return
  try {
    const results = await Promise.allSettled(ids.map(id => client.patch(`/admin/bookings/${id}/confirm`)))
    const confirmed = results.filter(r => r.status === 'fulfilled').map(r => r.value.data)
    if (confirmed.length > 0) {
      const map = new Map(confirmed.map(b => [b.id, b]))
      setBookings(bs => bs.map(b => map.has(b.id) ? map.get(b.id) : b))
    }
  } catch { alert('Could not confirm booking.') }
}

async function handleCancelGroup(ids, setBookings) {
  if (!window.confirm(`Cancel this booking${ids.length > 1 ? ` (${ids.length} courts)` : ''}?`)) return
  try {
    const results = await Promise.allSettled(ids.map(id => client.patch(`/admin/bookings/${id}/cancel`)))
    const cancelled = results.filter(r => r.status === 'fulfilled').map(r => r.value.data)
    if (cancelled.length > 0) {
      const map = new Map(cancelled.map(b => [b.id, b]))
      setBookings(bs => bs.map(b => map.has(b.id) ? map.get(b.id) : b))
    }
  } catch { alert('Could not cancel booking.') }
}

function Pagination({ page, setPage, totalPages }) {
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <button className="pagination__btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
      <span className="pagination__info">{page} / {totalPages}</span>
      <button className="pagination__btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</button>
    </div>
  )
}

function ActiveBadge({ active }) {
  return <span className={`badge ${active ? 'badge-confirmed' : 'badge-cancelled'}`}>{active ? 'Active' : 'Inactive'}</span>
}

function StatusBadge({ status }) {
  const map = { CONFIRMED: 'badge-confirmed', CANCELLED: 'badge-cancelled', PENDING: 'badge-pending' }
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
