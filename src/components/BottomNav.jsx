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

  const style = darkMode
    ? { background:'rgba(0,0,0,.7)', backdropFilter:'blur(10px)', borderTopColor:'rgba(255,255,255,.1)' }
    : {}

  const color = (active) => {
    if (darkMode) return active ? '#fff' : 'rgba(255,255,255,.6)'
    return active ? 'var(--blue)' : 'var(--muted2)'
  }

  const items = [
    { path:'/',        icon:'fas fa-house',      label:'Home'    },
    { path:'/news',    icon:'fas fa-newspaper',  label:'News'    },
    { path:'SHORTS',   icon:null,                label:'Shorts'  },  // special
    { path:'/search',  icon:'fas fa-magnifying-glass', label:'Search' },
    { path:'/profile', icon:null,                label:'Profile' },  // special (avatar)
  ]

  return (
    <nav className="bottom-nav" style={style}>
      {items.map(item => {
        if (item.path === 'SHORTS') {
          return (
            <button key="shorts" className="nav-shorts" onClick={() => navigate('/shorts')}>
              <div className="shorts-inner">
                <i className="fas fa-circle-play" style={{ color:'#fff', fontSize:20 }}/>
              </div>
              <span style={{ fontSize:10, fontWeight:600, color:'#e53935', marginTop:2 }}>Shorts</span>
            </button>
          )
        }

        if (item.path === '/profile') {
          const isActive = pathname === '/profile'
          return (
            <button key="/profile" className={`nav-btn ${isActive ? 'active' : ''}`}
              style={{ color: color(isActive) }} onClick={() => navigate('/profile')}>
              {user?.photoURL
                ? <img src={user.photoURL} style={{ width:24, height:24, borderRadius:'50%', objectFit:'cover', border: isActive ? '2px solid var(--blue)' : '2px solid transparent' }} alt=""/>
                : <i className="fas fa-user"/>
              }
              <span>Profile</span>
            </button>
          )
        }

        const isActive = pathname === item.path
        const isAlerts = item.path === '/alerts'

        return (
          <button key={item.path}
            className={`nav-btn ${isAlerts && hasNotif ? 'nav-btn-notif active-notif' : ''} ${isActive ? 'active' : ''}`}
            style={{ color: isAlerts && hasNotif ? 'var(--red)' : color(isActive) }}
            onClick={() => navigate(item.path)}>
            <i className={isAlerts && hasNotif ? 'fas fa-bell' : item.icon}/>
            <span>{item.label}</span>
            {isAlerts && hasNotif && (
              <span className="notify-badge" style={{ display:'flex' }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
