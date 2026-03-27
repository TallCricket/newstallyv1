import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useNavigate } from 'react-router-dom'

const TYPE_CFG = {
  like:     { icon:'fas fa-heart',      color:'#e53935' },
  comment:  { icon:'fas fa-comment',    color:'#1a73e8' },
  follow:   { icon:'fas fa-user-plus',  color:'#34a853' },
  unfollow: { icon:'fas fa-user-minus', color:'var(--muted)' },
  repost:   { icon:'fas fa-retweet',    color:'#9334e6' },
}

export default function NotificationsFullPage() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(60)
    )
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
      // Mark all as read after 1.5s
      setTimeout(() => {
        snap.docs.forEach(d => {
          if (!d.data().read)
            updateDoc(doc(db, 'users', user.uid, 'notifications', d.id), { read: true }).catch(() => {})
        })
      }, 1500)
    }, () => setLoading(false))
    return unsub
  }, [user])

  const cfg  = t => TYPE_CFG[t] || { icon:'fas fa-bell', color:'var(--muted)' }
  const avSrc = n => n.fromAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((n.fromName||'U').substring(0,2))}&background=efefef&color=888`
  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="Socialgati"/>
          <div>
            <span style={{ fontSize:18, fontWeight:800, color:'var(--ink)', display:'block', lineHeight:1.1 }}>Notifications</span>
            {unreadCount > 0 && <span style={{ fontSize:10, color:'#1a73e8', fontWeight:600 }}>{unreadCount} new</span>}
          </div>
        </div>
        {!user && <button className="btn-signin" onClick={() => setShowAuth(true)}>Sign In</button>}
      </header>

      <div className="main-wrapper" style={{ paddingBottom:80 }}>
        {!user ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <i className="far fa-bell" style={{ fontSize:32, color:'var(--muted)' }}/>
            </div>
            <p style={{ fontSize:18, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>Sign in to see notifications</p>
            <p style={{ fontSize:14, color:'var(--muted)', marginBottom:24 }}>Get notified when someone likes, comments or follows you</p>
            <button onClick={() => setShowAuth(true)}
              style={{ padding:'12px 32px', background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none', borderRadius:99, fontSize:15, fontWeight:700, cursor:'pointer' }}>
              Sign In
            </button>
          </div>
        ) : loading ? (
          <div style={{ padding:16 }}>
            {Array.from({length:6}).map((_,i) => (
              <div key={i} style={{ display:'flex', gap:12, padding:'14px 0', borderBottom:'1px solid var(--border2)' }}>
                <div className="skeleton" style={{ width:52, height:52, borderRadius:'50%', flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div className="skeleton" style={{ height:13, width:'70%', marginBottom:8, borderRadius:4 }}/>
                  <div className="skeleton" style={{ height:11, width:'40%', borderRadius:4 }}/>
                </div>
              </div>
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <i className="far fa-bell" style={{ fontSize:32, color:'var(--muted)' }}/>
            </div>
            <p style={{ fontSize:18, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>No notifications yet</p>
            <p style={{ fontSize:14, color:'var(--muted)' }}>When someone likes or follows you, you'll see it here</p>
          </div>
        ) : (
          <div>
            {unreadCount > 0 && (
              <div style={{ padding:'10px 16px', background:'rgba(26,115,232,.08)', borderBottom:'1px solid rgba(26,115,232,.15)' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#1a73e8' }}>
                  <i className="fas fa-circle" style={{ fontSize:8, marginRight:6 }}/>
                  {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {notifs.map(n => {
              const c = cfg(n.type)
              return (
                <div key={n.id}
                  style={{ display:'flex', alignItems:'flex-start', gap:13, padding:'14px 16px', background: !n.read ? 'rgba(26,115,232,.04)' : 'var(--surface)', borderBottom:'1px solid var(--border2)', cursor:'pointer', transition:'background .15s' }}
                  onMouseOver={e => e.currentTarget.style.background='var(--surface2)'}
                  onMouseOut={e => e.currentTarget.style.background = !n.read ? 'rgba(26,115,232,.04)' : 'var(--surface)'}>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <img src={avSrc(n)} style={{ width:50, height:50, borderRadius:'50%', objectFit:'cover', display:'block' }} alt=""
                      onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=efefef`}/>
                    <div style={{ position:'absolute', bottom:-2, right:-2, width:22, height:22, borderRadius:'50%', background:c.color, border:'2px solid var(--surface)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <i className={c.icon} style={{ color:'#fff', fontSize:9 }}/>
                    </div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, color:'var(--ink)', lineHeight:1.45, margin:0 }}>
                      <strong style={{ fontWeight:700 }}>{n.fromName || 'Someone'}</strong>
                      {' '}{n.message || 'interacted with you'}
                    </p>
                    {n.postSnippet && (
                      <p style={{ fontSize:12, color:'var(--muted)', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        "{n.postSnippet}"
                      </p>
                    )}
                    <p style={{ fontSize:12, color:c.color, marginTop:4, fontWeight:500 }}>
                      {timeAgo(n.timestamp?.toDate?.() || n.timestamp)}
                    </p>
                  </div>
                  {!n.read && (
                    <div style={{ width:9, height:9, borderRadius:'50%', background:'#1a73e8', flexShrink:0, marginTop:4 }}/>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <BottomNav/>
    </>
  )
}
