import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <div className="nav-brand">
            <div className="brand-logo">
              <img src="/images/ball.svg" alt="" width="28" height="28" />
            </div>
            <span className="brand-name">PicklePro Courts</span>
          </div>
          <p className="footer-tagline">Where champions are made, one serve at a time.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Courts</h4>
            <Link to="/courts">View All Courts</Link>
            <Link to="/bookings/new">Book a Session</Link>
            <Link to="/about">About Us</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/auth/register">Create Account</Link>
            <Link to="/auth/login">Sign In</Link>
            <Link to="/dashboard">My Bookings</Link>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <span>hello@picklepro.com</span>
            <span>+1 (800) PICKLE-1</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} PicklePro Courts. All rights reserved.</p>
      </div>
    </footer>
  )
}
