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
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      where('read', '==', false),
      limit(99)
    )
    const unsub = onSnapshot(q, snap => setUnread(snap.size), () => {})
    return unsub
  }, [user])

  const active = darkMode
    ? (is) => is ? '#fff' : 'rgba(255,255,255,.5)'
    : (is) => is ? 'var(--blue)' : 'var(--muted2)'

  const navStyle = darkMode
    ? { background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(10px)', borderTopColor: 'rgba(255,255,255,.1)' }
    : {}

  const isActive = (path) => pathname === path

  return (
    <nav className="bottom-nav" style={navStyle}>

      {/* Home */}
      <button className={`nav-btn ${isActive('/') ? 'active' : ''}`}
        style={{ color: active(isActive('/')) }} onClick={() => navigate('/')}>
        <i className="fas fa-house" />
        <span>Home</span>
      </button>

      {/* News */}
      <button className={`nav-btn ${isActive('/news') ? 'active' : ''}`}
        style={{ color: active(isActive('/news')) }} onClick={() => navigate('/news')}>
        <i className="fas fa-newspaper" />
        <span>News</span>
      </button>

      {/* Shorts \u2014 special pill button */}
      <button className="nav-shorts" onClick={() => navigate('/shorts')}>
        <div className="shorts-inner">
          <i className="fas fa-circle-play" style={{ color: '#fff', fontSize: 20 }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#e53935', marginTop: 2 }}>Shorts</span>
      </button>

      {/* Search */}
      <button className={`nav-btn ${isActive('/search') ? 'active' : ''}`}
        style={{ color: active(isActive('/search')) }} onClick={() => navigate('/search')}>
        <i className="fas fa-magnifying-glass" />
        <span>Search</span>
      </button>

      {/* Profile \u2014 shows avatar if available + notification dot for unread */}
      <button
        className={`nav-btn ${isActive('/profile') ? 'active' : ''}`}
        style={{ color: active(isActive('/profile')), position: 'relative' }}
        onClick={() => navigate('/profile')}>
        {user?.photoURL
          ? <img src={user.photoURL}
              style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: isActive('/profile') ? '2px solid var(--blue)' : '2px solid transparent' }}
              alt="" />
          : <i className="fas fa-user" />
        }
        <span>Profile</span>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 10,
            width: 8, height: 8, borderRadius: '50%',
            background: '#e53935', border: '2px solid var(--surface)'
          }} />
        )}
      </button>
    </nav>
  )
}
