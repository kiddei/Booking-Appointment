import { useEffect, useState, useCallback, useRef, useMemo } from 'react'

const PAGE_SIZE = 10
import client from '../api/client'

/* ── Country dial-code list (Philippines default) ─────── */
const COUNTRIES = [
  { code: 'PH', flag: '🇵🇭', dial: '+63',  name: 'Philippines' },
  { code: 'SG', flag: '🇸🇬', dial: '+65',  name: 'Singapore' },
  { code: 'MY', flag: '🇲🇾', dial: '+60',  name: 'Malaysia' },
  { code: 'ID', flag: '🇮🇩', dial: '+62',  name: 'Indonesia' },
  { code: 'TH', flag: '🇹🇭', dial: '+66',  name: 'Thailand' },
  { code: 'VN', flag: '🇻🇳', dial: '+84',  name: 'Vietnam' },
  { code: 'JP', flag: '🇯🇵', dial: '+81',  name: 'Japan' },
  { code: 'KR', flag: '🇰🇷', dial: '+82',  name: 'South Korea' },
  { code: 'CN', flag: '🇨🇳', dial: '+86',  name: 'China' },
  { code: 'IN', flag: '🇮🇳', dial: '+91',  name: 'India' },
  { code: 'AU', flag: '🇦🇺', dial: '+61',  name: 'Australia' },
  { code: 'GB', flag: '🇬🇧', dial: '+44',  name: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', dial: '+1',   name: 'United States' },
  { code: 'CA', flag: '🇨🇦', dial: '+1',   name: 'Canada' },
  { code: 'AE', flag: '🇦🇪', dial: '+971', name: 'UAE' },
]

function parsePhone(stored) {
  if (!stored) return { dial: '+63', num: '' }
  const match = COUNTRIES.find(c => stored.startsWith(c.dial + ' '))
  if (match) return { dial: match.dial, num: stored.slice(match.dial.length + 1) }
  return { dial: '+63', num: stored }
}

/* ── Page shell ─────────────────────────────────────────── */
export default function AdminPage() {
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
              { key: 'users',     label: 'Users'     },
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
          {tab === 'courts'    && <CourtsTab />}
          {tab === 'users'     && <UsersTab />}
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
      <StatCard label="Total Courts"      value={stats.totalCourts}  sub={`${stats.activeCourts} active`} />
      <StatCard label="Registered Users"  value={stats.totalUsers} />
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
function CourtsTab() {
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

  const totalPages  = Math.ceil(courts.length / PAGE_SIZE)
  const pageCourts  = courts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
                {pageCourts.map(c => (
                  <tr key={c.id} className={!c.active ? 'row-inactive' : ''}>
                    <td>
                      <span className="td-primary">{c.name}</span>
                      {c.description && <span className="td-sub">{c.description}</span>}
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
                    </td>
                  </tr>
                ))}
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
  contactNumber: '', gcashQrCode: '', hourlyRate: '', indoor: false, totalCourts: 1,
}

function CourtModal({ court, onClose, onSaved }) {
  const isEdit = Boolean(court)

  const initPhone = parsePhone(court?.contactNumber ?? '')
  const [form,    setForm]    = useState(court ? {
    name:          court.name,
    description:   court.description   ?? '',
    location:      court.location      ?? '',
    ownerName:     court.ownerName     ?? '',
    gcashQrCode:   court.gcashQrCode   ?? '',
    hourlyRate:    court.hourlyRate,
    indoor:        court.indoor,
    totalCourts:   court.totalCourts   ?? 1,
    contactNumber: court.contactNumber ?? '',
  } : EMPTY_COURT)
  const [dialCode, setDialCode] = useState(initPhone.dial)
  const [phoneNum, setPhoneNum] = useState(initPhone.num)
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
    setLoading(true)
    const contactNumber = phoneNum ? `${dialCode} ${phoneNum}` : ''
    try {
      const payload = { ...form, contactNumber, hourlyRate: Number(form.hourlyRate), totalCourts: Number(form.totalCourts) }
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

          {/* Court name */}
          <div className="form-group">
            <label>Court Name *</label>
            <input name="name" type="text" placeholder="Court A" value={form.name} onChange={handleChange} required />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" placeholder="Short description…" value={form.description} onChange={handleChange} rows={2} />
          </div>

          {/* Location */}
          <div className="form-group">
            <label>Location</label>
            <textarea
              name="location"
              placeholder="Unit / Floor, Building Name, Street, City, Province"
              value={form.location}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Owner name + Rate */}
          <div className="form-row">
            <div className="form-group">
              <label>Owner Name</label>
              <input name="ownerName" type="text" placeholder="Juan dela Cruz" value={form.ownerName} onChange={handleChange} />
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

          {/* Contact number — full width so the phone input has room */}
          <div className="form-group">
            <label>Contact Number</label>
            <div className="phone-input">
              <select
                className="phone-input__select"
                value={dialCode}
                onChange={e => setDialCode(e.target.value)}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>
                ))}
              </select>
              <input
                type="tel"
                className="phone-input__number"
                placeholder="912 345 6789"
                value={phoneNum}
                onChange={e => setPhoneNum(e.target.value)}
              />
            </div>
          </div>

          {/* Court type — segment control */}
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

          {/* Number of playable courts */}
          <div className="form-group">
            <label>Number of Playable Courts</label>
            <input
              name="totalCourts" type="number" min="1" max="20" step="1"
              value={form.totalCourts}
              onChange={handleChange}
              required
            />
          </div>

          {/* GCash QR — dashed dropzone */}
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

/* ── Users Tab ──────────────────────────────────────────── */
function UsersTab() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)

  useEffect(() => {
    client.get('/admin/users')
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRoleToggle = async (user) => {
    const newRole = user.role === 'ADMIN' ? 'PLAYER' : 'ADMIN'
    if (!window.confirm(`Change ${user.username}'s role to ${newRole}?`)) return
    try {
      const res = await client.patch(`/admin/users/${user.id}/role`, { role: newRole })
      setUsers(us => us.map(u => u.id === user.id ? { ...u, ...res.data } : u))
    } catch {
      alert('Could not update role.')
    }
  }

  const handleToggleActive = async (user) => {
    const action = user.active ? 'disable' : 'enable'
    const label  = user.active ? 'Disable' : 'Enable'
    if (!window.confirm(`${label} account for "${user.username}"?`)) return
    try {
      const res = await client.patch(`/admin/users/${user.id}/${action}`)
      setUsers(us => us.map(u => u.id === user.id ? { ...u, ...res.data } : u))
    } catch {
      alert(`Could not ${action} user.`)
    }
  }

  const totalPages = Math.ceil(users.length / PAGE_SIZE)
  const pageUsers  = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="table-card">
      {loading ? (
        <div className="page-loading"><div className="loading-spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state"><h3>No users found.</h3></div>
      ) : (
        <>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Bookings</th>
                <th>Joined</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.map(u => (
                <tr key={u.id} className={!u.active ? 'row-inactive' : ''}>
                  <td className="td-primary">{u.username}</td>
                  <td className="td-muted">{u.email}</td>
                  <td>
                    <span className={`role-badge role-badge--${u.role.toLowerCase()}`}>{u.role}</span>
                  </td>
                  <td className="td-center">{u._count?.bookings ?? 0}</td>
                  <td className="td-muted">{formatDate(u.createdAt)}</td>
                  <td><ActiveBadge active={u.active} /></td>
                  <td>
                    <div className="td-actions">
                      <button
                        className="btn-icon btn-icon--edit"
                        onClick={() => handleRoleToggle(u)}
                        title={u.role === 'ADMIN' ? 'Demote to Player' : 'Promote to Admin'}
                      >
                        ⇅
                      </button>
                      <button
                        className={`btn-icon ${u.active ? 'btn-icon--danger' : 'btn-icon--success'}`}
                        onClick={() => handleToggleActive(u)}
                        title={u.active ? 'Disable account' : 'Enable account'}
                      >
                        {u.active ? '✕' : '✓'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} setPage={setPage} totalPages={totalPages} />
        </>
      )}
    </div>
  )
}

/* ── Bookings Tab ───────────────────────────────────────── */
function BookingsTab() {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [sortKey,  setSortKey]  = useState('createdAt')
  const [sortDir,  setSortDir]  = useState('desc')
  const [page,     setPage]     = useState(1)

  useEffect(() => {
    client.get('/admin/bookings')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      const res = await client.patch(`/admin/bookings/${id}/cancel`)
      setBookings(bs => bs.map(b => b.id === id ? res.data : b))
    } catch {
      alert('Could not cancel booking.')
    }
  }

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return bookings
      .filter(b => !q ||
        String(b.id).includes(q) ||
        b.username.toLowerCase().includes(q) ||
        b.userEmail.toLowerCase().includes(q) ||
        b.courtName.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey]
        if (sortKey === 'totalAmount') { va = Number(va); vb = Number(vb) }
        if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
      })
  }, [bookings, search, sortKey, sortDir])

  useEffect(() => { setPage(1) }, [search, sortKey, sortDir])

  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE)
  const pageBookings = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const SortTh = ({ label, k }) => (
    <th className={`sortable${sortKey === k ? ` ${sortDir}` : ''}`} onClick={() => toggleSort(k)}>
      {label}<span className="sort-arrow">{sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}</span>
    </th>
  )

  return (
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
          {filtered.length} of {bookings.length}
        </span>
      </div>

      {loading ? (
        <div className="page-loading"><div className="loading-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><h3>{search ? 'No results found.' : 'No bookings yet.'}</h3></div>
      ) : (
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
              {pageBookings.map(b => (
                <tr key={b.id}>
                  <td className="td-muted">{b.id}</td>
                  <td>
                    <span className="td-primary">{b.username}</span>
                    <span className="td-sub">{b.userEmail}</span>
                  </td>
                  <td>
                    <span className="td-primary">{b.courtName}</span>
                    {b.courtNumber && <span className="td-sub">Court {b.courtNumber}</span>}
                  </td>
                  <td className="td-muted">{formatDate(b.bookingDate)}</td>
                  <td className="td-muted">{formatTime(b.startTime)} – {formatTime(b.endTime)}</td>
                  <td className="td-accent">₱{Number(b.totalAmount).toFixed(2)}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    <div className="td-actions">
                      {b.status === 'PENDING' && (
                        <button className="btn-icon btn-icon--success" onClick={() => handleConfirm(b.id, setBookings)} title="Confirm booking">✓</button>
                      )}
                      {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                        <button className="btn-icon btn-icon--danger" onClick={() => handleCancel(b.id)} title="Cancel booking">✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} setPage={setPage} totalPages={totalPages} />
      )}
    </div>
  )
}

/* ── Payments Tab ───────────────────────────────────────── */
function PaymentsTab() {
  const [bookings,      setBookings]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [receiptModal,  setReceiptModal]  = useState(null)
  const [page,          setPage]          = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    client.get('/admin/bookings/pending')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const totalPages   = Math.ceil(bookings.length / PAGE_SIZE)
  const pageBookings = bookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleConfirmLocal = async (id) => {
    if (!window.confirm('Confirm this booking?')) return
    try {
      await client.patch(`/admin/bookings/${id}/confirm`)
      setBookings(bs => bs.filter(b => b.id !== id))
    } catch {
      alert('Could not confirm booking.')
    }
  }

  const handleCancelLocal = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      await client.patch(`/admin/bookings/${id}/cancel`)
      setBookings(bs => bs.filter(b => b.id !== id))
    } catch {
      alert('Could not cancel booking.')
    }
  }

  return (
    <>
      <div className="table-card">
        {loading ? (
          <div className="page-loading"><div className="loading-spinner" /></div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <h3>No pending payments.</h3>
            <p>All bookings have been reviewed.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Court</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Receipt</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageBookings.map(b => (
                  <tr key={b.id}>
                    <td className="td-muted">{b.id}</td>
                    <td>
                      <span className="td-primary">{b.username}</span>
                      <span className="td-sub">{b.userEmail}</span>
                    </td>
                    <td>
                      <span className="td-primary">{b.courtName}</span>
                      {b.courtNumber && <span className="td-sub">Court {b.courtNumber}</span>}
                    </td>
                    <td className="td-muted">
                      {formatDate(b.bookingDate)}
                      <span className="td-sub">{formatTime(b.startTime)} – {formatTime(b.endTime)}</span>
                    </td>
                    <td className="td-accent">₱{Number(b.totalAmount).toFixed(2)}</td>
                    <td>
                      {b.paymentReceipt ? (
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: 12, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}
                          onClick={() => setReceiptModal(b.paymentReceipt)}
                          title="View receipt"
                        >
                          <img src={b.paymentReceipt} alt="Receipt" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 3, background: '#fff' }} />
                          View
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>No receipt</span>
                      )}
                    </td>
                    <td>
                      <div className="td-actions">
                        <button
                          className="btn-icon btn-icon--success"
                          onClick={() => handleConfirmLocal(b.id)}
                          title="Confirm booking"
                        >✓</button>
                        <button
                          className="btn-icon btn-icon--danger"
                          onClick={() => handleCancelLocal(b.id)}
                          title="Cancel booking"
                        >✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} setPage={setPage} totalPages={totalPages} />
        )}
      </div>

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

async function handleConfirm(id, setBookings) {
  if (!window.confirm('Confirm this booking?')) return
  try {
    const res = await client.patch(`/admin/bookings/${id}/confirm`)
    setBookings(bs => bs.map(b => b.id === id ? res.data : b))
  } catch {
    alert('Could not confirm booking.')
  }
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
