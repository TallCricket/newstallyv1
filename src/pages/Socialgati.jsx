import { useState, useEffect, useRef, useCallback } from 'react'
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../utils'
import BottomNav from '../components/BottomNav'
import PostCard from '../components/PostCard'
import CommentsPage from '../components/CommentsPage'
import ProfilePage from '../components/ProfilePage'
import NotificationsPage from '../components/NotificationsPage'
import AuthModal from '../components/AuthModal'

function PostSkeleton() {
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:16, marginBottom:12, border:'1px solid #e0e0e0' }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <div className="skeleton" style={{ width:44, height:44, borderRadius:'50%', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div className="skeleton" style={{ height:12, width:'40%', marginBottom:8, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:10, width:'25%', marginBottom:12, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:16, width:'90%', marginBottom:6, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:16, width:'70%', borderRadius:4 }}/>
        </div>
      </div>
    </div>
  )
}

export default function Socialgati() {
  const { user, userData } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedType, setFeedType] = useState('all') // all | trending | following
  const [showAuth, setShowAuth] = useState(false)
  const [openCommentPost, setOpenCommentPost] = useState(null)
  const [openProfileUid, setOpenProfileUid] = useState(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [postText, setPostText] = useState('')
  const [posting, setPosting] = useState(false)
  const unsubRef = useRef(null)

  const loadFeed = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    setLoading(true)

    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
      orderBy('timestamp', 'desc'),
      limit(20)
    )

    unsubRef.current = onSnapshot(q, snap => {
      const p = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Trending sort by likes
      if (feedType === 'trending') p.sort((a,b) => (b.likes?.length||0)-(a.likes?.length||0))
      setPosts(p)
      setLoading(false)
    }, err => {
      console.error(err)
      setLoading(false)
    })
  }, [feedType])

  useEffect(() => {
    loadFeed()
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [loadFeed])

  const submitPost = async () => {
    if (!user) return setShowAuth(true)
    const t = postText.trim()
    if (!t) return showToast('Write something first!')
    if (t.length > 500) return showToast('Max 500 characters')
    setPosting(true)
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'), {
        userId: user.uid,
        username: userData?.username || user.displayName || 'User',
        userAvatar: user.photoURL || '',
        headline: t,
        likes: [], commentsCount: 0,
        timestamp: serverTimestamp(),
        type: 'text'
      })
      setPostText('')
      setShowCreateModal(false)
      showToast('Posted! ✅')
    } catch(e) { showToast('Failed. Try again.') }
    finally { setPosting(false) }
  }

  const handleSearch = async (val) => {
    if (!val.trim()) return
    // Search users
    const uq = query(collection(db,'users'), where('username','>=',val.toLowerCase()), where('username','<=',val.toLowerCase()+'~'), limit(5))
    const pq = query(collection(db,'artifacts',APP_ID,'public','data','reposts'), where('headline','>=',val), where('headline','<=',val+'~'), limit(5))
    const [uSnap, pSnap] = await Promise.all([getDocs(uq), getDocs(pq)])
    return { users: uSnap.docs.map(d=>({id:d.id,...d.data()})), posts: pSnap.docs.map(d=>({id:d.id,...d.data()})) }
  }

  const av = user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName||'U')}&background=9334e6&color=fff`

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="NewsTally"/>
          <span className="logo-text">Socialgati</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={()=>user?setShowNotifs(true):setShowAuth(true)}>
            <i className="fas fa-bell"/>
          </button>
          {user
            ? <img src={av} style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', cursor:'pointer' }} onClick={()=>setOpenProfileUid(user.uid)} alt=""/>
            : <button className="btn-signin" onClick={()=>setShowAuth(true)}>Sign In</button>
          }
        </div>
      </header>

      <div className="main-wrapper">
        {/* Feed tabs */}
        <div style={{ display:'flex', gap:0, padding:'12px 16px 0', borderBottom:'1px solid #f0f0f0', background:'#fff' }}>
          {['all','trending','following'].map(t => (
            <button key={t} onClick={()=>setFeedType(t)} style={{
              padding:'8px 16px', fontSize:13, fontWeight:600,
              color: feedType===t ? '#0f0f0f' : '#606060',
              borderBottom: feedType===t ? '2px solid #0f0f0f' : '2px solid transparent',
              background:'none', border:'none', borderBottom: feedType===t ? '2px solid #0f0f0f' : '2px solid transparent',
              cursor:'pointer', textTransform:'capitalize'
            }}>{t === 'all' ? 'For All' : t.charAt(0).toUpperCase()+t.slice(1)}</button>
          ))}
        </div>

        {/* Create post bar */}
        <div style={{ padding:'12px 16px', background:'#fff', borderBottom:'1px solid #f0f0f0', display:'flex', gap:10, alignItems:'center' }}>
          <img src={av} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} alt=""
            onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}}/>
          <button onClick={()=>user?setShowCreateModal(true):setShowAuth(true)}
            style={{ flex:1, textAlign:'left', padding:'10px 16px', background:'#f1f3f4', border:'none', borderRadius:99, fontSize:14, color:'#9aa0a6', cursor:'pointer' }}>
            What's happening?
          </button>
          <button onClick={()=>user?setShowCreateModal(true):setShowAuth(true)}
            style={{ padding:'8px 16px', background:'#9334e6', color:'#fff', borderRadius:99, fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}>
            Post
          </button>
        </div>

        {/* Feed */}
        <div style={{ padding:'12px 16px' }}>
          {loading ? Array.from({length:4}).map((_,i)=><PostSkeleton key={i}/>) :
           posts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'#9aa0a6' }}>
              <i className="fas fa-bolt" style={{ fontSize:40, color:'#9334e6', marginBottom:12, display:'block', opacity:.4 }}/>
              <p style={{ fontWeight:600, marginBottom:6 }}>Nothing here yet</p>
              <p style={{ fontSize:13 }}>Be the first to post!</p>
            </div>
           ) : posts.map(p => (
            <PostCard key={p.id} post={p} id={p.id}
              onOpenComments={setOpenCommentPost}
              onOpenProfile={setOpenProfileUid}
              onAuthRequired={()=>setShowAuth(true)}
            />
           ))}
        </div>
      </div>

      {/* Create post modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCreateModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">New Post</span>
              <button className="icon-btn" onClick={()=>setShowCreateModal(false)}><i className="fas fa-times"/></button>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <img src={av} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} alt=""/>
              <textarea value={postText} onChange={e=>setPostText(e.target.value)} placeholder="What's happening?"
                style={{ flex:1, minHeight:100, padding:'10px 14px', background:'#f8f9fa', border:'none', borderRadius:12, fontSize:15, resize:'none', outline:'none', fontFamily:'inherit', lineHeight:1.5 }}
                maxLength={500}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
              <span style={{ fontSize:12, color: postText.length>450?'#e53935':'#9aa0a6' }}>{500-postText.length} chars left</span>
              <button onClick={submitPost} disabled={!postText.trim()||posting}
                style={{ padding:'10px 28px', background:'#9334e6', color:'#fff', borderRadius:99, fontSize:14, fontWeight:700, border:'none', cursor:'pointer', opacity:!postText.trim()||posting?0.6:1 }}>
                {posting ? <i className="fas fa-spinner fa-spin"/> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layers */}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)}/>}
      <CommentsPage postId={openCommentPost} onClose={()=>setOpenCommentPost(null)} onOpenProfile={uid=>{setOpenCommentPost(null);setOpenProfileUid(uid)}}/>
      {openProfileUid && <ProfilePage uid={openProfileUid} onClose={()=>setOpenProfileUid(null)} onOpenComments={setOpenCommentPost} onOpenProfile={setOpenProfileUid} onAuthRequired={()=>setShowAuth(true)}/>}
      <NotificationsPage open={showNotifs} onClose={()=>setShowNotifs(false)} onOpenProfile={uid=>{setShowNotifs(false);setOpenProfileUid(uid)}} onOpenPost={pid=>{setShowNotifs(false);setOpenCommentPost(pid)}}/>

      <BottomNav/>
    </>
  )
}
