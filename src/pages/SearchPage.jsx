import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import PostCard from '../components/PostCard'
import CommentsPage from '../components/CommentsPage'
import ProfilePage from '../components/ProfilePage'
import AuthModal from '../components/AuthModal'
import BottomNav from '../components/BottomNav'

const TRENDING_TAGS = [
  'IndiaNews', 'Cricket', 'Budget2025', 'Technology',
  'StartupIndia', 'Bollywood', 'Politics', 'ISRO', 'Sports', 'Education'
]

function Skeleton() {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, marginBottom: 8, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 11, width: '40%', marginBottom: 7, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 6, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const navigate = useNavigate()

  const [q, setQ]                               = useState('')
  const [mode, setMode]                         = useState('all')
  const [results, setResults]                   = useState(null)
  const [loading, setLoading]                   = useState(false)
  const [openCommentPost, setOpenCommentPost]   = useState(null)
  const [openProfileUid, setOpenProfileUid]     = useState(null)
  const [showAuth, setShowAuth]                 = useState(false)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)

  // \u2500\u2500 Main search function \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const search = useCallback(async (val) => {
    const v = val.trim()
    if (!v) { setResults(null); setLoading(false); return }

    try {
      if (v.startsWith('#')) {
        // Hashtag search
        const tag = v.slice(1).toLowerCase()
        const snap = await getDocs(query(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
          where('hashtags', 'array-contains', tag),
          orderBy('timestamp', 'desc'),
          limit(20)
        )).catch(() => ({ docs: [] }))

        // Also fallback to headline text search
        const allSnap = snap.docs.length === 0
          ? await getDocs(query(
              collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
              orderBy('timestamp', 'desc'),
              limit(100)
            )).catch(() => ({ docs: [] }))
          : snap

        const tagStr = '#' + tag
        const posts = (snap.docs.length > 0 ? snap.docs : allSnap.docs)
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p =>
            (p.headline || '').toLowerCase().includes(tagStr) ||
            (p.hashtags || []).includes(tag)
          )

        setResults({ type: 'hashtag', tag, users: [], posts, hashtags: [tag] })
      } else if (v.startsWith('@')) {
        // Username search
        const uname = v.slice(1).toLowerCase()
        const snap = await getDocs(query(
          collection(db, 'users'),
          where('username', '>=', uname),
          where('username', '<=', uname + '~'),
          limit(10)
        )).catch(() => ({ docs: [] }))
        setResults({ type: 'users', users: snap.docs.map(d => ({ id: d.id, ...d.data() })), posts: [], hashtags: [] })
      } else {
        // General: search people by username prefix
        const vLower = v.toLowerCase()
        const [uSnap, uDisplaySnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('username', '>=', vLower), where('username', '<=', vLower + '~'), limit(5))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, 'users'), where('displayName', '>=', v), where('displayName', '<=', v + '~'), limit(5))).catch(() => ({ docs: [] }))
        ])

        // Dedupe users
        const userMap = new Map()
        ;[...uSnap.docs, ...uDisplaySnap.docs].forEach(d => userMap.set(d.id, { id: d.id, ...d.data() }))
        const users = [...userMap.values()].slice(0, 8)

        // Fetch recent posts and filter client-side (avoids composite index requirement)
        const pSnap = await getDocs(query(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
          orderBy('timestamp', 'desc'),
          limit(100)
        )).catch(() => ({ docs: [] }))

        const posts = pSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => (p.headline || '').toLowerCase().includes(vLower))
          .slice(0, 15)

        // Collect matching hashtags
        const tagSet = new Set()
        pSnap.docs.forEach(d => {
          const data = d.data()
          ;(data.hashtags || []).forEach(t => { if (t.startsWith(vLower)) tagSet.add(t) })
        })

        setResults({ type: 'general', users, posts, hashtags: [...tagSet].slice(0, 6) })
      }
    } catch (e) {
      console.error('Search error:', e)
      setResults({ type: 'general', users: [], posts: [], hashtags: [] })
    }
    setLoading(false)
  }, [])

  const handleChange = (val) => {
    setQ(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults(null); setLoading(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(() => search(val), 350)
  }

  const clear = () => { setQ(''); setResults(null); setLoading(false); inputRef.current?.focus() }

  const hasResults = results && (results.users?.length || results.posts?.length || results.hashtags?.length)

  const handleMentionClick = async (username) => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('username', '==', username.toLowerCase()), limit(1)))
      if (!snap.empty) setOpenProfileUid(snap.docs[0].id)
    } catch { /* silent */ }
  }

  const topOffset = q.trim() ? 106 : 72

  return (
    <>
      {/* \u2500\u2500 Header \u2500\u2500 */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: 'var(--header-bg)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', zIndex: 100,
        padding: '8px 12px 6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate(-1)} className="page-back-btn" style={{ flexShrink: 0 }}>
            <i className="fas fa-arrow-left" />
          </button>
          <div style={{ flex: 1, position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 13, pointerEvents: 'none' }} />
            <input
              ref={inputRef}
              autoFocus
              value={q}
              onChange={e => handleChange(e.target.value)}
              placeholder="Search people, posts, #hashtags, @users"
              style={{
                width: '100%', padding: '10px 36px',
                background: 'var(--surface2)',
                border: '1.5px solid transparent',
                borderRadius: 99, fontSize: 14, outline: 'none',
                color: 'var(--ink)', transition: 'border .2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#1a73e8'}
              onBlur={e => e.target.style.borderColor = 'transparent'}
            />
            {q && (
              <button onClick={clear}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>
                <i className="fas fa-times-circle" />
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs {"\u2014"} only when query active */}
        {q.trim() && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {[['all', 'All'], ['people', 'People'], ['posts', 'Posts'], ['hashtags', '#Tags']].map(([k, l]) => (
              <button key={k} onClick={() => setMode(k)}
                style={{
                  padding: '4px 14px', borderRadius: 99, border: 'none', fontSize: 12, fontWeight: 700,
                  background: mode === k ? '#1a73e8' : 'var(--surface2)',
                  color: mode === k ? '#fff' : 'var(--muted)', cursor: 'pointer', flexShrink: 0
                }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* \u2500\u2500 Body \u2500\u2500 */}
      <div style={{ paddingTop: topOffset, paddingBottom: 72, maxWidth: 600, margin: '0 auto', background: 'var(--bg)', minHeight: '100dvh' }}>

        {/* Empty state {"\u2014"} trending tags */}
        {!q.trim() && (
          <div style={{ padding: '20px 16px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 16 }}>\u1f525 Trending on Socialgati</h2>
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {TRENDING_TAGS.map((tag, i) => (
                <div key={tag} onClick={() => navigate(`/hashtag/${tag.toLowerCase()}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < TRENDING_TAGS.length - 1 ? '1px solid var(--border2)' : 'none', cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Trending</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1a73e8' }}>#{tag}</div>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: 'var(--muted)', fontSize: 12 }} />
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 20 }}>
              Tip: Type @username to find people, #tag to find hashtags
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--muted)' }} />
          </div>
        )}

        {/* No results */}
        {!loading && results && !hasResults && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <i className="fas fa-search" style={{ fontSize: 40, color: 'var(--muted)', opacity: .3, display: 'block', marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>No results for "{q}"</p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Try @username or #hashtag for specific searches</p>
          </div>
        )}

        {/* Results */}
        {!loading && hasResults && (
          <div style={{ padding: '8px 12px' }}>

            {/* Hashtag direct link */}
            {(mode === 'all' || mode === 'hashtags') && results.hashtags?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10, padding: '0 4px' }}>
                  Hashtags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {results.hashtags.map(tag => (
                    <div key={tag} onClick={() => navigate(`/hashtag/${tag}`)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#1a73e8', color: '#fff', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      #{tag}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* People */}
            {(mode === 'all' || mode === 'people') && results.users?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10, padding: '0 4px' }}>
                  People
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {results.users.map((u, i) => (
                    <div key={u.id} onClick={() => setOpenProfileUid(u.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < results.users.length - 1 ? '1px solid var(--border2)' : 'none', cursor: 'pointer' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <img
                        src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'U')}&background=9334e6&color=fff`}
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        alt="" onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{u.displayName || 'User'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>@{u.username}</div>
                        {u.bio && <div style={{ fontSize: 12, color: 'var(--muted2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{u.bio}</div>}
                      </div>
                      <i className="fas fa-chevron-right" style={{ color: 'var(--muted)', fontSize: 12 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {(mode === 'all' || mode === 'posts') && results.posts?.length > 0 && (
              <div>
                {(mode === 'all' && results.users?.length > 0) && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10, padding: '0 4px' }}>
                    Posts
                  </div>
                )}
                {results.posts.map(p => (
                  <PostCard
                    key={p.id} post={p} id={p.id}
                    onOpenComments={setOpenCommentPost}
                    onOpenProfile={setOpenProfileUid}
                    onAuthRequired={() => setShowAuth(true)}
                    onHashtag={t => navigate(`/hashtag/${t}`)}
                    onMention={handleMentionClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CommentsPage postId={openCommentPost} onClose={() => setOpenCommentPost(null)}
        onOpenProfile={uid => { setOpenCommentPost(null); setOpenProfileUid(uid) }} />
      {openProfileUid && (
        <ProfilePage uid={openProfileUid} onClose={() => setOpenProfileUid(null)}
          onOpenComments={setOpenCommentPost} onOpenProfile={setOpenProfileUid}
          onAuthRequired={() => setShowAuth(true)} />
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <BottomNav />
    </>
  )
}
