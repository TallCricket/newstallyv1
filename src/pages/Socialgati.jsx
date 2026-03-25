import { useState, useEffect, useRef, useCallback } from 'react'
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo } from '../utils'
import BottomNav from '../components/BottomNav'
import PostCard from '../components/PostCard'
import CommentsPage from '../components/CommentsPage'
import ProfilePage from '../components/ProfilePage'
import NotificationsPage from '../components/NotificationsPage'
import AuthModal from '../components/AuthModal'
import { useNavigate } from 'react-router-dom'

// ── Skeleton ──────────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div style={{ background:'#fff', borderRadius:16, padding:16, marginBottom:10, border:'1px solid #f0f0f0' }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <div className="skeleton" style={{ width:42, height:42, borderRadius:'50%', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div className="skeleton" style={{ height:12, width:'45%', marginBottom:8, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:10, width:'30%', marginBottom:14, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:15, width:'95%', marginBottom:6, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:15, width:'75%', borderRadius:4 }}/>
        </div>
      </div>
    </div>
  )
}

// ── Stories strip (placeholder) ───────────────────────────────────
function StoriesStrip({ user, onAuth }) {
  const stories = [
    { label:'Your story', isAdd:true },
    { label:'Trending', icon:'fas fa-fire', color:'#ff6d00' },
    { label:'Breaking', icon:'fas fa-bolt', color:'#e53935' },
    { label:'Politics', icon:'fas fa-landmark', color:'#1a73e8' },
    { label:'Sports', icon:'fas fa-futbol', color:'#34a853' },
  ]
  return (
    <div style={{ display:'flex', gap:12, overflowX:'auto', padding:'12px 16px', scrollbarWidth:'none', background:'#fff', borderBottom:'1px solid #f0f0f0' }}>
      {stories.map((s, i) => (
        <div key={i} onClick={() => !user && i===0 ? onAuth() : null}
          style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flexShrink:0, cursor:'pointer' }}>
          <div style={{ width:54, height:54, borderRadius:'50%',
            background: s.isAdd ? '#f1f3f4' : `linear-gradient(135deg,${s.color}33,${s.color}66)`,
            border: s.isAdd ? '2px dashed #ccc' : `2px solid ${s.color}`,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            {s.isAdd
              ? <i className="fas fa-plus" style={{ fontSize:18, color:'#9aa0a6' }}/>
              : <i className={s.icon} style={{ fontSize:20, color:s.color }}/>
            }
          </div>
          <span style={{ fontSize:10, fontWeight:600, color:'#606060', maxWidth:56, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {s.isAdd ? (user ? 'Your story' : 'Add story') : s.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Trending hashtags ─────────────────────────────────────────────
function TrendingTags({ onTagClick }) {
  const tags = ['#IPL2026','#IndiaNews','#Breaking','#Technology','#Politics','#Sports','#Socialgati']
  return (
    <div style={{ padding:'14px 16px', background:'#fff', borderBottom:'1px solid #f0f0f0' }}>
      <p style={{ fontSize:12, fontWeight:700, color:'#9aa0a6', marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>Trending</p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {tags.map(t => (
          <button key={t} onClick={() => onTagClick(t)}
            style={{ padding:'5px 12px', borderRadius:99, background:'#f3e8ff', color:'#9334e6', fontSize:12, fontWeight:700, border:'none', cursor:'pointer' }}>
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Who to follow (placeholder) ───────────────────────────────────
function WhoToFollow({ onAuth, user }) {
  if (!user) return null
  return null // Can be expanded later
}

// ── Main ──────────────────────────────────────────────────────────
export default function Socialgati() {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedType, setFeedType] = useState('all')
  const [showAuth, setShowAuth] = useState(false)
  const [openCommentPost, setOpenCommentPost] = useState(null)
  const [openProfileUid, setOpenProfileUid] = useState(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [postText, setPostText] = useState('')
  const [posting, setPosting] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const unsubRef = useRef(null)

  const av = user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName||'U')}&background=9334e6&color=fff`

  const loadFeed = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    setLoading(true)
    const q = query(collection(db,'artifacts',APP_ID,'public','data','reposts'), orderBy('timestamp','desc'), limit(20))
    unsubRef.current = onSnapshot(q, snap => {
      let p = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      if (feedType === 'trending') p.sort((a,b) => (b.likes?.length||0)-(a.likes?.length||0))
      setPosts(p)
      setLoading(false)
    }, err => { console.error(err); setLoading(false) })
  }, [feedType])

  useEffect(() => { loadFeed(); return () => { if(unsubRef.current) unsubRef.current() } }, [loadFeed])

  const submitPost = async () => {
    if (!user) return setShowAuth(true)
    const t = postText.trim()
    if (!t) return showToast('Write something first!')
    if (t.length > 500) return showToast('Max 500 characters')
    setPosting(true)
    try {
      await addDoc(collection(db,'artifacts',APP_ID,'public','data','reposts'), {
        userId: user.uid,
        username: userData?.username || user.displayName || 'User',
        userAvatar: user.photoURL || '',
        headline: t, likes:[], commentsCount:0,
        timestamp: serverTimestamp(), type:'text'
      })
      setPostText(''); setShowCreateModal(false)
      showToast('Posted! ✅')
    } catch(e) { showToast('Failed. Try again.') }
    finally { setPosting(false) }
  }

  const handleSearch = async (val) => {
    setSearchVal(val)
    if (!val.trim()) { setSearchResults(null); return }
    try {
      const v = val.toLowerCase()
      const [uSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db,'users'), where('username','>=',v), where('username','<=',v+'~'), limit(5))),
        getDocs(query(collection(db,'artifacts',APP_ID,'public','data','reposts'), where('headline','>=',val), where('headline','<=',val+'~'), limit(5)))
      ])
      setSearchResults({
        users: uSnap.docs.map(d=>({id:d.id,...d.data()})),
        posts: pSnap.docs.map(d=>({id:d.id,...d.data()}))
      })
    } catch(e) { setSearchResults(null) }
  }

  return (
    <>
      {/* ── Header ── */}
      <header className="header" style={{ borderBottom:'1px solid #f0f0f0' }}>
        <div className="logo" onClick={() => navigate('/')}>
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="Socialgati" style={{ width:36, height:36, borderRadius:'50%' }}/>
          <div>
            <span style={{ fontSize:18, fontWeight:800, color:'#9334e6', fontFamily:'inherit', letterSpacing:'-.3px', display:'block', lineHeight:1.1 }}>Socialgati</span>
            <span style={{ fontSize:10, color:'#9aa0a6', fontWeight:500, display:'block' }}>by NewsTally</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button className="icon-btn" onClick={() => setShowSearch(s => !s)} title="Search">
            <i className="fas fa-magnifying-glass"/>
          </button>
          <button className="icon-btn" style={{ position:'relative' }} onClick={() => user ? setShowNotifs(true) : setShowAuth(true)}>
            <i className="fas fa-bell"/>
          </button>
          {user
            ? <img src={av} style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', cursor:'pointer', border:'2px solid #e9d5ff' }}
                onClick={() => navigate('/profile')} alt=""
                onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}/>
            : <button style={{ padding:'7px 18px', background:'linear-gradient(135deg,#9334e6,#7c2dc9)', color:'#fff', borderRadius:99, fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}
                onClick={() => setShowAuth(true)}>Sign In</button>
          }
        </div>
      </header>

      <div className="main-wrapper">
        {/* ── Search overlay ── */}
        {showSearch && (
          <div style={{ padding:'10px 16px', background:'#fff', borderBottom:'1px solid #f0f0f0', position:'sticky', top:56, zIndex:50 }}>
            <div style={{ position:'relative' }}>
              <i className="fas fa-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9aa0a6', fontSize:13, pointerEvents:'none' }}/>
              <input autoFocus value={searchVal} onChange={e => handleSearch(e.target.value)}
                placeholder="Search people, posts..."
                style={{ width:'100%', padding:'10px 36px', background:'#f1f3f4', border:'none', borderRadius:99, fontSize:14, outline:'none' }}/>
              {searchVal && <button onClick={() => { setSearchVal(''); setSearchResults(null) }}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#9aa0a6', cursor:'pointer' }}>
                <i className="fas fa-times-circle"/>
              </button>}
            </div>
            {/* Search results */}
            {searchResults && (
              <div style={{ marginTop:8, background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', overflow:'hidden' }}>
                {searchResults.users.map(u => (
                  <div key={u.id} style={{ display:'flex', gap:10, padding:'10px 14px', alignItems:'center', cursor:'pointer', borderBottom:'1px solid #f5f5f5' }}
                    onClick={() => { setOpenProfileUid(u.id); setShowSearch(false); setSearchVal(''); setSearchResults(null) }}>
                    <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName||'U')}&background=9334e6&color=fff`}
                      style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }} alt=""/>
                    <div>
                      <p style={{ fontSize:14, fontWeight:700, color:'#0f0f0f' }}>{u.displayName}</p>
                      <p style={{ fontSize:12, color:'#9aa0a6' }}>@{u.username}</p>
                    </div>
                  </div>
                ))}
                {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                  <p style={{ padding:'14px 16px', fontSize:13, color:'#9aa0a6', textAlign:'center' }}>No results for "{searchVal}"</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Stories ── */}
        <StoriesStrip user={user} onAuth={() => setShowAuth(true)}/>

        {/* ── Feed tabs ── */}
        <div style={{ display:'flex', background:'#fff', borderBottom:'1px solid #f0f0f0', position:'sticky', top:56, zIndex:40 }}>
          {[['all','For You'],['trending','Trending 🔥'],['following','Following']].map(([k,label]) => (
            <button key={k} onClick={() => setFeedType(k)}
              style={{ flex:1, padding:'11px 8px', fontSize:13, fontWeight:700,
                color: feedType===k ? '#9334e6' : '#9aa0a6',
                borderBottom: feedType===k ? '2px solid #9334e6' : '2px solid transparent',
                background:'none', border:'none', borderBottom: feedType===k ? '2px solid #9334e6' : '2px solid transparent',
                cursor:'pointer', transition:'all .2s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Create post bar ── */}
        <div style={{ padding:'12px 16px', background:'#fff', borderBottom:'1px solid #f0f0f0', display:'flex', gap:10, alignItems:'center' }}>
          <img src={av} style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'2px solid #e9d5ff' }} alt=""
            onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}/>
          <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
            style={{ flex:1, textAlign:'left', padding:'10px 16px', background:'#f8f5ff', border:'1.5px solid #e9d5ff', borderRadius:99, fontSize:14, color:'#c4a4e8', cursor:'pointer', fontFamily:'inherit' }}>
            Share your thoughts...
          </button>
          <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
            style={{ width:38, height:38, background:'linear-gradient(135deg,#9334e6,#7c2dc9)', color:'#fff', borderRadius:'50%', fontSize:16, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(147,52,230,.4)' }}>
            <i className="fas fa-pen"/>
          </button>
        </div>

        {/* ── Trending tags ── */}
        <TrendingTags onTagClick={tag => { setShowCreateModal(true); setPostText(tag + ' ') }}/>

        {/* ── Feed ── */}
        <div style={{ padding:'8px 16px 80px' }}>
          {loading
            ? Array.from({length:4}).map((_,i) => <PostSkeleton key={i}/>)
            : posts.length === 0
              ? (
                <div style={{ textAlign:'center', padding:'60px 20px' }}>
                  <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#f3e8ff,#ede9fe)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                    <i className="fas fa-bolt" style={{ fontSize:32, color:'#9334e6' }}/>
                  </div>
                  <p style={{ fontSize:17, fontWeight:700, color:'#0f0f0f', marginBottom:8 }}>Nothing here yet</p>
                  <p style={{ fontSize:14, color:'#9aa0a6', marginBottom:20 }}>Be the first to post on Socialgati!</p>
                  <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
                    style={{ padding:'11px 28px', background:'linear-gradient(135deg,#9334e6,#7c2dc9)', color:'#fff', border:'none', borderRadius:99, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    ✍️ Create Post
                  </button>
                </div>
              )
              : posts.map(p => (
                <PostCard key={p.id} post={p} id={p.id}
                  onOpenComments={setOpenCommentPost}
                  onOpenProfile={setOpenProfileUid}
                  onAuthRequired={() => setShowAuth(true)}
                />
              ))
          }
        </div>
      </div>

      {/* Floating post button (mobile) */}
      <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
        style={{ position:'fixed', bottom:72, right:16, width:52, height:52,
          background:'linear-gradient(135deg,#9334e6,#7c2dc9)', color:'#fff', borderRadius:'50%',
          border:'none', cursor:'pointer', fontSize:20, boxShadow:'0 4px 16px rgba(147,52,230,.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:90 }}>
        <i className="fas fa-plus"/>
      </button>

      {/* ── Create post modal ── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowCreateModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">New Post</span>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}><i className="fas fa-times"/></button>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <img src={av} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'2px solid #e9d5ff' }} alt=""/>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#9334e6', marginBottom:6 }}>{userData?.username ? '@'+userData.username : 'You'}</p>
                <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="What's on your mind?"
                  style={{ width:'100%', minHeight:100, padding:'10px 0', background:'transparent', border:'none', borderBottom:'1.5px solid #f0f0f0',
                    fontSize:16, resize:'none', outline:'none', fontFamily:'inherit', lineHeight:1.6, color:'#0f0f0f' }}
                  maxLength={500} autoFocus/>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingTop:12, borderTop:'1px solid #f0f0f0' }}>
              <span style={{ fontSize:12, color: postText.length>450 ? '#e53935' : '#9aa0a6' }}>{500-postText.length}</span>
              <button onClick={submitPost} disabled={!postText.trim()||posting}
                style={{ padding:'10px 28px', background: postText.trim() ? 'linear-gradient(135deg,#9334e6,#7c2dc9)' : '#e9d5ff',
                  color:'#fff', borderRadius:99, fontSize:14, fontWeight:700, border:'none',
                  cursor: postText.trim() ? 'pointer' : 'not-allowed', transition:'all .2s' }}>
                {posting ? <i className="fas fa-spinner fa-spin"/> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Layers ── */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <CommentsPage postId={openCommentPost} onClose={() => setOpenCommentPost(null)} onOpenProfile={uid => { setOpenCommentPost(null); setOpenProfileUid(uid) }}/>
      {openProfileUid && <ProfilePage uid={openProfileUid} onClose={() => setOpenProfileUid(null)} onOpenComments={setOpenCommentPost} onOpenProfile={setOpenProfileUid} onAuthRequired={() => setShowAuth(true)}/>}
      <NotificationsPage open={showNotifs} onClose={() => setShowNotifs(false)} onOpenProfile={uid => { setShowNotifs(false); setOpenProfileUid(uid) }} onOpenPost={pid => { setShowNotifs(false); setOpenCommentPost(pid) }}/>
      <BottomNav/>
    </>
  )
}
