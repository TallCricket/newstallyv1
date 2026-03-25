import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export default function BottomNav({ darkMode = false }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) { setUnread(0); return }
    const q = query(collection(db, 'users', user.uid, 'notifications'), where('read', '==', false), limit(99))
    const unsub = onSnapshot(q, snap => setUnread(snap.size), () => {})
    return unsub
  }, [user])

  const hasNotif = unread > 0

  const style = darkMode ? { background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(10px)', borderTopColor: 'rgba(255,255,255,.1)' } : {}
  const btnColor = darkMode ? (active) => active ? '#fff' : 'rgba(255,255,255,.6)' : (active) => active ? '#1a73e8' : '#9aa0a6'

  return (
    <nav className="bottom-nav" style={style}>
      {/* Community */}
      <button className={`nav-btn ${pathname === '/' ? 'active' : ''}`} style={{ color: btnColor(pathname === '/') }} onClick={() => navigate('/')}>
        <i className="fas fa-house" />
        <span>Home</span>
      </button>

      {/* News */}
      <button className={`nav-btn ${pathname === '/news' ? 'active' : ''}`} style={{ color: btnColor(pathname === '/news') }} onClick={() => navigate('/news')}>
        <i className="fas fa-newspaper" />
        <span>News</span>
      </button>

      {/* Shorts */}
      <button className="nav-shorts" onClick={() => navigate('/shorts')}>
        <div className="shorts-inner">
          <i className="fas fa-circle-play" style={{ color: '#fff', fontSize: 20 }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#e53935', marginTop: 2 }}>Shorts</span>
      </button>

      {/* Alerts */}
      <button
        className={`nav-btn nav-btn-notif ${hasNotif ? 'active-notif' : ''} ${pathname === '/alerts' ? 'active' : ''}`}
        style={{ color: hasNotif ? '#e53935' : btnColor(pathname === '/alerts') }}
        onClick={() => navigate('/alerts')}
      >
        <i className={hasNotif ? 'fas fa-bell' : 'far fa-bell'} />
        <span>Alerts</span>
        {hasNotif && (
          <span className="notify-badge" style={{ display: 'flex' }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Profile */}
      <button className={`nav-btn ${pathname === '/profile' ? 'active' : ''}`} style={{ color: btnColor(pathname === '/profile') }} onClick={() => navigate('/profile')}>
        {user?.photoURL
          ? <img src={user.photoURL} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} alt="" />
          : <i className="fas fa-user" />
        }
        <span>Profile</span>
      </button>
    </nav>
  )
}
