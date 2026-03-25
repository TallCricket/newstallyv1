import { useState, useEffect, useRef, useCallback } from 'react'
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, getDocs } from 'firebase/firestore'
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
    <div style={{ background:'#fff', borderRadius:12, padding:16, marginBottom:8, border:'1px solid #f0f0f0' }}>
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

  const av = user?.photoURL
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName||'U')}&background=1a73e8&color=fff`

  // ── Feed ──
  const loadFeed = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    setLoading(true)
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
      orderBy('timestamp', 'desc'),
      limit(20)
    )
    unsubRef.current = onSnapshot(q, snap => {
      let p = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (feedType === 'trending') p.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
      setPosts(p)
      setLoading(false)
    }, err => { console.error(err); setLoading(false) })
  }, [feedType])

  useEffect(() => {
    loadFeed()
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [loadFeed])

  // ── Post ──
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
        headline: t, likes: [], commentsCount: 0,
        timestamp: serverTimestamp(), type: 'text'
      })
      setPostText(''); setShowCreateModal(false)
      showToast('Posted! ✅')
    } catch { showToast('Failed. Try again.') }
    finally { setPosting(false) }
  }

  // ── Search ──
  const handleSearch = async val => {
    setSearchVal(val)
    if (!val.trim()) { setSearchResults(null); return }
    try {
      const v = val.toLowerCase()
      const [uSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('username', '>=', v), where('username', '<=', v + '~'), limit(5))),
        getDocs(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'), where('headline', '>=', val), where('headline', '<=', val + '~'), limit(5)))
      ])
      setSearchResults({
        users: uSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        posts: pSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      })
    } catch { setSearchResults(null) }
  }

  const TABS = [['all', 'For You'], ['trending', '🔥 Trending'], ['following', 'Following']]

  return (
    <>
      {/* ── Header ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: '#fff', borderBottom: '1px solid #e8eaed',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', zIndex: 100,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png"
            style={{ width: 32, height: 32, borderRadius: '50%' }} alt="Socialgati" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a73e8', lineHeight: 1.1, letterSpacing: '-.2px' }}>Socialgati</div>
            <div style={{ fontSize: 9, color: '#9aa0a6', fontWeight: 500, lineHeight: 1 }}>by NewsTally</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setShowSearch(s => !s)}
            style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: showSearch ? '#e8f0fe' : 'transparent', color: showSearch ? '#1a73e8' : '#5f6368', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            <i className="fas fa-magnifying-glass" />
          </button>
          <button onClick={() => user ? setShowNotifs(true) : setShowAuth(true)}
            style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', color: '#5f6368', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            <i className="fas fa-bell" />
          </button>
          {user ? (
            <img src={av} onClick={() => navigate('/profile')}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '2px solid #e8f0fe' }}
              alt="" onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff`} />
          ) : (
            <button onClick={() => setShowAuth(true)}
              style={{ padding: '6px 16px', background: '#1a73e8', color: '#fff', borderRadius: 99, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Sign In
            </button>
          )}
        </div>
      </header>

      <div style={{ paddingTop: 56, paddingBottom: 72 }}>

        {/* ── Search ── */}
        {showSearch && (
          <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e8eaed', position: 'sticky', top: 56, zIndex: 50 }}>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9aa0a6', fontSize: 13, pointerEvents: 'none' }} />
              <input autoFocus value={searchVal} onChange={e => handleSearch(e.target.value)}
                placeholder="Search people, posts..."
                style={{ width: '100%', padding: '9px 36px', background: '#f1f3f4', border: '1.5px solid transparent', borderRadius: 99, fontSize: 14, outline: 'none', fontFamily: 'inherit', transition: 'border .2s' }}
                onFocus={e => e.target.style.borderColor = '#1a73e8'}
                onBlur={e => e.target.style.borderColor = 'transparent'} />
              {searchVal && (
                <button onClick={() => { setSearchVal(''); setSearchResults(null) }}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer' }}>
                  <i className="fas fa-times-circle" />
                </button>
              )}
            </div>
            {searchResults && (
              <div style={{ marginTop: 8, background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>
                {searchResults.users.map(u => (
                  <div key={u.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
                    onClick={() => { setOpenProfileUid(u.id); setShowSearch(false); setSearchVal(''); setSearchResults(null) }}>
                    <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'U')}&background=1a73e8&color=fff`}
                      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#202124', margin: 0 }}>{u.displayName}</p>
                      <p style={{ fontSize: 12, color: '#9aa0a6', margin: 0 }}>@{u.username}</p>
                    </div>
                  </div>
                ))}
                {!searchResults.users.length && !searchResults.posts.length && (
                  <p style={{ padding: '14px 16px', fontSize: 13, color: '#9aa0a6', textAlign: 'center', margin: 0 }}>
                    No results for "{searchVal}"
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Feed Tabs ── */}
        <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e8eaed', position: 'sticky', top: 56, zIndex: 40 }}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setFeedType(k)}
              style={{
                flex: 1, padding: '12px 4px', fontSize: 13, fontWeight: 600,
                color: feedType === k ? '#1a73e8' : '#9aa0a6',
                borderBottom: feedType === k ? '2px solid #1a73e8' : '2px solid transparent',
                background: 'none', border: 'none',
                borderBottom: feedType === k ? '2px solid #1a73e8' : '2px solid transparent',
                cursor: 'pointer', transition: 'all .18s'
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Compose Bar ── */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e8eaed', alignItems: 'center' }}>
          <img src={av} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt=""
            onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff`} />
          <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
            style={{ flex: 1, textAlign: 'left', padding: '10px 16px', background: '#f8f9fa', border: '1.5px solid #e8eaed', borderRadius: 99, fontSize: 14, color: '#9aa0a6', cursor: 'pointer', fontFamily: 'inherit', transition: 'border .2s' }}
            onMouseOver={e => e.target.style.borderColor = '#1a73e8'}
            onMouseOut={e => e.target.style.borderColor = '#e8eaed'}>
            What's on your mind?
          </button>
        </div>

        {/* ── Feed ── */}
        <div style={{ padding: '8px 12px' }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)
            : posts.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <i className="fas fa-bolt" style={{ fontSize: 28, color: '#1a73e8' }} />
                  </div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#202124', marginBottom: 8 }}>Nothing here yet</p>
                  <p style={{ fontSize: 14, color: '#9aa0a6', marginBottom: 20 }}>Be the first to post on Socialgati!</p>
                  <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
                    style={{ padding: '10px 28px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 99, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Create Post
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

      {/* ── Floating Post Button ── */}
      <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
        style={{
          position: 'fixed', bottom: 72, right: 16,
          width: 50, height: 50, borderRadius: '50%',
          background: '#1a73e8', color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: 18, boxShadow: '0 3px 14px rgba(26,115,232,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90
        }}>
        <i className="fas fa-plus" />
      </button>

      {/* ── Create Post Modal ── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#202124' }}>New Post</span>
              <button onClick={() => setShowCreateModal(false)}
                style={{ width: 30, height: 30, borderRadius: '50%', background: '#f1f3f4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#606060' }}>
                <i className="fas fa-times" style={{ fontSize: 13 }} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <img src={av} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a73e8', marginBottom: 6 }}>
                  {userData?.username ? '@' + userData.username : user?.displayName || 'You'}
                </p>
                <textarea value={postText} onChange={e => setPostText(e.target.value)}
                  placeholder="What's on your mind?"
                  style={{ width: '100%', minHeight: 100, padding: '8px 0', background: 'transparent', border: 'none', borderBottom: '1.5px solid #e8eaed', fontSize: 15, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, color: '#202124' }}
                  maxLength={500} autoFocus />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: 12, color: postText.length > 450 ? '#e53935' : '#9aa0a6' }}>
                {500 - postText.length} chars left
              </span>
              <button onClick={submitPost} disabled={!postText.trim() || posting}
                style={{
                  padding: '9px 24px', background: postText.trim() ? '#1a73e8' : '#c5d9f8',
                  color: '#fff', borderRadius: 99, fontSize: 14, fontWeight: 700, border: 'none',
                  cursor: postText.trim() ? 'pointer' : 'not-allowed', transition: 'all .18s'
                }}>
                {posting ? <i className="fas fa-spinner fa-spin" /> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Layers ── */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <CommentsPage postId={openCommentPost} onClose={() => setOpenCommentPost(null)}
        onOpenProfile={uid => { setOpenCommentPost(null); setOpenProfileUid(uid) }} />
      {openProfileUid && (
        <ProfilePage uid={openProfileUid} onClose={() => setOpenProfileUid(null)}
          onOpenComments={setOpenCommentPost} onOpenProfile={setOpenProfileUid}
          onAuthRequired={() => setShowAuth(true)} />
      )}
      <NotificationsPage open={showNotifs} onClose={() => setShowNotifs(false)}
        onOpenProfile={uid => { setShowNotifs(false); setOpenProfileUid(uid) }}
        onOpenPost={pid => { setShowNotifs(false); setOpenCommentPost(pid) }} />
      <BottomNav />
    </>
  )
}
