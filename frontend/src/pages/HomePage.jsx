import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

export default function HomePage() {
  const { user }          = useAuth()
  const paddleRef         = useRef(null)
  const ballRef           = useRef(null)
  const [courts, setCourts] = useState([])

  // Load public courts for the preview section
  useEffect(() => {
    client.get('/courts').then(r => setCourts(r.data)).catch(() => {})
  }, [])

  // 3D mouse parallax on the hero images
  useEffect(() => {
    const hero = document.querySelector('.hero')
    if (!hero) return

    const onMove = (e) => {
      const { left, top, width, height } = hero.getBoundingClientRect()
      const x = ((e.clientX - left) / width  - 0.5) * 2   // -1 → 1
      const y = ((e.clientY - top)  / height - 0.5) * 2

      if (paddleRef.current) {
        paddleRef.current.style.transform =
          `perspective(1200px)
           rotateY(${-22 + x * 8}deg)
           rotateX(${6 - y * 5}deg)
           rotate(-8deg)
           scale(1.02)`
      }
      if (ballRef.current) {
        ballRef.current.style.transform =
          `translateX(${x * 14}px)
           translateY(${y * 10}px)
           perspective(1200px)
           rotateY(${x * 10}deg)
           rotateX(${-y * 8}deg)`
      }
    }

    const onLeave = () => {
      if (paddleRef.current)
        paddleRef.current.style.transform =
          'perspective(1200px) rotateY(-22deg) rotateX(6deg) rotate(-8deg)'
      if (ballRef.current)
        ballRef.current.style.transform = ''
    }

    hero.addEventListener('mousemove', onMove)
    hero.addEventListener('mouseleave', onLeave)
    return () => {
      hero.removeEventListener('mousemove', onMove)
      hero.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-grid" aria-hidden="true">
          <svg viewBox="0 0 1440 700" preserveAspectRatio="xMidYMax slice">
            <line x1="720" y1="300" x2="0"    y2="700" stroke="rgba(200,255,0,0.06)" strokeWidth="1"/>
            <line x1="720" y1="300" x2="240"  y2="700" stroke="rgba(200,255,0,0.06)" strokeWidth="1"/>
            <line x1="720" y1="300" x2="480"  y2="700" stroke="rgba(200,255,0,0.06)" strokeWidth="1"/>
            <line x1="720" y1="300" x2="720"  y2="700" stroke="rgba(200,255,0,0.09)" strokeWidth="1.5"/>
            <line x1="720" y1="300" x2="960"  y2="700" stroke="rgba(200,255,0,0.06)" strokeWidth="1"/>
            <line x1="720" y1="300" x2="1200" y2="700" stroke="rgba(200,255,0,0.06)" strokeWidth="1"/>
            <line x1="720" y1="300" x2="1440" y2="700" stroke="rgba(200,255,0,0.06)" strokeWidth="1"/>
            <line x1="0" y1="420"  x2="1440" y2="420" stroke="rgba(200,255,0,0.04)" strokeWidth="1"/>
            <line x1="0" y1="520"  x2="1440" y2="520" stroke="rgba(200,255,0,0.04)" strokeWidth="1"/>
            <line x1="0" y1="370"  x2="1440" y2="370" stroke="rgba(200,255,0,0.10)" strokeWidth="2"/>
          </svg>
        </div>

        <div className="hero-inner container">
          {/* Left copy */}
          <div className="hero-copy">
            <p className="hero-eyebrow">Pickleball Booking</p>
            <div className="hero-headline">
              <h1 className="hero-title-main">PLAY<br/>SMARTER.</h1>
              <p className="hero-title-ghost" aria-hidden="true">BOOK FAST.</p>
            </div>
            <p className="hero-subtitle">
              Reserve courts with live pricing and instant confirmation —
              pick a slot and finish in a few steps.
            </p>
            <div className="hero-actions">
              <Link to="/courts" className="btn btn-neon">
                Choose a Court
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              {user
                ? <Link to="/bookings/new" className="btn btn-ghost-text">Book Now</Link>
                : <Link to="/auth/register" className="btn btn-ghost-text">Create Free Account</Link>
              }
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="stat-value">{courts.length || 3}</span>
                <span className="stat-label">Active Courts</span>
              </div>
              <div className="stat-divider" />
              <div className="hero-stat">
                <span className="stat-value">7am–10pm</span>
                <span className="stat-label">Daily Hours</span>
              </div>
              <div className="stat-divider" />
              <div className="hero-stat">
                <span className="stat-value">Instant</span>
                <span className="stat-label">Confirmation</span>
              </div>
            </div>
          </div>

          {/* Right: 3D paddle + ball */}
          <div className="hero-visuals" aria-hidden="true">
            <div className="hero-images-3d">
              <img
                ref={paddleRef}
                src="/images/paddle.svg"
                alt="Pickleball Paddle"
                className="hero-paddle"
                draggable="false"
              />
              <img
                ref={ballRef}
                src="/images/ball.svg"
                alt="Pickleball"
                className="hero-ball"
                draggable="false"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="section features" id="features">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Why PicklePro</span>
            <h2 className="section-title">Everything you need to play</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COURTS PREVIEW ───────────────────────────────── */}
      {courts.length > 0 && (
        <section className="section courts-preview" id="courts">
          <div className="container">
            <div className="section-header">
              <span className="section-label">Our Courts</span>
              <h2 className="section-title">Pick your surface, pick your time</h2>
            </div>
            <div className="courts-grid">
              {courts.map(court => (
                <div key={court.id} className="court-card">
                  <div className="court-card__header">
                    <span className="court-card__badge">
                      {court.indoor ? 'Indoor' : 'Outdoor'}
                    </span>
                  </div>
                  <div className="court-card__body">
                    <h3 className="court-card__name">{court.name}</h3>
                    <p className="court-card__desc">{court.description}</p>
                    <div className="court-card__meta">
                      <span className="court-meta-item">Up to {court.maxPlayers} players</span>
                      <span className="court-meta-item court-meta-item--price">
                        <span className="price-amount">₱{court.hourlyRate.toFixed(2)}</span>
                        <span className="price-unit">/ hr</span>
                      </span>
                    </div>
                  </div>
                  <div className="court-card__footer">
                    <Link to={`/bookings/new?courtId=${court.id}`} className="btn btn-neon btn-block">
                      Book This Court
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="section-cta">
              <Link to="/courts" className="btn btn-outline">See All Courts →</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="section how-it-works">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Simple Process</span>
            <h2 className="section-title">On the court in 3 steps</h2>
          </div>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div key={i} className="step">
                <div className="step-number">{String(i + 1).padStart(2, '0')}</div>
                <div className="step-content">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && <div className="step-connector" />}
              </div>
            ))}
          </div>
          <div className="section-cta">
            {user
              ? <Link to="/bookings/new" className="btn btn-neon btn-lg">Book Now</Link>
              : <Link to="/auth/register" className="btn btn-neon btn-lg">Create Free Account</Link>
            }
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────── */}
      <section className="cta-banner">
        <div className="container cta-banner__content">
          <p className="cta-eyebrow">Ready to play?</p>
          <h2>Reserve your court today.</h2>
          <p className="cta-sub">Join players already booking through PicklePro.</p>
          {user
            ? <Link to="/bookings/new" className="btn btn-neon btn-lg">Book a Session</Link>
            : <Link to="/auth/register" className="btn btn-neon btn-lg">Start for Free</Link>
          }
        </div>
      </section>
    </>
  )
}

// ── Static data ────────────────────────────────────────────────────────────

const FEATURES = [
  { title: 'Real-Time Availability', desc: 'See open slots the moment they appear. No phone calls — just pick and book.' },
  { title: 'Instant Confirmation',   desc: 'Your booking is confirmed the second you submit. Zero waiting.' },
  { title: 'Secure & Private',       desc: 'Industry-standard encryption protects every account and transaction.' },
  { title: 'Flexible Scheduling',    desc: 'Book by the hour, cancel worry-free before your session starts.' },
  { title: 'Player Profiles',        desc: 'Full booking history and upcoming sessions in one clean dashboard.' },
  { title: 'Mobile First',           desc: 'Designed for the phone in your pocket. Book between points.' },
].map(f => ({ ...f, icon: null }))

const STEPS = [
  { title: 'Create Your Account', desc: 'Sign up in under a minute. No credit card required to browse.' },
  { title: 'Choose Court & Time', desc: 'Browse courts, pick a date, select your preferred time window.' },
  { title: 'Confirm & Play',      desc: 'Submit and get instant confirmation. Show up and play.' },
]
