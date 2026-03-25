import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useNavigate } from 'react-router-dom'

const TYPE_CFG = {
  like:     { icon:'fas fa-heart',      color:'#e53935', bg:'#fce8e6' },
  comment:  { icon:'fas fa-comment',    color:'#1a73e8', bg:'#e8f0fe' },
  follow:   { icon:'fas fa-user-plus',  color:'#34a853', bg:'#e6f4ea' },
  unfollow: { icon:'fas fa-user-minus', color:'#9aa0a6', bg:'#f1f3f4' },
  repost:   { icon:'fas fa-retweet',    color:'#9334e6', bg:'#f3e8ff' },
}

export default function Alerts() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const q = query(collection(db, 'users', user.uid, 'notifications'), orderBy('timestamp','desc'), limit(50))
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
      // Mark all as read after 1.5s
      setTimeout(() => {
        snap.docs.forEach(d => {
          if (!d.data().read) updateDoc(doc(db,'users',user.uid,'notifications',d.id),{read:true}).catch(()=>{})
        })
      }, 1500)
    }, () => setLoading(false))
    return unsub
  }, [user])

  const cfg = t => TYPE_CFG[t] || { icon:'fas fa-bell', color:'#9aa0a6', bg:'#f1f3f4' }
  const av = n => n.fromAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((n.fromName||'U').substring(0,2))}&background=efefef&color=888`

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="Socialgati"/>
          <span className="logo-text">Notifications</span>
        </div>
        {!user && <button className="btn-signin" onClick={() => setShowAuth(true)}>Sign In</button>}
      </header>

      <div className="main-wrapper" style={{ paddingBottom:80 }}>
        {!user ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ width:80, height:80, borderRadius:'50%', background:'#f1f3f4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <i className="far fa-bell" style={{ fontSize:32, color:'#9aa0a6' }}/>
            </div>
            <p style={{ fontSize:18, fontWeight:700, color:'#202124', marginBottom:8 }}>Sign in to see notifications</p>
            <p style={{ fontSize:14, color:'#9aa0a6', marginBottom:24 }}>Get notified when someone likes, comments or follows you</p>
            <button onClick={() => setShowAuth(true)}
              style={{ padding:'12px 32px', background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none', borderRadius:99, fontSize:15, fontWeight:700, cursor:'pointer' }}>
              Sign In
            </button>
          </div>
        ) : loading ? (
          <div style={{ padding:'16px' }}>
            {Array.from({length:6}).map((_,i) => (
              <div key={i} style={{ display:'flex', gap:12, padding:'14px 0', borderBottom:'1px solid #f5f5f5' }}>
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
            <div style={{ width:80, height:80, borderRadius:'50%', background:'#f1f3f4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <i className="far fa-bell" style={{ fontSize:32, color:'#9aa0a6' }}/>
            </div>
            <p style={{ fontSize:18, fontWeight:700, color:'#202124', marginBottom:8 }}>No notifications yet</p>
            <p style={{ fontSize:14, color:'#9aa0a6' }}>When someone likes or follows you, you'll see it here</p>
          </div>
        ) : (
          <div>
            {/* Unread count */}
            {notifs.some(n => !n.read) && (
              <div style={{ padding:'10px 16px', background:'#e8f0fe', borderBottom:'1px solid #c5d9f8' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#1a73e8' }}>
                  <i className="fas fa-circle" style={{ fontSize:8, marginRight:6 }}/>
                  {notifs.filter(n=>!n.read).length} new notification{notifs.filter(n=>!n.read).length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {notifs.map(n => {
              const c = cfg(n.type)
              return (
                <div key={n.id}
                  style={{ display:'flex', alignItems:'flex-start', gap:13, padding:'14px 16px',
                    background: !n.read ? '#fafffe' : '#fff',
                    borderBottom:'1px solid #f5f5f5', cursor:'pointer', transition:'background .15s' }}
                  onMouseOver={e => e.currentTarget.style.background='#f8f9fa'}
                  onMouseOut={e => e.currentTarget.style.background = !n.read ? '#fafffe' : '#fff'}>

                  {/* Avatar with type icon */}
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <img src={av(n)} style={{ width:50, height:50, borderRadius:'50%', objectFit:'cover', display:'block' }} alt=""
                      onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=efefef`}/>
                    <div style={{ position:'absolute', bottom:-2, right:-2, width:22, height:22, borderRadius:'50%',
                      background:c.color, border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <i className={c.icon} style={{ color:'#fff', fontSize:9 }}/>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, color:'#202124', lineHeight:1.45, margin:0 }}>
                      <strong style={{ fontWeight:700 }}>{n.fromName || 'Someone'}</strong>
                      {' '}{n.message || 'interacted with you'}
                    </p>
                    {n.postSnippet && (
                      <p style={{ fontSize:12, color:'#9aa0a6', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        "{n.postSnippet}"
                      </p>
                    )}
                    <p style={{ fontSize:12, color:c.color, marginTop:4, fontWeight:500 }}>
                      {timeAgo(n.timestamp?.toDate?.() || n.timestamp)}
                    </p>
                  </div>

                  {/* Unread dot */}
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
