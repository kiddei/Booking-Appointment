import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminLoginPage() {
  const { login }    = useAuth()
  const navigate     = useNavigate()

  const [form, setForm]       = useState({ username: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.username, form.password)
      if (user.role !== 'ADMIN') {
        await import('../api/client').then(m => m.default.post('/auth/logout'))
        setError('This portal is for administrators only. Please use the player login.')
        return
      }
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="brand-logo" style={{ background: 'rgba(200,255,0,0.15)', borderColor: 'rgba(200,255,0,0.3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="#c8ff00" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <span>Admin Portal</span>
        </div>

        <div className="admin-login-badge">
          <span>🔒 Restricted Access</span>
        </div>

        <h1 className="auth-title">Administrator Sign In</h1>
        <p className="auth-sub">Access the PicklePro management console</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Admin Username</label>
            <input
              id="username" name="username" type="text"
              placeholder="admin_username"
              value={form.username}
              onChange={handleChange}
              required autoComplete="username" autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-neon btn-block"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Authenticating…' : 'Sign In to Admin Panel'}
          </button>
        </form>

        <p className="auth-footer" style={{ color: 'var(--text-3)', fontSize: 12 }}>
          Not an admin?{' '}
          <a href="/login" style={{ color: 'var(--text-2)' }}>Player login →</a>
        </p>
      </div>
    </div>
  )
}
