import { useEffect, useState, useCallback, useRef, useMemo, Fragment } from 'react'
import client from '../api/client'

const PAGE_SIZE = 10
const ALL_ROLES = ['PLAYER', 'ADMIN', 'SUPER_ADMIN']

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
export default function SuperAdminPage() {
  const [tab, setTab] = useState('overview')

  return (
    <>
      <div className="page-header page-header--superadmin">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="superadmin-crown">👑</span>
            <div>
              <h1>Super Admin Panel</h1>
              <p>Global management — all users, courts, and bookings.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-page">
        <div className="container">
          <div className="admin-tabs">
            {[
              { key: 'overview',  label: 'Overview'  },
              { key: 'users',     label: 'Users'     },
              { key: 'courts',    label: 'Courts'    },
              { key: 'bookings',  label: 'Bookings'  },
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

          {tab === 'overview' && <SAOverviewTab />}
          {tab === 'users'    && <SAUsersTab />}
          {tab === 'courts'   && <SACourtsTab />}
          {tab === 'bookings' && <SABookingsTab />}
        </div>
      </div>
    </>
  )
}

/* ── Overview ───────────────────────────────────────────── */
function SAOverviewTab() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/superadmin/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading"><div className="loading-spinner" /></div>
  if (!stats)  return <div className="empty-state"><h3>Could not load stats.</h3></div>

  return (
    <div className="admin-stats-grid">
      <StatCard label="Total Courts"         value={stats.totalCourts}      sub={`${stats.activeCourts} active`} />
      <StatCard label="Total Users"          value={stats.totalUsers}       sub={`${stats.totalPlayers} players · ${stats.totalAdmins} admins · ${stats.totalSuperAdmins} super admins`} />
      <StatCard label="Confirmed Bookings"   value={stats.totalBookings}    sub={stats.pendingBookings > 0 ? `${stats.pendingBookings} pending` : undefined} />
      <StatCard
        label="Total Revenue (Global)"
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

/* ── Users Tab ──────────────────────────────────────────── */
function SAUsersTab() {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [page,       setPage]       = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser,   setEditUser]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    client.get('/superadmin/users')
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleRoleChange = async (user, newRole) => {
    if (!window.confirm(`Change ${user.username}'s role to ${newRole}?`)) return
    try {
      const res = await client.patch(`/superadmin/users/${user.id}/role`, { role: newRole })
      setUsers(us => us.map(u => u.id === user.id ? { ...u, ...res.data } : u))
    } catch (err) {
      alert(err.message || 'Could not update role.')
    }
  }

  const handleToggleActive = async (user) => {
    const action = user.active ? 'disable' : 'enable'
    const label  = user.active ? 'Disable' : 'Enable'
    if (!window.confirm(`${label} account for "${user.username}"?`)) return
    try {
      const res = await client.patch(`/superadmin/users/${user.id}/${action}`)
      setUsers(us => us.map(u => u.id === user.id ? { ...u, ...res.data } : u))
    } catch (err) {
      alert(err.message || `Could not ${action} user.`)
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Permanently delete "${user.username}"? This cannot be undone.`)) return
    try {
      await client.delete(`/superadmin/users/${user.id}`)
      setUsers(us => us.filter(u => u.id !== user.id))
    } catch (err) {
      alert(err.message || 'Could not delete user.')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u =>
      (roleFilter === 'ALL' || u.role === roleFilter) &&
      (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
  }, [users, search, roleFilter])

  useEffect(() => { setPage(1) }, [search, roleFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageUsers  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <div className="admin-actions" style={{ gap: 8 }}>
        <button className="btn btn-neon" onClick={() => setShowCreate(true)}>+ Create User</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="table-search"
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ minWidth: 200 }}
          />
          <select
            className="sa-role-filter"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            <option value="PLAYER">Player</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="page-loading"><div className="loading-spinner" /></div>
        ) : filtered.length === 0 ? (
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
                    <th>Courts</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageUsers.map(u => (
                    <tr key={u.id} className={!u.active ? 'row-inactive' : ''}>
                      <td className="td-primary">{u.username}</td>
                      <td className="td-muted">{u.email}</td>
                      <td>
                        <select
                          className={`sa-role-select sa-role-select--${u.role.toLowerCase().replace('_', '-')}`}
                          value={u.role}
                          onChange={e => handleRoleChange(u, e.target.value)}
                        >
                          {ALL_ROLES.map(r => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td className="td-center">{u._count?.bookings ?? 0}</td>
                      <td className="td-center">{u._count?.courtsCreated ?? 0}</td>
                      <td className="td-muted">{formatDate(u.createdAt)}</td>
                      <td><ActiveBadge active={u.active} /></td>
                      <td>
                        <div className="td-actions">
                          <button
                            className="btn-icon btn-icon--edit"
                            onClick={() => setEditUser(u)}
                            title="Edit user"
                          >✎</button>
                          <button
                            className={`btn-icon ${u.active ? 'btn-icon--danger' : 'btn-icon--success'}`}
                            onClick={() => handleToggleActive(u)}
                            title={u.active ? 'Disable account' : 'Enable account'}
                          >
                            {u.active ? '✕' : '✓'}
                          </button>
                          <button
                            className="btn-icon btn-icon--delete"
                            onClick={() => handleDelete(u)}
                            title="Delete user"
                          >🗑</button>
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

      {showCreate && (
        <UserModal
          onClose={() => setShowCreate(false)}
          onSaved={u => { setUsers(us => [...us, u]); setShowCreate(false) }}
        />
      )}
      {editUser && (
        <UserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={updated => {
            setUsers(us => us.map(u => u.id === updated.id ? { ...u, ...updated } : u))
            setEditUser(null)
          }}
        />
      )}
    </>
  )
}

/* ── User Create / Edit Modal ───────────────────────────── */
function UserModal({ user, onClose, onSaved }) {
  const isEdit = Boolean(user)
  const [form,    setForm]    = useState({
    username: user?.username ?? '',
    email:    user?.email    ?? '',
    password: '',
    role:     user?.role     ?? 'PLAYER',
    active:   user?.active   ?? true,
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!isEdit && form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const payload = { ...form }
      if (isEdit && !payload.password) delete payload.password
      const res = isEdit
        ? await client.patch(`/superadmin/users/${user.id}`, payload)
        : await client.post('/superadmin/users', payload)
      onSaved(res.data)
    } catch (err) {
      setError(err.message || 'Failed to save user.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <h3>{isEdit ? 'Edit User' : 'Create User'}</h3>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
          <div className="form-group">
            <label>Username *</label>
            <input name="username" type="text" value={form.username} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input
              name="password" type="password"
              value={form.password} onChange={handleChange}
              required={!isEdit}
              placeholder={isEdit ? '(unchanged)' : 'Min. 8 characters'}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Role</label>
              <select name="role" value={form.role} onChange={handleChange}>
                {ALL_ROLES.map(r => (
                  <option key={r} value={r}>{r.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            {isEdit && (
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 28 }}>
                <input
                  id="modal-active"
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={handleChange}
                  style={{ width: 16, height: 16, accentColor: 'var(--neon)' }}
                />
                <label htmlFor="modal-active" style={{ marginBottom: 0, cursor: 'pointer' }}>Active account</label>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-neon btn-block"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Courts Tab ─────────────────────────────────────────── */
function SACourtsTab() {
  const [courts,  setCourts]  = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(1)

  useEffect(() => {
    client.get('/superadmin/courts')
      .then(r => setCourts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return courts.filter(c =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.location ?? '').toLowerCase().includes(q) ||
      (c.createdByAdmin?.username ?? '').toLowerCase().includes(q)
    )
  }, [courts, search])

  useEffect(() => { setPage(1) }, [search])

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const pageCourts  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <div className="admin-actions">
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
          Viewing all {courts.length} courts across all admins (read-only)
        </span>
        <input
          className="table-search"
          style={{ marginLeft: 'auto', minWidth: 220 }}
          placeholder="Search courts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card">
        {loading ? (
          <div className="page-loading"><div className="loading-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><h3>No courts found.</h3></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Court</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th># Courts</th>
                    <th>Rate/hr</th>
                    <th>Bookings</th>
                    <th>Owner (Admin)</th>
                    <th>Status</th>
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
                      <td><span className="court-card__badge">{c.indoor ? 'Indoor' : 'Outdoor'}</span></td>
                      <td className="td-center">{c.totalCourts ?? 1}</td>
                      <td className="td-accent">₱{Number(c.hourlyRate).toFixed(2)}</td>
                      <td className="td-center">{c._count?.bookings ?? 0}</td>
                      <td className="td-muted">
                        {c.createdByAdmin
                          ? <><span className="td-primary">{c.createdByAdmin.username}</span><span className="td-sub">{c.createdByAdmin.email}</span></>
                          : '—'
                        }
                      </td>
                      <td><ActiveBadge active={c.active} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} setPage={setPage} totalPages={totalPages} />
          </>
        )}
      </div>
    </>
  )
}

/* ── Bookings Tab (with enhanced calendar navigation) ───── */
function groupSABookings(bookings) {
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

function SABookingsTab() {
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
      client.get('/superadmin/bookings'),
      client.get('/superadmin/courts'),
    ]).then(([bRes, cRes]) => {
      setBookings(bRes.data)
      setCourts(cRes.data)
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const activeCourts  = useMemo(() => courts.filter(c => c.active), [courts])
  const multiLocation = activeCourts.length >= 2

  useEffect(() => {
    if (activeCourts.length === 1) setSelectedCourtId(activeCourts[0].id)
  }, [activeCourts])

  const selectedCourt = activeCourts.find(c => c.id === selectedCourtId) ?? null

  const handleConfirm = async (id) => {
    if (!window.confirm('Confirm this booking?')) return
    try {
      const res = await client.patch(`/superadmin/bookings/${id}/confirm`)
      setBookings(bs => bs.map(b => b.id === id ? res.data : b))
      if (calModal?.id === id) setCalModal(res.data)
    } catch (err) {
      alert(err.message || 'Could not confirm booking.')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      const res = await client.patch(`/superadmin/bookings/${id}/cancel`)
      setBookings(bs => bs.map(b => b.id === id ? res.data : b))
      if (calModal?.id === id) setCalModal(null)
    } catch {
      alert('Could not cancel booking.')
    }
  }

  const handleConfirmGroup = async (ids) => {
    if (!window.confirm(`Confirm this booking${ids.length > 1 ? ` (${ids.length} courts)` : ''}?`)) return
    try {
      const results = await Promise.allSettled(ids.map(id => client.patch(`/superadmin/bookings/${id}/confirm`)))
      const confirmed = results.filter(r => r.status === 'fulfilled').map(r => r.value.data)
      if (confirmed.length > 0) {
        const map = new Map(confirmed.map(b => [b.id, b]))
        setBookings(bs => bs.map(b => map.has(b.id) ? map.get(b.id) : b))
      }
    } catch { alert('Could not confirm booking.') }
  }

  const handleCancelGroup = async (ids) => {
    if (!window.confirm(`Cancel this booking${ids.length > 1 ? ` (${ids.length} courts)` : ''}?`)) return
    try {
      const results = await Promise.allSettled(ids.map(id => client.patch(`/superadmin/bookings/${id}/cancel`)))
      const cancelled = results.filter(r => r.status === 'fulfilled').map(r => r.value.data)
      if (cancelled.length > 0) {
        const map = new Map(cancelled.map(b => [b.id, b]))
        setBookings(bs => bs.map(b => map.has(b.id) ? map.get(b.id) : b))
      }
    } catch { alert('Could not cancel booking.') }
  }

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
    const gs = groupSABookings(filtered)
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

  const calBookings = bookings.filter(b =>
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
    calBookings.find(b => b.courtNumber === cn && parseInt(b.startTime) === hour) ?? null

  const getCoveringBooking = (hour, cn) =>
    calBookings.find(b =>
      b.courtNumber === cn && parseInt(b.startTime) < hour && parseInt(b.endTime) >= hour
    ) ?? null

  const calendarUsers = useMemo(() => {
    const seen = new Map()
    calBookings.forEach(b => { if (!seen.has(b.userId)) seen.set(b.userId, { userId: b.userId, username: b.username }) })
    return [...seen.values()].sort((a, b) => a.username.localeCompare(b.username))
  }, [calBookings])

  const navigateDate = (delta) => {
    const [y, m, d] = calendarDate.split('-').map(Number)
    setCalendarDate(localDateISO(new Date(y, m - 1, d + delta)))
  }

  const isToday = calendarDate === localDateISO(new Date())

  const SortTh = ({ label, k }) => (
    <th className={`sortable${sortKey === k ? ` ${sortDir}` : ''}`} onClick={() => toggleSort(k)}>
      {label}<span className="sort-arrow">{sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}</span>
    </th>
  )

  return (
    <>
      {/* ── Calendar ── */}
      <div className="today-calendar">
        <div className="today-calendar__header">
          {isToday ? "Today's Schedule" : 'Schedule'} —{' '}
          {new Date(calendarDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          })}
        </div>

        {/* Date navigation */}
        <div className="cal-date-nav">
          <button className="cal-nav-btn" onClick={() => navigateDate(-1)} title="Previous day">← Prev</button>
          <button
            className={`cal-nav-btn${isToday ? ' cal-nav-btn--active' : ''}`}
            onClick={() => setCalendarDate(localDateISO(new Date()))}
          >Today</button>
          <input
            type="date"
            className="cal-date-input"
            value={calendarDate}
            onChange={e => setCalendarDate(e.target.value)}
          />
          <button className="cal-nav-btn" onClick={() => navigateDate(1)} title="Next day">Next →</button>
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

        {/* Location selector */}
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
                        {c.createdByAdmin && <span style={{ color: 'var(--text-3)', display: 'block' }}>Admin: {c.createdByAdmin.username}</span>}
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
            ? <div className="today-calendar__empty">Choose a location above to see the schedule.</div>
            : <div className="today-calendar__empty">No active courts available.</div>
        ) : (
          <div className="today-calendar__grid" style={{ overflowX: 'auto' }}>
            <div
              className="cal-grid"
              style={{ gridTemplateColumns: `64px repeat(${numCourts}, minmax(100px, 1fr))` }}
            >
              <div className="cal-grid__corner" />
              {courtNums.map(cn => (
                <div key={cn} className="cal-grid__col-header">Court {cn}</div>
              ))}
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
                                  onClick={() => handleConfirmGroup(g.ids)}
                                  title={isMulti ? `Confirm all ${g.ids.length} courts` : 'Confirm booking'}>✓</button>
                              )}
                              {(g.status === 'CONFIRMED' || g.status === 'PENDING') && (
                                <button className="btn-icon btn-icon--danger"
                                  onClick={() => handleCancelGroup(g.ids)}
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

      {/* ── Calendar detail modal ── */}
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
                    onClick={() => handleConfirm(calModal.id)}
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

/* ── Shared helpers ─────────────────────────────────────── */

function localDateISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtHour(h) {
  return h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`
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
