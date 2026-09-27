import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import client from '../api/client'

function decodeJwt(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64))
  } catch {
    return null
  }
}

export default function CompleteProfilePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast    = useToast()

  const { refreshUser } = useAuth()
  const token           = searchParams.get('token') ?? ''
  const payload         = decodeJwt(token)

  const [form, setForm]       = useState({ username: '', password: '', confirmPassword: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token || !payload || payload.type !== 'google_pending') {
      navigate('/auth/register', { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      const msg = 'Passwords do not match.'
      setError(msg); toast.error(msg); return
    }
    setLoading(true)
    try {
      await client.post('/auth/google/complete', {
        pendingToken: token,
        username:     form.username,
        password:     form.password,
      })
      await refreshUser()
      toast.success('Account created! Welcome to PicklePro.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.message || 'Could not complete profile. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!payload) return null

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="brand-logo">
            <img src="/images/ball.svg" alt="" width="22" height="22" />
          </div>
          <span>PicklePro Courts</span>
        </div>

        <h1 className="auth-title">Complete Your Profile</h1>
        <p className="auth-sub">Just a few more details to finish creating your account.</p>

        {/* Verified email indicator */}
        <div className="google-verified-email">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span className="google-verified-email__label">Verified email</span>
          <span className="google-verified-email__value">{payload.email}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              id="username" name="username" type="text"
              placeholder="your_username"
              value={form.username}
              onChange={handleChange}
              required minLength={3} maxLength={50} autoFocus autoComplete="username"
            />
            <span className="form-hint">3–50 characters, letters/numbers/underscores</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                id="password" name="password" type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required minLength={8} autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password *</label>
              <input
                id="confirmPassword" name="confirmPassword" type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                required autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-neon btn-block"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
