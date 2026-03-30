import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection, query, orderBy, limit, onSnapshot,
  addDoc, serverTimestamp, where, getDocs, getDoc, doc
} from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../utils'
import BottomNav from '../components/BottomNav'
import PostCard from '../components/PostCard'
import CommentsPage from '../components/CommentsPage'
import ProfilePage from '../components/ProfilePage'
import NotificationsPage from '../components/NotificationsPage'
import AuthModal from '../components/AuthModal'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DesktopNav from '../components/DesktopNav'

// -- Skeleton
function PostSkeleton() {
  return (
    <div style={{ background:'var(--surface)', borderRadius:12, padding:16, marginBottom:8, border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', gap:10 }}>
        <div className="skeleton" style={{ width:40, height:40, borderRadius:'50%', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div className="skeleton" style={{ height:11, width:'40%', marginBottom:7, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:9, width:'25%', marginBottom:12, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:14, width:'92%', marginBottom:6, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:14, width:'70%', borderRadius:4 }}/>
        </div>
      </div>
    </div>
  )
}

// -- MentionInput
function MentionInput({ value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([])
  const [mentionQuery, setMentionQuery] = useState(null)
  const textareaRef = useRef(null)
  const debounceRef = useRef(null)

  const detectMention = (text, cursorPos) => {
    const before = text.slice(0, cursorPos)
    const m = before.match(/@(\w*)$/)
    if (!m) { setSuggestions([]); setMentionQuery(null); return }
    const q = m[1].toLowerCase()
    setMentionQuery(q)
    if (!q) { setSuggestions([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const snap = await getDocs(query(collection(db,'users'), where('username','>=',q), where('username','<=',q+'~'), limit(6)))
        setSuggestions(snap.docs.map(d => ({ id:d.id, ...d.data() })))
      } catch { setSuggestions([]) }
    }, 250)
  }

  const insertMention = (username) => {
    const ta = textareaRef.current
    if (!ta) return
    const pos = ta.selectionStart
    const before = value.slice(0, pos)
    const atIdx = before.lastIndexOf('@')
    const newText = value.slice(0, atIdx) + '@' + username + ' ' + value.slice(pos)
    onChange(newText)
    setSuggestions([])
    setMentionQuery(null)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(atIdx+username.length+2, atIdx+username.length+2) }, 0)
  }

  return (
    <div style={{ position:'relative' }}>
      <textarea ref={textareaRef} value={value}
        onChange={e => { onChange(e.target.value); detectMention(e.target.value, e.target.selectionStart) }}
        placeholder={placeholder} autoFocus maxLength={500}
        style={{ width:'100%', minHeight:100, padding:'8px 0', background:'transparent', border:'none',
          borderBottom:'1.5px solid var(--border)', fontSize:15, resize:'none', outline:'none',
          fontFamily:'inherit', lineHeight:1.6, color:'var(--ink)', boxSizing:'border-box' }}
      />
      {suggestions.length > 0 && mentionQuery !== null && (
        <div style={{ position:'absolute', bottom:'100%', left:0, right:0, background:'var(--surface)',
          border:'1px solid var(--border)', borderRadius:12, boxShadow:'var(--shadow-md)',
          zIndex:300, maxHeight:220, overflowY:'auto', marginBottom:4 }}>
          {suggestions.map(u => (
            <div key={u.id} onMouseDown={e => { e.preventDefault(); insertMention(u.username) }}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border2)' }}
              onMouseOver={e => e.currentTarget.style.background='var(--surface2)'}
              onMouseOut={e => e.currentTarget.style.background='transparent'}>
              <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName||'U')}&background=9334e6&color=fff`}
                style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}
                alt="" onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}/>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--ink)', margin:0 }}>{u.displayName||u.username}</p>
                <p style={{ fontSize:12, color:'#9334e6', margin:0 }}>@{u.username}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// -- Hamburger Drawer
function HamburgerDrawer({ open, onClose, feedType, setFeedType, user, onSignIn }) {
  const navigate = useNavigate()

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition:'opacity .25s'
      }}/>
      <div style={{
        position:'fixed', top:0, left:0, bottom:0, width:270,
        background:'var(--surface)', zIndex:201,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform .28s cubic-bezier(.4,0,.2,1)',
        display:'flex', flexDirection:'column',
        boxShadow: open ? '4px 0 24px rgba(0,0,0,.18)' : 'none',
        borderRight:'1px solid var(--border)'
      }}>
        {/* Header */}
        <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:20, fontWeight:800, color:'#1a73e8', letterSpacing:'-.3px' }}>Socialgati</span>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', background:'var(--surface2)',
            border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--muted)', fontSize:14 }}>
            <i className="fas fa-times"/>
          </button>
        </div>

        {/* Feed section */}
        <div style={{ padding:'12px 0' }}>
          <p style={{ fontSize:10, fontWeight:800, color:'var(--muted)', textTransform:'uppercase',
            letterSpacing:'.06em', padding:'4px 20px 8px' }}>Feed</p>
          {[
            { key:'all',       icon:'fas fa-th-large',    label:'For You'   },
            { key:'following', icon:'fas fa-user-friends', label:'Following' },
          ].map(item => (
            <button key={item.key} onClick={() => { setFeedType(item.key); onClose() }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14,
                padding:'13px 20px', background: feedType===item.key ? 'rgba(26,115,232,.1)' : 'transparent',
                border:'none', cursor:'pointer', textAlign:'left',
                borderLeft: feedType===item.key ? '3px solid #1a73e8' : '3px solid transparent' }}>
              <i className={item.icon} style={{ fontSize:16, color: feedType===item.key ? '#1a73e8' : 'var(--muted)', width:20, textAlign:'center' }}/>
              <span style={{ fontSize:15, fontWeight: feedType===item.key ? 700 : 500, color: feedType===item.key ? '#1a73e8' : 'var(--ink)' }}>
                {item.label}
              </span>
              {feedType===item.key && <i className="fas fa-check" style={{ marginLeft:'auto', fontSize:12, color:'#1a73e8' }}/>}
            </button>
          ))}
        </div>

        <div style={{ height:1, background:'var(--border)', margin:'4px 20px' }}/>

        {/* Navigate */}
        <div style={{ padding:'12px 0' }}>
          <p style={{ fontSize:10, fontWeight:800, color:'var(--muted)', textTransform:'uppercase',
            letterSpacing:'.06em', padding:'4px 20px 8px' }}>Navigate</p>
          {[
            { icon:'fas fa-newspaper',   label:'News',   path:'/news'   },
            { icon:'fas fa-circle-play', label:'Shorts', path:'/shorts' },
            { icon:'fas fa-bell',        label:'Alerts', path:'/alerts' },
          ].map(item => (
            <button key={item.path} onClick={() => { navigate(item.path); onClose() }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14,
                padding:'13px 20px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
              <i className={item.icon} style={{ fontSize:16, color:'var(--muted)', width:20, textAlign:'center' }}/>
              <span style={{ fontSize:15, fontWeight:500, color:'var(--ink)' }}>{item.label}</span>
            </button>
          ))}
        </div>

        <div style={{ height:1, background:'var(--border)', margin:'4px 20px' }}/>

        {/* Settings */}
        <div style={{ padding:'12px 0' }}>
          {[
            { icon:'fas fa-user', label:'Profile',  path:'/profile' },
            { icon:'fas fa-cog',  label:'Settings', path:'/profile' },
          ].map(item => (
            <button key={item.label} onClick={() => { navigate(item.path); onClose() }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14,
                padding:'13px 20px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
              <i className={item.icon} style={{ fontSize:16, color:'var(--muted)', width:20, textAlign:'center' }}/>
              <span style={{ fontSize:15, fontWeight:500, color:'var(--ink)' }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom user chip */}
        <div style={{ marginTop:'auto', padding:'16px 20px', borderTop:'1px solid var(--border)' }}>
          {user ? (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent((user.displayName||'U').slice(0,2))}&background=1a73e8&color=fff`}
                style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover' }}
                alt="" onError={e => e.target.src='https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff'}/>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {user.displayName || 'User'}
                </div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>Logged in</div>
              </div>
            </div>
          ) : (
            <button onClick={() => { onSignIn(); onClose() }}
              style={{ width:'100%', padding:11, background:'#1a73e8', color:'#fff', border:'none',
                borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ===================================================================
// MAIN PAGE
// ===================================================================
export default function Socialgati() {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const postId = searchParams.get('post')
    if (postId) setOpenCommentPost(postId)
  }, [searchParams])

  const [posts, setPosts]                     = useState([])
  const [loading, setLoading]                 = useState(true)
  const [feedType, setFeedType]               = useState('all')
  const [showDrawer, setShowDrawer]           = useState(false)
  const [showAuth, setShowAuth]               = useState(false)
  const [openCommentPost, setOpenCommentPost] = useState(null)
  const [openProfileUid, setOpenProfileUid]   = useState(null)
  const [showNotifs, setShowNotifs]           = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [postText, setPostText]               = useState('')
  const [posting, setPosting]                 = useState(false)
  const [unread, setUnread]                   = useState(0)

  useEffect(() => {
    if (!user) { setUnread(0); return }
    const q = query(collection(db,'users',user.uid,'notifications'), where('read','==',false), limit(99))
    const unsub = onSnapshot(q, snap => setUnread(snap.size), () => {})
    return unsub
  }, [user])

  const unsubRef = useRef(null)

  const loadFeed = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    setLoading(true)
    const q = query(
      collection(db,'artifacts',APP_ID,'public','data','reposts'),
      orderBy('timestamp','desc'),
      limit(40)
    )
    unsubRef.current = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id:d.id, ...d.data() })))
      setLoading(false)
    }, err => { console.error(err); setLoading(false) })
  }, [])

  useEffect(() => {
    loadFeed()
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [loadFeed])

  const displayPosts = feedType === 'following' && user
    ? posts.filter(p => p.userId === user.uid)
    : posts

  const submitPost = async () => {
    if (!user) return setShowAuth(true)
    const t = postText.trim()
    if (!t) return showToast('Write something first!')
    if (t.length > 500) return showToast('Max 500 characters')
    setPosting(true)
    try {
      const hashtags = [...new Set((t.match(/#(\w+)/g)||[]).map(h => h.slice(1).toLowerCase()))]
      const mentions = (t.match(/@(\w+)/g)||[]).map(m => m.slice(1).toLowerCase())
      await addDoc(collection(db,'artifacts',APP_ID,'public','data','reposts'), {
        userId:user.uid,
        username:userData?.username||user.displayName||'User',
        userAvatar:user.photoURL||'',
        headline:t, hashtags, mentions, likes:[], commentsCount:0,
        timestamp:serverTimestamp(), type:'text'
      })
      setPostText(''); setShowCreateModal(false); showToast('Posted! ✅')
    } catch { showToast('Failed. Try again.') }
    finally { setPosting(false) }
  }

  const handleMentionClick = async (username) => {
    try {
      const snap = await getDocs(query(collection(db,'users'), where('username','==',username.toLowerCase()), limit(1)))
      if (!snap.empty) setOpenProfileUid(snap.docs[0].id)
      else showToast(`@${username} not found`)
    } catch { showToast('Could not open profile') }
  }

  const feedLabel = feedType === 'following' ? 'Following' : 'For You'

  return (
    <>
      <DesktopNav onNewPost={() => user ? setShowCreateModal(true) : setShowAuth(true)} />

      {/* Mobile Header */}
      <header className="sg-desktop-header-hidden" style={{
        position:'fixed', top:0, left:0, right:0, height:56,
        background:'var(--header-bg)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 16px', zIndex:100
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => setShowDrawer(true)} style={{
            width:36, height:36, borderRadius:8, border:'none',
            background:'transparent', color:'var(--ink)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18
          }}>
            <i className="fas fa-bars"/>
          </button>
          <div style={{ cursor:'pointer' }} onClick={() => navigate('/')}>
            <div style={{ fontSize:20, fontWeight:800, color:'#1a73e8', lineHeight:1, letterSpacing:'-.3px' }}>Socialgati</div>
            <div style={{ fontSize:10, color:'var(--muted)', fontWeight:500, lineHeight:1.2 }}>{feedLabel}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <button onClick={() => user ? navigate('/alerts') : setShowAuth(true)} style={{
            width:36, height:36, borderRadius:8, border:'none', background:'transparent',
            color:'var(--muted)', cursor:'pointer', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:16, position:'relative'
          }}>
            <i className="fas fa-bell"/>
            {unread > 0 && (
              <span style={{ position:'absolute', top:4, right:4, width:16, height:16,
                borderRadius:'50%', background:'#e53935', color:'#fff', fontSize:9,
                fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center',
                border:'1.5px solid var(--header-bg)', lineHeight:1 }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {!user && (
            <button onClick={() => setShowAuth(true)} style={{
              padding:'6px 16px', background:'#1a73e8', color:'#fff',
              borderRadius:99, fontSize:13, fontWeight:700, border:'none', cursor:'pointer'
            }}>Sign In</button>
          )}
        </div>
      </header>

      {/* Hamburger Drawer */}
      <HamburgerDrawer open={showDrawer} onClose={() => setShowDrawer(false)}
        feedType={feedType} setFeedType={setFeedType}
        user={user} onSignIn={() => setShowAuth(true)} />

      {/* Mobile feed */}
      <div className="sg-mobile-only" style={{ paddingTop:56, paddingBottom:80, background:'var(--bg)', minHeight:'100dvh' }}>
        <div style={{ padding:'8px 12px' }}>
          {loading
            ? Array.from({length:4}).map((_,i) => <PostSkeleton key={i}/>)
            : displayPosts.length === 0
              ? (
                <div style={{ textAlign:'center', padding:'64px 20px' }}>
                  <div style={{ width:72, height:72, borderRadius:'50%', background:'#e8f0fe',
                    display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                    <i className="fas fa-bolt" style={{ fontSize:28, color:'#1a73e8' }}/>
                  </div>
                  <p style={{ fontSize:17, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>Nothing here yet</p>
                  <p style={{ fontSize:14, color:'var(--muted)', marginBottom:20 }}>Be the first to post on Socialgati!</p>
                  <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
                    style={{ padding:'10px 28px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:99, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    Create Post
                  </button>
                </div>
              )
              : displayPosts.map(p => (
                <PostCard key={p.id} post={p} id={p.id}
                  onOpenComments={setOpenCommentPost} onOpenProfile={setOpenProfileUid}
                  onAuthRequired={() => setShowAuth(true)} onMention={handleMentionClick}
                  onHashtag={tag => navigate(`/hashtag/${tag.toLowerCase()}`)}/>
              ))
          }
        </div>
      </div>

      {/* Desktop 3-col layout */}
      <div className="sg-desktop-shell">
        <div className="sg-desktop-feed">
          {loading
            ? Array.from({length:4}).map((_,i) => <PostSkeleton key={i}/>)
            : displayPosts.length === 0
              ? (
                <div style={{ textAlign:'center', padding:'64px 20px', background:'var(--surface)', borderRadius:16, border:'1px solid var(--border)' }}>
                  <i className="fas fa-bolt" style={{ fontSize:36, color:'#1a73e8', marginBottom:12, display:'block' }}/>
                  <p style={{ fontSize:17, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>Nothing here yet</p>
                  <p style={{ fontSize:14, color:'var(--muted)', marginBottom:20 }}>Be the first to post!</p>
                  <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
                    style={{ padding:'10px 28px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:99, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    Create Post
                  </button>
                </div>
              )
              : displayPosts.map(p => (
                <PostCard key={p.id} post={p} id={p.id}
                  onOpenComments={setOpenCommentPost} onOpenProfile={setOpenProfileUid}
                  onAuthRequired={() => setShowAuth(true)} onMention={handleMentionClick}
                  onHashtag={tag => navigate(`/hashtag/${tag.toLowerCase()}`)}/>
              ))
          }
        </div>
        <div className="sg-desktop-right">
          {!user && (
            <div className="sg-widget">
              <p style={{ fontSize:14, color:'var(--ink)', fontWeight:700, marginBottom:8 }}>Join Socialgati</p>
              <p style={{ fontSize:13, color:'var(--muted)', marginBottom:12, lineHeight:1.5 }}>Post, follow and connect with the community.</p>
              <button onClick={() => setShowAuth(true)} style={{ width:'100%', padding:10, background:'#1a73e8', color:'#fff', border:'none', borderRadius:99, fontSize:14, fontWeight:700, cursor:'pointer' }}>Sign In</button>
            </div>
          )}
          <div className="sg-widget" style={{ textAlign:'center' }}>
            <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 10px' }} alt=""/>
            <p style={{ fontSize:14, fontWeight:800, color:'var(--ink)' }}>NewsTally</p>
            <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>India's social news platform</p>
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={() => navigate('/news')} style={{ flex:1, padding:8, background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>News</button>
              <button onClick={() => navigate('/shorts')} style={{ flex:1, padding:8, background:'var(--surface2)', color:'var(--ink)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>Shorts</button>
            </div>
          </div>
          <p style={{ fontSize:11, color:'var(--muted)', padding:'0 4px' }}>&copy; 2025 NewsTally &middot; Socialgati</p>
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)} style={{
        position:'fixed', bottom:92, right:16, width:52, height:52,
        borderRadius:'50%', background:'#1a73e8', color:'#fff', border:'none',
        cursor:'pointer', fontSize:20, display:'flex', alignItems:'center',
        justifyContent:'center', zIndex:90, boxShadow:'0 4px 16px rgba(26,115,232,.5)'
      }}>
        <i className="fas fa-plus"/>
      </button>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowCreateModal(false)}>
          <div className="modal">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>New Post</span>
              <button onClick={() => setShowCreateModal(false)} style={{ width:30, height:30, borderRadius:'50%', background:'var(--surface2)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:13 }}>
                <i className="fas fa-times"/>
              </button>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName||'U')}&background=1a73e8&color=fff`}
                style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} alt=""
                onError={e => e.target.src='https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff'}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#1a73e8', marginBottom:6 }}>
                  {userData?.username ? '@'+userData.username : user?.displayName||'You'}
                </p>
                <MentionInput value={postText} onChange={setPostText}
                  placeholder={"What's on your mind?\nUse @ to mention, # for hashtags"}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:12, padding:'8px 0' }}>
              <span style={{ fontSize:12, color:'#9334e6', fontWeight:600 }}>@mention</span>
              <span style={{ fontSize:12, color:'#1a73e8', fontWeight:600 }}>#hashtag</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, paddingTop:10, borderTop:'1px solid var(--border)' }}>
              <span style={{ fontSize:12, color: postText.length>450 ? '#e53935' : 'var(--muted)' }}>{500-postText.length} chars left</span>
              <button onClick={submitPost} disabled={!postText.trim()||posting} style={{
                padding:'9px 24px', background:postText.trim() ? '#1a73e8' : 'var(--border)',
                color:postText.trim() ? '#fff' : 'var(--muted)',
                borderRadius:99, fontSize:14, fontWeight:700, border:'none',
                cursor:postText.trim() ? 'pointer' : 'not-allowed'
              }}>
                {posting ? <i className="fas fa-spinner fa-spin"/> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <CommentsPage postId={openCommentPost} onClose={() => setOpenCommentPost(null)}
        onOpenProfile={uid => { setOpenCommentPost(null); setOpenProfileUid(uid) }}/>
      {openProfileUid && (
        <ProfilePage uid={openProfileUid} onClose={() => setOpenProfileUid(null)}
          onOpenComments={setOpenCommentPost} onOpenProfile={setOpenProfileUid}
          onAuthRequired={() => setShowAuth(true)}/>
      )}
      <NotificationsPage open={showNotifs} onClose={() => setShowNotifs(false)}
        onOpenProfile={uid => { setShowNotifs(false); setOpenProfileUid(uid) }}
        onOpenPost={pid => { setShowNotifs(false); setOpenCommentPost(pid) }}/>
      <BottomNav/>
    </>
  )
}
