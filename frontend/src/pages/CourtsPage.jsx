import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

export default function CourtsPage() {
  const [courts, setCourts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    client.get('/courts')
      .then(r => setCourts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const visible = courts.filter(c => {
    if (filter === 'indoor')  return c.indoor
    if (filter === 'outdoor') return !c.indoor
    return true
  })

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Our Courts</h1>
          <p>Choose a surface, pick your time, and book instantly.</p>
        </div>
      </div>

      <div className="courts-page">
        <div className="container">
          <div className="courts-filters">
            {['all', 'indoor', 'outdoor'].map(f => (
              <button
                key={f}
                className={`filter-btn${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All Courts' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="page-loading"><div className="loading-spinner" /></div>
          ) : visible.length === 0 ? (
            <div className="empty-state">
              <h3>No courts found</h3>
              <p>Try changing the filter above.</p>
            </div>
          ) : (
            <div className="courts-grid">
              {visible.map(court => (
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
          )}
        </div>
      </div>
    </>
  )
}
