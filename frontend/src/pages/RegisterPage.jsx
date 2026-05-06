import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [form, setForm]       = useState({ username: '', email: '', password: '', confirmPassword: '', phoneNumber: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="brand-logo">
            <img src="/images/ball.svg" alt="" width="22" height="22" />
          </div>
          <span>PicklePro Courts</span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Free forever. No credit card required.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username" name="username" type="text"
              placeholder="your_username"
              value={form.username} onChange={handleChange}
              required minLength={3} autoFocus autoComplete="username"
            />
            <span className="form-hint">3–50 characters</span>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              placeholder="you@example.com"
              value={form.email} onChange={handleChange}
              required autoComplete="email"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password" name="password" type="password"
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
                required minLength={8} autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword" name="confirmPassword" type="password"
                placeholder="••••••••"
                value={form.confirmPassword} onChange={handleChange}
                required autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-3)' }}>(optional)</span></label>
            <input
              id="phoneNumber" name="phoneNumber" type="tel"
              placeholder="+1 800 000 0000"
              value={form.phoneNumber} onChange={handleChange}
              autoComplete="tel"
            />
          </div>

          <button type="submit" className="btn btn-neon btn-block" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Free Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
