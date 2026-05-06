import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout }        = useAuth()
  const navigate                = useNavigate()
  const location                = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropRef                 = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); setDropOpen(false) }, [location])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (!dropRef.current?.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`} id="navbar">
      <div className="nav-container">

        <Link to="/" className="nav-brand">
          <div className="brand-logo">
            <img src="/images/ball.svg" alt="" width="28" height="28" />
          </div>
          <span className="brand-name">PicklePro Courts</span>
        </Link>

        <button
          className={`nav-toggle${menuOpen ? ' active' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>

        <div className={`nav-menu${menuOpen ? ' open' : ''}`}>
          <Link to="/courts" className="nav-link">Find a Court</Link>
          <Link to="/about"  className="nav-link">How It Works</Link>

          {user ? (
            <div className="nav-auth-group">
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="nav-link nav-link--admin">Admin</Link>
              )}
              <div className="nav-user-menu" ref={dropRef}>
                <button className="nav-user-btn" onClick={() => setDropOpen(o => !o)}>
                  <span className="user-avatar">{user.username[0].toUpperCase()}</span>
                  <span>{user.username}</span>
                  <svg width="11" height="11" viewBox="0 0 12 12">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                </button>
                <div className={`nav-dropdown${dropOpen ? ' open' : ''}`}>
                  <Link to="/dashboard"    className="dropdown-item">My Bookings</Link>
                  <Link to="/bookings/new" className="dropdown-item">New Booking</Link>
                  {user.role === 'ADMIN' && (
                    <Link to="/admin" className="dropdown-item dropdown-item--admin">Admin Panel</Link>
                  )}
                  <div className="dropdown-divider" />
                  <button onClick={handleLogout} className="dropdown-item dropdown-item--logout">
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="nav-auth-group">
              <Link to="/auth/login"    className="btn btn-nav-outline">Log In</Link>
              <Link to="/auth/register" className="btn btn-nav-neon">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
