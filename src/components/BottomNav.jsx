import { useNavigate, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="bottom-nav">
      {/* Community */}
      <button
        className={`bottom-nav-btn ${pathname === '/' ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <i className="fas fa-bolt" />
        <span>Community</span>
      </button>

      {/* News */}
      <button
        className={`bottom-nav-btn ${pathname === '/news' ? 'active' : ''}`}
        onClick={() => navigate('/news')}
      >
        <i className="fas fa-newspaper" />
        <span>News</span>
      </button>

      {/* Shorts — centre button */}
      <button className="bottom-nav-shorts" onClick={() => navigate('/shorts')}>
        <div className="shorts-btn-inner">
          <i className="fas fa-circle-play" />
        </div>
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#e53935', marginTop: 2 }}>
          Shorts
        </span>
      </button>

      {/* Alerts */}
      <button
        className={`bottom-nav-btn ${pathname === '/alerts' ? 'active' : ''}`}
        onClick={() => navigate('/alerts')}
        style={{ position: 'relative' }}
      >
        <i className="far fa-bell" />
        <span>Alerts</span>
      </button>

      {/* Profile */}
      <button
        className={`bottom-nav-btn ${pathname === '/profile' ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
      >
        <i className="fas fa-user" />
        <span>Profile</span>
      </button>
    </nav>
  )
}
