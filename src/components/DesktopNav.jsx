import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/TranslationContext'

// Instagram-style left sidebar for desktop
// shows on Socialgati and other social pages
export default function DesktopNav({ onNewPost }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { t } = useTranslation()

  const is = (p) => pathname === p

  const items = [
    { icon: 'fas fa-house',       label: t('home'),    path: '/'        },
    { icon: 'fas fa-newspaper',   label: t('news'),    path: '/news'    },
    { icon: 'fas fa-circle-play', label: t('shorts'),  path: '/shorts'  },
    { icon: 'fas fa-magnifying-glass', label: t('search'), path: '/search' },
    { icon: 'fas fa-bell',        label: 'Alerts',     path: '/alerts'  },
    { icon: 'fas fa-user',        label: t('profile'), path: '/profile' },
  ]

  return (
    <nav className="desktop-sidebar">
      {/* Logo */}
      <div className="desktop-sidebar-logo" onClick={() => navigate('/')}>
        <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="Socialgati" />
        <span>Socialgati</span>
      </div>

      {/* Nav items */}
      {items.map(item => (
        <button
          key={item.path}
          className={`desktop-nav-item ${is(item.path) ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <i className={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}

      {/* Post button */}
      {onNewPost && (
        <button className="desktop-nav-post-btn" onClick={onNewPost}>
          <span>+ New Post</span>
        </button>
      )}

      {/* User chip at bottom */}
      {user && (
        <div style={{ marginTop: 'auto', padding: '12px 8px 0', borderTop: '1px solid var(--border)' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 12, cursor: 'pointer' }}
            onClick={() => navigate('/profile')}
          >
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent((user.displayName || 'U').slice(0, 2))}&background=1a73e8&color=fff`}
              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              alt=""
              onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName || 'User'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('profile')}</div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
