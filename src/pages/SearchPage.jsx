import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, orderBy, limit, getDocs, startAt, endAt } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { timeAgo } from '../utils'
import PostCard from '../components/PostCard'
import CommentsPage from '../components/CommentsPage'
import ProfilePage from '../components/ProfilePage'
import AuthModal from '../components/AuthModal'
import BottomNav from '../components/BottomNav'

const TRENDING_TAGS = ['IndiaNews','Cricket','Budget2025','Technology','StartupIndia','Bollywood','Politics','ISRO','Sports','Education']

export default function SearchPage() {
  const navigate = useNavigate()

  const [q, setQ]                       = useState('')
  const [mode, setMode]                 = useState('all')   // 'all' | 'people' | 'posts' | 'hashtags'
  const [results, setResults]           = useState(null)    // { users, posts, hashtags }
  const [loading, setLoading]           = useState(false)
  const [openCommentPost, setOpenCommentPost] = useState(null)
  const [openProfileUid, setOpenProfileUid]   = useState(null)
  const [showAuth, setShowAuth]         = useState(false)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)

  const search = useCallback(async (val) => {
    const v = val.trim()
    if (!v) { setResults(null); return }
    setLoading(true)

    try {
      if (v.startsWith('#')) {
        // Hashtag search — navigate directly or show posts
        const tag = v.slice(1).toLowerCase()
        const snap = await getDocs(query(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
          where('hashtags', 'array-contains', tag),
          orderBy('timestamp', 'desc'),
          limit(20)
        ))
        const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setResults({ users: [], posts, hashtags: [tag], mode: 'hashtag', tag })
      } else if (v.startsWith('@')) {
        // Username search
        const uname = v.slice(1).toLowerCase()
        const snap = await getDocs(query(
          collection(db, 'users'),
          where('username', '>=', uname),
          where('username', '<=', uname + '~'),
          limit(10)
        ))
        setResults({ users: snap.docs.map(d => ({ id: d.id, ...d.data() })), posts: [], hashtags: [] })
      } else {
        // General search — people + posts in parallel
        const vLower = v.toLowerCase()
        const [uSnap, pSnap, hashSnap] = await Promise.all([
          // People by username or displayName
          getDocs(query(collection(db,'users'), where('username','>=',vLower), where('username','<=',vLower+'~'), limit(6))),
          // Posts by headline prefix
          getDocs(query(collection(db,'artifacts',APP_ID,'public','data','reposts'), where('headline','>=',v), where('headline','<=',v+'~'), orderBy('headline'), limit(10))),
          // Hashtag search (tags that start with query)
          getDocs(query(collection(db,'artifacts',APP_ID,'public','data','reposts'), where('hashtags','array-contains',vLower), orderBy('timestamp','desc'), limit(5)))
        ])

        const users     = uSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        const posts     = pSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        const tagPosts  = hashSnap.docs.map(d => ({ id: d.id, ...d.data() }))

        // Dedupe posts
        const seen = new Set(posts.map(p => p.id))
        const allPosts = [...posts, ...tagPosts.filter(p => !seen.has(p.id))]

        // Collect unique hashtags from tagPosts
        const tagSet = new Set()
        tagPosts.forEach(p => (p.hashtags || []).forEach(t => { if (t.startsWith(vLower)) tagSet.add(t) }))

        setResults({ users, posts: allPosts, hashtags: [...tagSet] })
      }
    } catch(e) {
      console.error(e)
      setResults({ users: [], posts: [], hashtags: [] })
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

  return (
    <>
      {/* Header */}
      <div style={{ position:'fixed', top:0, left:0, right:0, background:'var(--header-bg)',
        backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)', zIndex:100, padding:'8px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => navigate(-1)} className="page-back-btn" style={{ flexShrink:0 }}>
            <i className="fas fa-arrow-left"/>
          </button>
          <div style={{ flex:1, position:'relative' }}>
            <i className="fas fa-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', fontSize:13, pointerEvents:'none' }}/>
            <input
              ref={inputRef}
              autoFocus
              value={q}
              onChange={e => handleChange(e.target.value)}
              placeholder="Search Socialgati — people, posts, #hashtags"
              style={{ width:'100%', padding:'10px 36px 10px 36px', background:'var(--surface2)',
                border:'1.5px solid transparent', borderRadius:99, fontSize:14, outline:'none',
                color:'var(--ink)', transition:'border .2s', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor='var(--blue)'}
              onBlur={e => e.target.style.borderColor='transparent'}
            />
            {q && (
              <button onClick={clear}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--muted)', cursor:'pointer' }}>
                <i className="fas fa-times-circle"/>
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs when results exist */}
        {q.trim() && (
          <div style={{ display:'flex', gap:8, marginTop:8, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2 }}>
            {[['all','All'],['people','People'],['posts','Posts'],['hashtags','#Tags']].map(([k,l]) => (
              <button key={k} onClick={() => setMode(k)}
                style={{ padding:'4px 14px', borderRadius:99, border:'none', fontSize:12, fontWeight:700,
                  background: mode===k ? 'var(--blue)' : 'var(--surface2)',
                  color: mode===k ? '#fff' : 'var(--muted)', cursor:'pointer', flexShrink:0 }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ paddingTop: q.trim() ? 106 : 72, paddingBottom:72, maxWidth:600, margin:'0 auto' }}>

        {/* Empty state — trending */}
        {!q.trim() && (
          <div style={{ padding:'20px 16px' }}>
            <h2 style={{ fontSize:16, fontWeight:800, color:'var(--ink)', marginBottom:16 }}>
              🔥 Trending on Socialgati
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:0, background:'var(--surface)', borderRadius:14, overflow:'hidden', border:'1px solid var(--border)' }}>
              {TRENDING_TAGS.map((tag, i) => (
                <div key={tag}
                  onClick={() => navigate(`/hashtag/${tag.toLowerCase()}`)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'14px 16px', borderBottom: i < TRENDING_TAGS.length-1 ? '1px solid var(--border2)' : 'none',
                    cursor:'pointer', transition:'background .15s' }}
                  onMouseOver={e => e.currentTarget.style.background='var(--surface2)'}
                  onMouseOut={e => e.currentTarget.style.background='transparent'}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:2 }}>Trending</div>
                    <div style={{ fontSize:15, fontWeight:800, color:'var(--blue)' }}>#{tag}</div>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color:'var(--muted)', fontSize:12 }}/>
                </div>
              ))}
            </div>

            <p style={{ fontSize:12, color:'var(--muted)', textAlign:'center', marginTop:20 }}>
              Tip: Type @ to search people, # for hashtags
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding:40, textAlign:'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize:24, color:'var(--muted)' }}/>
          </div>
        )}

        {/* No results */}
        {!loading && results && !hasResults && (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <i className="fas fa-search" style={{ fontSize:40, color:'var(--muted)', opacity:.3, display:'block', marginBottom:16 }}/>
            <p style={{ fontSize:16, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>No results for "{q}"</p>
            <p style={{ fontSize:13, color:'var(--muted)' }}>Try a different search or browse trending topics</p>
          </div>
        )}

        {/* Results */}
        {!loading && results && hasResults && (
          <div style={{ padding:'8px 12px' }}>

            {/* Hashtag result — navigate directly */}
            {results.mode === 'hashtag' && (
              <div onClick={() => navigate(`/hashtag/${results.tag}`)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                  background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)',
                  marginBottom:12, cursor:'pointer' }}>
                <div style={{ width:46, height:46, borderRadius:12, background:'var(--blue)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:22, fontWeight:900, color:'#fff' }}>#</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:'var(--blue)' }}>#{results.tag}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{results.posts.length} posts</div>
                </div>
                <i className="fas fa-arrow-right" style={{ color:'var(--muted)' }}/>
              </div>
            )}

            {/* Hashtag pills */}
            {(mode === 'all' || mode === 'hashtags') && results.hashtags?.length > 0 && results.mode !== 'hashtag' && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>
                  Hashtags
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {results.hashtags.map(tag => (
                    <div key={tag} onClick={() => navigate(`/hashtag/${tag}`)}
                      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px',
                        background:'var(--blue)', color:'#fff', borderRadius:99,
                        fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      #{tag}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* People */}
            {(mode === 'all' || mode === 'people') && results.users?.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>
                  People
                </div>
                <div style={{ background:'var(--surface)', borderRadius:14, overflow:'hidden', border:'1px solid var(--border)' }}>
                  {results.users.map((u, i) => (
                    <div key={u.id}
                      onClick={() => setOpenProfileUid(u.id)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                        borderBottom: i < results.users.length-1 ? '1px solid var(--border2)' : 'none',
                        cursor:'pointer', transition:'background .15s' }}
                      onMouseOver={e => e.currentTarget.style.background='var(--surface2)'}
                      onMouseOut={e => e.currentTarget.style.background='transparent'}>
                      <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName||'U')}&background=9334e6&color=fff`}
                        style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} alt=""
                        onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{u.displayName || 'User'}</div>
                        <div style={{ fontSize:12, color:'var(--muted)' }}>@{u.username}</div>
                        {u.bio && <div style={{ fontSize:12, color:'var(--muted2)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.bio}</div>}
                      </div>
                      <i className="fas fa-chevron-right" style={{ color:'var(--muted)', fontSize:12 }}/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {(mode === 'all' || mode === 'posts') && results.posts?.length > 0 && (
              <div>
                {mode === 'all' && (
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>
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
                    onMention={async (username) => {
                      const { getDocs: gd, query: q2, collection: col, where: w2, limit: l2 } = await import('firebase/firestore')
                      const snap = await gd(query(col(db,'users'), w2('username','==',username.toLowerCase()), l2(1)))
                      if (!snap.empty) setOpenProfileUid(snap.docs[0].id)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CommentsPage postId={openCommentPost} onClose={() => setOpenCommentPost(null)}
        onOpenProfile={uid => { setOpenCommentPost(null); setOpenProfileUid(uid) }}/>
      {openProfileUid && (
        <ProfilePage uid={openProfileUid} onClose={() => setOpenProfileUid(null)}
          onOpenComments={setOpenCommentPost} onOpenProfile={setOpenProfileUid}
          onAuthRequired={() => setShowAuth(true)}/>
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <BottomNav/>
    </>
  )
}
