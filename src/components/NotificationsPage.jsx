import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../utils'

const TYPE_CFG = {
  like:     { icon:'fas fa-heart',      color:'#e53935' },
  comment:  { icon:'fas fa-comment',    color:'#1a73e8' },
  follow:   { icon:'fas fa-user-plus',  color:'#34a853' },
  unfollow: { icon:'fas fa-user-minus', color:'#9aa0a6' },
  repost:   { icon:'fas fa-retweet',    color:'#9334e6' },
}

export default function NotificationsPage({ open, onClose, onOpenProfile, onOpenPost }) {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [unsub, setUnsub] = useState(null)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    const q = query(collection(db, 'users', user.uid, 'notifications'), orderBy('timestamp','desc'), limit(50))
    const u = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
      // Mark all as read after 1.5s
      setTimeout(() => {
        snap.docs.forEach(d => {
          if (!d.data().read) updateDoc(doc(db, 'users', user.uid, 'notifications', d.id), { read: true }).catch(()=>{})
        })
      }, 1500)
    }, () => setLoading(false))
    setUnsub(() => u)
    return () => u()
  }, [open, user])

  useEffect(() => {
    if (!open && unsub) { unsub(); setUnsub(null) }
  }, [open])

  const cfg = (type) => TYPE_CFG[type] || { icon:'fas fa-bell', color:'#9aa0a6' }
  const av = n => n.fromAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((n.fromName||'U').substring(0,2))}&background=efefef&color=888`

  const handleClick = (n) => {
    if (n.postId) onOpenPost(n.postId)
    else if (n.fromUid) onOpenProfile(n.fromUid)
    onClose()
  }

  return (
    <div className={`page-layer ${open ? 'open' : ''}`}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--header-bg)', backdropFilter:'blur(20px)', zIndex:10 }}>
        <button className="page-back-btn" onClick={onClose}><i className="fas fa-arrow-left"/></button>
        <span style={{ fontWeight:700, fontSize:16, color:'var(--ink)' }}>Notifications</span>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:24, color:'var(--muted)' }}/></div>
      ) : notifs.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#9aa0a6' }}>
          <i className="far fa-bell" style={{ fontSize:40, marginBottom:12, display:'block', opacity:.3, color:'var(--muted)' }}/>
          <p style={{ fontWeight:600, marginBottom:6 }}>No notifications yet</p>
          <p style={{ fontSize:13, color:'var(--muted)' }}>When someone likes or follows you, you'll see it here</p>
        </div>
      ) : notifs.map(n => {
        const c = cfg(n.type)
        return (
          <div key={n.id} className={`notif-item ${!n.read?'unread':''}`} onClick={() => handleClick(n)}>
            <div className="notif-av">
              <img src={av(n)} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} alt=""
                onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=U&background=efefef`}}/>
              <div className="notif-badge-icon" style={{ background: c.color }}>
                <i className={c.icon} style={{ color:'#fff', fontSize:9 }}/>
              </div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="notif-text">
                <strong style={{ fontWeight:700 }}>{n.fromName||'Someone'}</strong>
                <span style={{ fontWeight:400 }}> {n.message||'interacted with you'}</span>
              </div>
              {n.postSnippet && <div style={{ fontSize:12, color:'#8e8e8e', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.postSnippet}</div>}
              <div className="notif-time" style={{ color: c.color }}>{timeAgo(n.timestamp?.toDate?.() || n.timestamp)}</div>
            </div>
            {!n.read && <div className="notif-dot"/>}
          </div>
        )
      })}
    </div>
  )
}
