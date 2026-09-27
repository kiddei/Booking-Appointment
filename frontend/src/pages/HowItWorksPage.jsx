import { useState } from 'react'
import { Link } from 'react-router-dom'

const STEPS = [
  {
    number: '01',
    title:  'Create Your Account',
    body:   'Sign up in seconds — all you need is a username, email, and password. No credit card required to register.',
  },
  {
    number: '02',
    title:  'Browse Available Courts',
    body:   'Explore indoor and outdoor pickleball courts near you. Filter by type and check hourly rates, operating hours, and court count at a glance.',
  },
  {
    number: '03',
    title:  'Pick a Date & Court',
    body:   'Select your preferred date, then choose from the available playable court grid. Busy and available courts are shown in real time so there are no surprises.',
  },
  {
    number: '04',
    title:  'Choose Your Time Slot',
    body:   'Pick a start and end time from the live slot picker. Only genuinely open slots appear — no double-booking is ever possible.',
  },
  {
    number: '05',
    title:  'Confirm & Pay via GCash',
    body:   'Review your booking summary, then scan the court\'s GCash QR code to complete payment. Upload your receipt right on the page.',
  },
  {
    number: '06',
    title:  'Show Up & Play',
    body:   'Once an admin confirms your receipt you\'ll see a Confirmed status on your dashboard. Just show up at your booked time and enjoy the game.',
  },
]

const BENEFITS = [
  {
    icon:  '⚡',
    title: 'Book in Under 2 Minutes',
    body:  'The entire flow — browse, pick, pay — takes less than two minutes on any device.',
  },
  {
    icon:  '🏓',
    title: 'Real-Time Availability',
    body:  'Court slots update live. If another player books a slot while you\'re browsing, it disappears instantly.',
  },
  {
    icon:  '📱',
    title: 'Mobile-First Design',
    body:  'Designed for thumbs. Every screen is fully responsive from small phones to wide monitors.',
  },
  {
    icon:  '🔒',
    title: 'Secure & Private',
    body:  'Passwords are bcrypt-hashed and auth tokens are stored in httpOnly cookies — your data never touches the browser\'s local storage.',
  },
  {
    icon:  '📧',
    title: 'Email Confirmation',
    body:  'Receive an automatic booking confirmation email the moment your court is reserved.',
  },
  {
    icon:  '📋',
    title: 'Full Booking History',
    body:  'Your dashboard shows every past and upcoming booking, grouped by session, with cancellation available up to the start time.',
  },
]

const FAQS = [
  {
    q: 'Can I book multiple courts at the same time?',
    a: 'Yes. On the court selection screen you can pick more than one playable court within the same location, date, and time window. They\'ll appear as a single grouped session on your dashboard.',
  },
  {
    q: 'What happens if my payment isn\'t confirmed before my booking time?',
    a: 'Your slot is held as soon as you submit your receipt. An admin reviews and confirms payments typically within a few hours. In the meantime your booking status shows "Pending" and the slot is blocked for other users.',
  },
  {
    q: 'Can I cancel a booking?',
    a: 'Yes. You can cancel any Pending or Confirmed booking from your dashboard or from the booking detail page. Cancelled slots are immediately released for other players.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'Currently GCash via QR code is the supported payment channel. Each court displays its own GCash QR on the payment step.',
  },
  {
    q: 'Do I need an account to see court availability?',
    a: 'No. You can browse courts and check availability without logging in. An account is only required to make a booking.',
  },
  {
    q: 'How do I become a court owner / admin?',
    a: 'Court owner accounts are created and managed by the platform\'s super admin. Reach out to the platform operator to have an admin account set up for your facility.',
  },
  {
    q: 'Is my receipt image stored securely?',
    a: 'Payment receipts are stored as base64 images in the database, accessible only to you and platform admins. They are never shared publicly.',
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-item${open ? ' faq-item--open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className="faq-chevron">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  )
}

export default function HowItWorksPage() {
  return (
    <>
      {/* ── Hero ── */}
      <div className="hiw-hero">
        <div className="container">
          <h1 className="hiw-hero__title">How PicklePro Works</h1>
          <p className="hiw-hero__sub">
            From browsing to booking in minutes — here's everything you need to know.
          </p>
          <Link to="/auth/register" className="btn btn-neon hiw-hero__cta">Get Started Free</Link>
        </div>
      </div>

      {/* ── Steps ── */}
      <section className="hiw-section">
        <div className="container">
          <h2 className="hiw-section__title">6 Steps to Your Next Game</h2>
          <div className="hiw-steps">
            {STEPS.map(s => (
              <div key={s.number} className="hiw-step">
                <div className="hiw-step__number">{s.number}</div>
                <div className="hiw-step__content">
                  <h3 className="hiw-step__title">{s.title}</h3>
                  <p  className="hiw-step__body">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="hiw-section hiw-section--alt">
        <div className="container">
          <h2 className="hiw-section__title">Why Players Choose PicklePro</h2>
          <div className="hiw-benefits">
            {BENEFITS.map(b => (
              <div key={b.title} className="hiw-benefit">
                <div className="hiw-benefit__icon">{b.icon}</div>
                <h3 className="hiw-benefit__title">{b.title}</h3>
                <p  className="hiw-benefit__body">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="hiw-section">
        <div className="container">
          <h2 className="hiw-section__title">Frequently Asked Questions</h2>
          <div className="hiw-faq">
            {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="hiw-cta">
        <div className="container">
          <h2 className="hiw-cta__title">Ready to book your court?</h2>
          <p  className="hiw-cta__sub">Join players already booking courts on PicklePro.</p>
          <div className="hiw-cta__actions">
            <Link to="/auth/register" className="btn btn-neon">Create Free Account</Link>
            <Link to="/courts"        className="btn btn-outline">Browse Courts</Link>
          </div>
        </div>
      </section>
    </>
  )
}
