import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'
import CommentsPage from '../components/CommentsPage'
import ProfilePage from '../components/ProfilePage'
import AuthModal from '../components/AuthModal'
import BottomNav from '../components/BottomNav'

function Skeleton() {
  return (
    <div style={{ background:'var(--surface)', borderRadius:12, padding:16, marginBottom:8, border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', gap:10 }}>
        <div className="skeleton" style={{ width:40, height:40, borderRadius:'50%', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div className="skeleton" style={{ height:11, width:'40%', marginBottom:7, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:14, width:'90%', marginBottom:6, borderRadius:4 }}/>
          <div className="skeleton" style={{ height:14, width:'70%', borderRadius:4 }}/>
        </div>
      </div>
    </div>
  )
}

export default function HashtagPage() {
  const { tag } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [posts, setPosts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [openCommentPost, setOpenCommentPost] = useState(null)
  const [openProfileUid, setOpenProfileUid]   = useState(null)
  const [showAuth, setShowAuth]         = useState(false)
  const unsubRef = useRef(null)

  const tagLower = (tag || '').toLowerCase()

  useEffect(() => {
    if (!tagLower) return
    setLoading(true)
    if (unsubRef.current) unsubRef.current()

    // Primary: posts that have the hashtag in the `hashtags` array field
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
      where('hashtags', 'array-contains', tagLower),
      orderBy('timestamp', 'desc'),
      limit(50)
    )

    unsubRef.current = onSnapshot(q, snap => {
      let results = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Also include posts whose headline contains #tag (older posts without hashtags array)
      // We do this client-side since Firestore can't do text search
      // But we already have them from the query above if they were saved with hashtags field
      setPosts(results)
      setLoading(false)
    }, err => {
      // Fallback: if the composite index doesn't exist yet, fetch all and filter client-side
      const fallback = query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
        orderBy('timestamp', 'desc'),
        limit(200)
      )
      onSnapshot(fallback, snap => {
        const tag_ = '#' + tagLower
        const results = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p =>
            (p.headline || '').toLowerCase().includes(tag_) ||
            (p.hashtags || []).includes(tagLower)
          )
        setPosts(results)
        setLoading(false)
      })
    })

    return () => { if (unsubRef.current) unsubRef.current() }
  }, [tagLower])

  return (
    <>
      {/* Header */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:56, background:'var(--header-bg)',
        backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:12, padding:'0 16px', zIndex:100 }}>
        <button onClick={() => navigate(-1)} className="page-back-btn">
          <i className="fas fa-arrow-left"/>
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:'var(--blue)' }}>#{tag}</div>
          {!loading && (
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>
              {posts.length} post{posts.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        <button onClick={() => navigate('/')}
          style={{ fontSize:13, color:'var(--blue)', fontWeight:700, background:'var(--surface2)', border:'none', borderRadius:99, padding:'6px 14px', cursor:'pointer' }}>
          Feed
        </button>
      </div>

      <div style={{ paddingTop:56, paddingBottom:72, maxWidth:600, margin:'0 auto' }}>

        {/* Hashtag hero banner */}
        <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8,
            background:'var(--blue)', color:'#fff', borderRadius:12,
            padding:'10px 18px', marginBottom:12 }}>
            <span style={{ fontSize:24, fontWeight:900, lineHeight:1 }}>#</span>
            <span style={{ fontSize:20, fontWeight:800 }}>{tag}</span>
          </div>
          <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>
            All posts tagged with <strong style={{ color:'var(--blue)' }}>#{tag}</strong> on Socialgati
          </p>
        </div>

        {/* Posts */}
        <div style={{ padding:'8px 12px' }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i}/>)
            : posts.length === 0
              ? (
                <div style={{ textAlign:'center', padding:'64px 20px' }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>#</div>
                  <p style={{ fontSize:17, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>No posts yet for #{tag}</p>
                  <p style={{ fontSize:14, color:'var(--muted)', marginBottom:20 }}>Be the first to post with this hashtag!</p>
                  <button onClick={() => navigate('/')}
                    style={{ padding:'10px 28px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:99, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    Go to Feed
                  </button>
                </div>
              )
              : posts.map(p => (
                <PostCard
                  key={p.id} post={p} id={p.id}
                  onOpenComments={setOpenCommentPost}
                  onOpenProfile={setOpenProfileUid}
                  onAuthRequired={() => setShowAuth(true)}
                  onHashtag={t => navigate(`/hashtag/${t}`)}
                  onMention={async (username) => {
                    const { getDocs, query: q2, collection: col, where: w2, limit: l2 } = await import('firebase/firestore')
                    const snap = await getDocs(query(col(db,'users'), w2('username','==',username.toLowerCase()), l2(1)))
                    if (!snap.empty) setOpenProfileUid(snap.docs[0].id)
                  }}
                />
              ))
          }
        </div>
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
