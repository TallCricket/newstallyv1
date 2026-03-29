import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/TranslationContext'
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export default function BottomNav({ darkMode = false }) {
  const navigate   = useNavigate()
  const { pathname } = useLocation()
  const { user }   = useAuth()
  const { t }      = useTranslation()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) { setUnread(0); return }
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      where('read', '==', false), limit(99)
    )
    const unsub = onSnapshot(q, snap => setUnread(snap.size), () => {})
    return unsub
  }, [user])

  const is = (p) => pathname === p

  // M3 Navigation Bar items
  const items = [
    { path: '/',       icon: is('/')       ? 'fas fa-house'          : 'fa-regular fa-house',       label: t('home')    },
    { path: '/news',   icon: is('/news')   ? 'fas fa-newspaper'      : 'fa-regular fa-newspaper',   label: t('news')    },
    { path: '/search', icon: is('/search') ? 'fas fa-magnifying-glass': 'fas fa-magnifying-glass',   label: t('search')  },
    { path: '/profile',icon: is('/profile')? 'fas fa-user'           : 'fa-regular fa-user',        label: t('profile') },
  ]

  // nav colors
  const textColor = darkMode
    ? (active) => active ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.55)'
    : undefined
  const navStyle = darkMode
    ? { background:'rgba(0,0,0,.7)', backdropFilter:'blur(12px)', borderTopColor:'rgba(255,255,255,.12)' }
    : {}

  return (
    <nav className="bottom-nav" style={navStyle}>

      {/* Home */}
      <button className={`nav-btn ${is('/') ? 'active' : ''}`}
        style={textColor ? { color: textColor(is('/')) } : {}}
        onClick={() => navigate('/')}>
        <span className="nav-indicator"/>
        <i className={items[0].icon}/>
        <span>{items[0].label}</span>
      </button>

      {/* News */}
      <button className={`nav-btn ${is('/news') ? 'active' : ''}`}
        style={textColor ? { color: textColor(is('/news')) } : {}}
        onClick={() => navigate('/news')}>
        <span className="nav-indicator"/>
        <i className={items[1].icon}/>
        <span>{items[1].label}</span>
      </button>

      {/* Shorts \u2014 special center FAB style */}
      <button className="nav-shorts" onClick={() => navigate('/shorts')}>
        <div className="shorts-inner">
          <i className="fas fa-circle-play" style={{ color:'#fff', fontSize:18 }}/>
        </div>
        <span style={{
          fontSize:10, fontWeight:600, letterSpacing:'.04em',
          color: darkMode ? 'rgba(255,255,255,.7)' : 'var(--m3-error)', marginTop:2
        }}>
          Shorts
        </span>
      </button>

      {/* Search */}
      <button className={`nav-btn ${is('/search') ? 'active' : ''}`}
        style={textColor ? { color: textColor(is('/search')) } : {}}
        onClick={() => navigate('/search')}>
        <span className="nav-indicator"/>
        <i className={items[2].icon}/>
        <span>{items[2].label}</span>
      </button>

      {/* Profile + notification dot */}
      <button
        className={`nav-btn nav-btn-notif ${is('/profile') ? 'active' : ''} ${unread > 0 ? 'active-notif' : ''}`}
        style={textColor ? { color: textColor(is('/profile')) } : {}}
        onClick={() => navigate('/profile')}>
        <span className="nav-indicator"/>
        {user?.photoURL
          ? <img src={user.photoURL}
              style={{
                width:24, height:24, borderRadius:'50%', objectFit:'cover',
                border: is('/profile') ? '2.5px solid var(--m3-primary)' : '2px solid transparent',
                position:'relative', zIndex:1
              }}
              alt=""/>
          : <i className={items[3].icon} style={{ position:'relative', zIndex:1 }}/>
        }
        <span style={{ position:'relative', zIndex:1 }}>{items[3].label}</span>
        {unread > 0 && (
          <span className="notify-badge" style={{ display:'flex' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </nav>
  )
}
