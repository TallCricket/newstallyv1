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

// \u2500\u2500 Skeleton \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function PostSkeleton() {
  return (
    <div style={{ background:'var(--surface)', borderRadius:12, padding:16, marginBottom:8, border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', gap:10 }}>
        <div className="skeleton" style={{ width:40, height:40, borderRadius:'50%', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div className="skeleton" style={{ height:11, width:'40%', marginBottom:7, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:9,  width:'25%', marginBottom:12, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:14, width:'92%', marginBottom:6, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:14, width:'70%', borderRadius:4 }}/>
        </div>
      </div>
    </div>
  )
}

// \u2500\u2500 MentionInput \u2014 textarea with @ autocomplete \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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
        const snap = await getDocs(query(
          collection(db, 'users'),
          where('username', '>=', q),
          where('username', '<=', q + '~'),
          limit(6)
        ))
        setSuggestions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(atIdx + username.length + 2, atIdx + username.length + 2)
    }, 0)
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => { onChange(e.target.value); detectMention(e.target.value, e.target.selectionStart) }}
        placeholder={placeholder}
        autoFocus
        maxLength={500}
        style={{
          width: '100%', minHeight: 100, padding: '8px 0',
          background: 'transparent', border: 'none',
          borderBottom: '1.5px solid var(--border)',
          fontSize: 15, resize: 'none', outline: 'none',
          fontFamily: 'inherit', lineHeight: 1.6,
          color: 'var(--ink)', boxSizing: 'border-box'
        }}
      />
      {suggestions.length > 0 && mentionQuery !== null && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow-md)',
          zIndex: 300, maxHeight: 220, overflowY: 'auto', marginBottom: 4
        }}>
          {suggestions.map(u => (
            <div key={u.id}
              onMouseDown={e => { e.preventDefault(); insertMention(u.username) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border2)' }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <img
                src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'U')}&background=9334e6&color=fff`}
                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                alt="" onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{u.displayName || u.username}</p>
                <p style={{ fontSize: 12, color: '#9334e6', margin: 0 }}>@{u.username}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// MAIN PAGE
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
export default function Socialgati() {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // \u2500\u2500 Deep-link: /?post=ID opens that post directly \u2500\u2500
  useEffect(() => {
    const postId = searchParams.get('post')
    if (postId) setOpenCommentPost(postId)
  }, [searchParams])

  const [posts, setPosts]                     = useState([])
  const [loading, setLoading]                 = useState(true)
  const [feedType, setFeedType]               = useState('all')
  const [showAuth, setShowAuth]               = useState(false)
  const [openCommentPost, setOpenCommentPost] = useState(null)
  const [openProfileUid, setOpenProfileUid]   = useState(null)
  const [showNotifs, setShowNotifs]           = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [postText, setPostText]               = useState('')
  const [posting, setPosting]                 = useState(false)
  const [searchVal, setSearchVal]             = useState('')
  const [showSearch, setShowSearch]           = useState(false)
  const [searchResults, setSearchResults]     = useState(null)

  const unsubRef = useRef(null)

  const av = user?.photoURL
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName || 'U')}&background=1a73e8&color=fff`

  // \u2500\u2500 Real-time feed \u2500\u2500
  const loadFeed = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    setLoading(true)
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
      orderBy('timestamp', 'desc'),
      limit(30)
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

  // \u2500\u2500 Submit post \u2500\u2500
  const submitPost = async () => {
    if (!user) return setShowAuth(true)
    const t = postText.trim()
    if (!t) return showToast('Write something first!')
    if (t.length > 500) return showToast('Max 500 characters')
    setPosting(true)
    try {
      const hashtags = [...new Set((t.match(/#(\w+)/g) || []).map(h => h.slice(1).toLowerCase()))]
      const mentions = (t.match(/@(\w+)/g) || []).map(m => m.slice(1).toLowerCase())
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'), {
        userId: user.uid,
        username: userData?.username || user.displayName || 'User',
        userAvatar: user.photoURL || '',
        headline: t,
        hashtags,
        mentions,
        likes: [],
        commentsCount: 0,
        timestamp: serverTimestamp(),
        type: 'text'
      })
      setPostText('')
      setShowCreateModal(false)
      showToast('Posted! \u2705')
    } catch { showToast('Failed. Try again.') }
    finally { setPosting(false) }
  }

  // \u2500\u2500 Quick search (inline dropdown) \u2500\u2500
  const handleSearch = async val => {
    setSearchVal(val)
    if (!val.trim()) { setSearchResults(null); return }
    try {
      const v = val.toLowerCase()
      const uSnap = await getDocs(query(
        collection(db, 'users'),
        where('username', '>=', v),
        where('username', '<=', v + '~'),
        limit(5)
      ))
      setSearchResults({ users: uSnap.docs.map(d => ({ id: d.id, ...d.data() })) })
    } catch { setSearchResults(null) }
  }

  // \u2500\u2500 Open profile by @username \u2500\u2500
  const handleMentionClick = async (username) => {
    try {
      const snap = await getDocs(query(
        collection(db, 'users'),
        where('username', '==', username.toLowerCase()),
        limit(1)
      ))
      if (!snap.empty) setOpenProfileUid(snap.docs[0].id)
      else showToast(`@${username} not found`)
    } catch { showToast('Could not open profile') }
  }

  const TABS = [['all', 'For You'], ['trending', '\u1f525 Trending'], ['following', 'Following']]

  return (
    <>
      {/* \u2500\u2500 Header \u2500\u2500 */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: 'var(--header-bg)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png"
            style={{ width: 32, height: 32, borderRadius: '50%' }} alt="Socialgati" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a73e8', lineHeight: 1.1, letterSpacing: '-.2px' }}>Socialgati</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 500, lineHeight: 1 }}>by NewsTally</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => user ? navigate('/alerts') : setShowAuth(true)}
            style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            <i className="fas fa-bell" />
          </button>
          {!user && (
            <button onClick={() => setShowAuth(true)}
              style={{ padding: '6px 16px', background: '#1a73e8', color: '#fff', borderRadius: 99, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Sign In
            </button>
          )}
        </div>
      </header>

      <div style={{ paddingTop: 56, paddingBottom: 72, background: 'var(--bg)', minHeight: '100dvh' }}>

        {/* \u2500\u2500 Feed Tabs \u2500\u2500 */}
        <div style={{
          display: 'flex', background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 56, zIndex: 40
        }}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setFeedType(k)}
              style={{
                flex: 1, padding: '12px 4px', fontSize: 13, fontWeight: 600,
                color: feedType === k ? '#1a73e8' : 'var(--muted)',
                borderBottom: feedType === k ? '2px solid #1a73e8' : '2px solid transparent',
                background: 'none', border: 'none',
                borderBottom: feedType === k ? '2px solid #1a73e8' : '2px solid transparent',
                cursor: 'pointer'
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* \u2500\u2500 Compose bar \u2500\u2500 */}
        <div style={{
          display: 'flex', gap: 10, padding: '12px 16px',
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          alignItems: 'center'
        }}>
          <img src={av} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            alt="" onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff`} />
          <button
            onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
            style={{
              flex: 1, textAlign: 'left', padding: '10px 16px',
              background: 'var(--surface2)', border: '1.5px solid var(--border)',
              borderRadius: 99, fontSize: 14, color: 'var(--muted)',
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
            What's on your mind?
          </button>
        </div>

        {/* \u2500\u2500 Feed \u2500\u2500 */}
        <div style={{ padding: '8px 12px' }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)
            : posts.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <i className="fas fa-bolt" style={{ fontSize: 28, color: '#1a73e8' }} />
                  </div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Nothing here yet</p>
                  <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>Be the first to post on Socialgati!</p>
                  <button onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
                    style={{ padding: '10px 28px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 99, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Create Post
                  </button>
                </div>
              )
              : posts.map(p => (
                <PostCard
                  key={p.id} post={p} id={p.id}
                  onOpenComments={setOpenCommentPost}
                  onOpenProfile={setOpenProfileUid}
                  onAuthRequired={() => setShowAuth(true)}
                  onMention={handleMentionClick}
                  onHashtag={tag => navigate(`/hashtag/${tag.toLowerCase()}`)}
                />
              ))
          }
        </div>
      </div>

      {/* \u2500\u2500 Floating + button \u2500\u2500 */}
      <button
        onClick={() => user ? setShowCreateModal(true) : setShowAuth(true)}
        style={{
          position: 'fixed', bottom: 72, right: 16, width: 50, height: 50,
          borderRadius: '50%', background: '#1a73e8', color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 90,
          boxShadow: '0 3px 14px rgba(26,115,232,.45)'
        }}>
        <i className="fas fa-plus" />
      </button>

      {/* \u2500\u2500 Create Post Modal \u2500\u2500 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>New Post</span>
              <button onClick={() => setShowCreateModal(false)}
                style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <img src={av} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a73e8', marginBottom: 6 }}>
                  {userData?.username ? '@' + userData.username : user?.displayName || 'You'}
                </p>
                <MentionInput
                  value={postText}
                  onChange={setPostText}
                  placeholder={"What's on your mind?\nUse @ to mention, # for hashtags"}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
              <span style={{ fontSize: 12, color: '#9334e6', fontWeight: 600 }}>@mention</span>
              <span style={{ fontSize: 12, color: '#1a73e8', fontWeight: 600 }}>#hashtag</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: postText.length > 450 ? '#e53935' : 'var(--muted)' }}>
                {500 - postText.length} chars left
              </span>
              <button onClick={submitPost} disabled={!postText.trim() || posting}
                style={{
                  padding: '9px 24px',
                  background: postText.trim() ? '#1a73e8' : 'var(--border)',
                  color: postText.trim() ? '#fff' : 'var(--muted)',
                  borderRadius: 99, fontSize: 14, fontWeight: 700, border: 'none',
                  cursor: postText.trim() ? 'pointer' : 'not-allowed'
                }}>
                {posting ? <i className="fas fa-spinner fa-spin" /> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

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
