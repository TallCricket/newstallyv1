import { useEffect, useState, useCallback, useRef } from 'react'
import {
  collection, getDocs, query, limit, orderBy, startAfter,
  addDoc, updateDoc, arrayUnion, increment as fbIncrement,
  serverTimestamp, where, getDoc, doc
} from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo, catIcon } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useNavigate } from 'react-router-dom'

const CATS = ['All','National','World','Business','Technology','Health','Education','Sports','General']
const PAGE_SIZE = 20

const CAT_COLORS = {
  National:'#e53935', World:'#1a73e8', Business:'#34a853',
  Technology:'#9334e6', Health:'#f4a261', Education:'#0077b6',
  Sports:'#ff6d00', General:'#546e7a', Entertainment:'#ad1457'
}

// ===== DETECT BEST DATE FIELD =====
function getItemDate(n) {
  const raw = n.pubDate || n.fetchedAt || n.savedAt || n.date || ''
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return isNaN(t) ? 0 : t
}

function sortByDate(items) {
  return [...items].sort((a, b) => getItemDate(b) - getItemDate(a))
}

// ===== SKELETONS =====
function HeroSkeleton() {
  return (
    <div style={{ margin:'16px', borderRadius:16, overflow:'hidden', background:'#fff', border:'1px solid #e0e0e0' }}>
      <div className="skeleton" style={{ height:220 }}/>
      <div style={{ padding:16 }}>
        <div className="skeleton" style={{ height:10, width:'30%', marginBottom:10, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:20, width:'90%', marginBottom:8, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:20, width:'70%', borderRadius:4 }}/>
      </div>
    </div>
  )
}
function SmallSkeleton() {
  return (
    <div style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid #f1f3f4' }}>
      <div style={{ flex:1 }}>
        <div className="skeleton" style={{ height:10, width:'35%', marginBottom:8, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:14, width:'100%', marginBottom:6, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:14, width:'80%', borderRadius:4 }}/>
      </div>
      <div className="skeleton" style={{ width:80, height:60, borderRadius:8, flexShrink:0 }}/>
    </div>
  )
}

// ===== HERO CARD =====
function HeroCard({ item, onRepost }) {
  const navigate = useNavigate()
  const [imgErr, setImgErr] = useState(false)
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  return (
    <div style={{ margin:'12px 16px', borderRadius:16, overflow:'hidden', background:'#fff',
      boxShadow:'0 2px 12px rgba(0,0,0,.1)', cursor:'pointer' }}
      onClick={() => navigate(`/news/${item.id}`)}>
      {item.image && !imgErr ? (
        <div style={{ position:'relative', height:220, overflow:'hidden', background:'#f1f3f4' }}>
          <img src={item.image} alt={item.title} loading="eager"
            style={{ width:'100%', height:'100%', objectFit:'cover' }}
            onError={() => setImgErr(true)}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.75) 0%,rgba(0,0,0,.1) 60%,transparent 100%)' }}/>
          <div style={{ position:'absolute', top:12, left:12 }}>
            <span style={{ background:accent, color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, textTransform:'uppercase', letterSpacing:'.05em' }}>
              {item.category}
            </span>
          </div>
          <div style={{ position:'absolute', bottom:12, left:14, right:14 }}>
            <p style={{ color:'rgba(255,255,255,.7)', fontSize:11, fontWeight:600, marginBottom:4 }}>{item.source} · {timeAgo(item.date || item.pubDate)}</p>
            <h2 style={{ color:'#fff', fontSize:18, fontWeight:700, lineHeight:1.4,
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {item.title}
            </h2>
          </div>
        </div>
      ) : (
        <div style={{ background:`linear-gradient(135deg,${accent}22,${accent}44)`, padding:'28px 20px' }}>
          <span style={{ background:accent, color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, textTransform:'uppercase', display:'inline-block', marginBottom:12 }}>
            {item.category}
          </span>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#202124', lineHeight:1.4, marginBottom:8 }}>{item.title}</h2>
          <p style={{ fontSize:12, color:'#9aa0a6' }}>{item.source} · {timeAgo(item.date || item.pubDate)}</p>
        </div>
      )}
      <div style={{ padding:'14px 16px' }}>
        {item.description && (
          <p style={{ fontSize:14, color:'#5f6368', lineHeight:1.6, marginBottom:12,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {item.description}
          </p>
        )}
        <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
          <a href={item.url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 0',
              background:'#1a73e8', color:'#fff', borderRadius:8, fontSize:13, fontWeight:700, textDecoration:'none' }}>
            <i className="fas fa-external-link-alt" style={{ fontSize:11 }}/> Read Full Story
          </a>
          <button onClick={e => { e.stopPropagation(); onRepost(item) }}
            style={{ padding:'9px 14px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, fontWeight:600, color:'#5f6368', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <i className="fas fa-retweet" style={{ color:'#34a853' }}/>
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== COMPACT CARD =====
function CompactCard({ item }) {
  const navigate = useNavigate()
  const [imgErr, setImgErr] = useState(false)
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  return (
    <div style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid #f1f3f4', cursor:'pointer' }}
      onClick={() => navigate(`/news/${item.id}`)}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:accent, flexShrink:0 }}/>
          <span style={{ fontSize:10, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:'.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {item.category}
          </span>
          <span style={{ fontSize:10, color:'#9aa0a6', marginLeft:'auto', flexShrink:0 }}>{timeAgo(item.date || item.pubDate)}</span>
        </div>
        <p style={{ fontSize:14, fontWeight:600, color:'#202124', lineHeight:1.45,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:4 }}>
          {item.title}
        </p>
        <p style={{ fontSize:11, color:'#9aa0a6', fontWeight:500 }}>{item.source}</p>
      </div>
      {item.image && !imgErr && (
        <img src={item.image} alt="" loading="lazy" onError={() => setImgErr(true)}
          style={{ width:80, height:60, borderRadius:8, objectFit:'cover', flexShrink:0, background:'#f1f3f4' }}/>
      )}
    </div>
  )
}

// ===== GRID CARD =====
function GridCard({ item }) {
  const navigate = useNavigate()
  const [imgErr, setImgErr] = useState(false)
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  return (
    <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:'1px solid #f0f0f0',
      boxShadow:'0 1px 4px rgba(0,0,0,.06)', cursor:'pointer' }}
      onClick={() => navigate(`/news/${item.id}`)}>
      {item.image && !imgErr ? (
        <div style={{ height:110, overflow:'hidden', background:'#f1f3f4', position:'relative' }}>
          <img src={item.image} alt="" loading="lazy" onError={() => setImgErr(true)}
            style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', top:6, left:6 }}>
            <span style={{ background:accent, color:'#fff', fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99, textTransform:'uppercase' }}>
              {item.category}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ height:60, background:`linear-gradient(135deg,${accent}22,${accent}33)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className={catIcon(item.category)} style={{ fontSize:20, color:accent, opacity:.5 }}/>
        </div>
      )}
      <div style={{ padding:'10px 10px 12px' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#202124', lineHeight:1.4, marginBottom:6,
          display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {item.title}
        </p>
        <div style={{ fontSize:10, color:'#9aa0a6', display:'flex', justifyContent:'space-between' }}>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{item.source}</span>
          <span>{timeAgo(item.date || item.pubDate)}</span>
        </div>
      </div>
    </div>
  )
}

// ===== CATEGORY SECTION =====
function CategorySection({ title, items, accent, onRepost, onSeeAll }) {
  const navigate = useNavigate()
  if (!items.length) return null
  const [main, ...rest] = items
  return (
    <div style={{ margin:'20px 0' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:4, height:22, background:accent, borderRadius:2 }}/>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#202124' }}>{title}</h2>
        </div>
        <button onClick={() => onSeeAll && onSeeAll(title)}
          style={{ fontSize:12, color:accent, fontWeight:700, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          See all <i className="fas fa-arrow-right" style={{ fontSize:10 }}/>
        </button>
      </div>
      {/* Main story */}
      <div style={{ margin:'0 16px', borderRadius:12, overflow:'hidden', background:'#fff',
        border:'1px solid #f0f0f0', boxShadow:'0 1px 4px rgba(0,0,0,.06)', cursor:'pointer', marginBottom:1 }}
        onClick={() => navigate(`/news/${main.id}`)}>
        {main.image && (
          <div style={{ height:160, overflow:'hidden', background:'#f1f3f4', position:'relative' }}>
            <img src={main.image} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={e => e.target.style.display='none'}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 60%)' }}/>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:12 }}>
              <p style={{ color:'#fff', fontSize:15, fontWeight:700, lineHeight:1.4,
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {main.title}
              </p>
              <p style={{ color:'rgba(255,255,255,.7)', fontSize:11, marginTop:4 }}>{main.source} · {timeAgo(main.date || main.pubDate)}</p>
            </div>
          </div>
        )}
        {!main.image && (
          <div style={{ padding:'14px 16px' }}>
            <p style={{ fontSize:15, fontWeight:700, color:'#202124', lineHeight:1.4 }}>{main.title}</p>
            <p style={{ fontSize:12, color:'#9aa0a6', marginTop:6 }}>{main.source} · {timeAgo(main.date || main.pubDate)}</p>
          </div>
        )}
      </div>
      {/* Sub stories */}
      <div style={{ margin:'0 16px', background:'#fff', border:'1px solid #f0f0f0', borderTop:'none',
        borderRadius:'0 0 12px 12px', padding:'0 14px' }}>
        {rest.slice(0,3).map((item, i) => (
          <div key={item.id} style={{ display:'flex', gap:10, padding:'10px 0',
            borderBottom: i < 2 ? '1px solid #f5f5f5' : 'none', cursor:'pointer' }}
            onClick={() => navigate(`/news/${item.id}`)}>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#202124', lineHeight:1.4,
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {item.title}
              </p>
              <p style={{ fontSize:11, color:'#9aa0a6', marginTop:3 }}>{item.source} · {timeAgo(item.date || item.pubDate)}</p>
            </div>
            {item.image && (
              <img src={item.image} alt="" loading="lazy" style={{ width:68, height:52, borderRadius:6, objectFit:'cover', flexShrink:0 }}
                onError={e => e.target.style.display='none'}/>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== LOAD MORE SPINNER =====
function LoadMoreSpinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'20px 0', gap:8, color:'#9aa0a6', fontSize:13 }}>
      <i className="fas fa-spinner fa-spin"/>
      <span>Loading more news...</span>
    </div>
  )
}

// ===== MAIN PAGE =====
export default function NewsTally() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // All fetched news (grows as user scrolls)
  const [allNews, setAllNews] = useState([])
  // What's displayed after filter/search
  const [filtered, setFiltered] = useState([])

  const [loading, setLoading] = useState(true)      // initial load
  const [loadingMore, setLoadingMore] = useState(false) // infinite scroll
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')

  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [repostItem, setRepostItem] = useState(null)
  const [reposting, setReposting] = useState(false)

  // Pagination cursor
  const lastDocRef = useRef(null)
  // Which field has ordering (detect once)
  const orderFieldRef = useRef(null)
  // Sentinel div ref for IntersectionObserver
  const sentinelRef = useRef(null)

  // ===== DETECT ORDER FIELD =====
  // Try pubDate, then fetchedAt, then savedAt — use whichever works
  const detectOrderField = useCallback(async () => {
    const fields = ['pubDate', 'fetchedAt', 'savedAt']
    for (const field of fields) {
      try {
        const snap = await getDocs(query(collection(db, 'news'), orderBy(field, 'desc'), limit(1)))
        if (!snap.empty) {
          orderFieldRef.current = field
          return field
        }
      } catch(e) { /* index missing, try next */ }
    }
    orderFieldRef.current = null
    return null
  }, [])

  // ===== FETCH BATCH =====
  const fetchBatch = useCallback(async (isFirst = false) => {
    const field = orderFieldRef.current

    let q
    if (field) {
      // Ordered query — true latest first
      q = isFirst
        ? query(collection(db, 'news'), orderBy(field, 'desc'), limit(PAGE_SIZE))
        : lastDocRef.current
          ? query(collection(db, 'news'), orderBy(field, 'desc'), startAfter(lastDocRef.current), limit(PAGE_SIZE))
          : null
    } else {
      // Fallback — no ordering (fetch all, sort in JS)
      q = isFirst
        ? query(collection(db, 'news'), limit(PAGE_SIZE))
        : lastDocRef.current
          ? query(collection(db, 'news'), startAfter(lastDocRef.current), limit(PAGE_SIZE))
          : null
    }

    if (!q) return []

    const snap = await getDocs(q)
    if (snap.empty) { setHasMore(false); return [] }

    if (snap.docs.length < PAGE_SIZE) setHasMore(false)
    lastDocRef.current = snap.docs[snap.docs.length - 1]

    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.title)
  }, [])

  // ===== INITIAL LOAD =====
  const loadInitial = useCallback(async () => {
    setLoading(true); setError(''); setHasMore(true)
    lastDocRef.current = null

    try {
      // Detect best sort field first
      await detectOrderField()
      const items = await fetchBatch(true)

      if (!items.length) { setError('No news yet. Run syncAllNews in Apps Script.'); return }

      // Sort in JS as safety net
      const sorted = sortByDate(items)
      setAllNews(sorted)
      setFiltered(sorted)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [detectOrderField, fetchBatch])

  // ===== LOAD MORE =====
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || cat !== 'All' || search.trim()) return
    setLoadingMore(true)
    try {
      const items = await fetchBatch(false)
      if (items.length) {
        setAllNews(prev => {
          const ids = new Set(prev.map(n => n.id))
          const newItems = items.filter(n => !ids.has(n.id))
          return sortByDate([...prev, ...newItems])
        })
      }
    } catch(e) { console.error('loadMore error:', e) }
    finally { setLoadingMore(false) }
  }, [loadingMore, hasMore, cat, search, fetchBatch])

  useEffect(() => { loadInitial() }, [loadInitial])

  // ===== FILTER =====
  useEffect(() => {
    let r = allNews
    if (cat !== 'All') r = r.filter(n => n.category === cat)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(n => n.title?.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q))
    }
    setFiltered(r)
  }, [cat, search, allNews])

  // ===== INFINITE SCROLL — IntersectionObserver =====
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1, rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  // ===== REPOST — Smart dedup: one doc per news item, increment repostCount =====
  const handleRepost = async (item) => {
    if (!user) return setShowAuth(true)
    setReposting(true)
    try {
      const uSnap = await getDoc(doc(db,'users',user.uid)).catch(()=>null)
      const uData = uSnap?.data() || {}
      const myInfo = {
        uid: user.uid,
        username: uData.username || user.displayName || 'User',
        avatar: user.photoURL || '',
        timestamp: new Date().toISOString()
      }

      // Check if this news was already reposted by THIS user
      const myRepost = await getDocs(query(
        collection(db,'artifacts',APP_ID,'public','data','reposts'),
        where('newsId','==',String(item.id||item.title)),
        where('repostedBy','array-contains',user.uid),
        limit(1)
      )).catch(()=>({empty:true}))
      if (!myRepost.empty) { showToast('You already reposted this!'); setRepostItem(null); return }

      // Check if this news was ALREADY reposted by anyone (canonical doc)
      const existing = await getDocs(query(
        collection(db,'artifacts',APP_ID,'public','data','reposts'),
        where('newsId','==',String(item.id||item.title)),
        where('type','==','repost'),
        limit(1)
      ))

      if (!existing.empty) {
        // News already on Socialgati — just increment count & add user
        const docRef = existing.docs[0].ref
        await updateDoc(docRef, {
          repostCount: fbIncrement(1),
          repostedBy: arrayUnion(user.uid),
          repostedUsers: arrayUnion(myInfo)
        })
        showToast('✅ You reposted this news!')
      } else {
        // First time this news is being reposted — create new doc
        await addDoc(collection(db,'artifacts',APP_ID,'public','data','reposts'), {
          userId: user.uid,
          username: myInfo.username,
          userAvatar: myInfo.avatar,
          image: item.image || '',
          headline: item.title,
          newsUrl: item.url || '',
          newsSource: item.source || '',
          newsCategory: item.category || '',
          newsId: String(item.id||item.title),
          likes: [], commentsCount: 0,
          repostCount: 1,
          repostedBy: [user.uid],
          repostedUsers: [myInfo],
          timestamp: serverTimestamp(),
          type: 'repost'
        })
        showToast('✅ Reposted to Socialgati!')
      }
      setRepostItem(null)
    } catch(e) { console.error(e); showToast('Repost failed') }
    finally { setReposting(false) }
  }

  const groupByCategory = (items) => {
    const map = {}
    items.forEach(n => { if (!map[n.category]) map[n.category] = []; map[n.category].push(n) })
    return map
  }

  const isFiltering = cat !== 'All' || search.trim()

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="Socialgati"/>
          <span className="logo-text">NewsTally</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setShowSearch(s => !s)}>
            <i className={showSearch ? 'fas fa-times' : 'fas fa-magnifying-glass'}/>
          </button>
          {user
            ? <img src={user.photoURL||`https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff`}
                style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', cursor:'pointer' }} alt=""/>
            : <button className="btn-signin" onClick={() => setShowAuth(true)}>Sign In</button>
          }
        </div>
      </header>

      <div className="main-wrapper" style={{ paddingBottom:80 }}>

        {/* SEARCH */}
        {showSearch && (
          <div style={{ padding:'10px 16px', background:'#fff', borderBottom:'1px solid #e0e0e0', position:'sticky', top:56, zIndex:50 }}>
            <div style={{ position:'relative' }}>
              <i className="fas fa-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9aa0a6', fontSize:14, pointerEvents:'none' }}/>
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search news, topics..."
                style={{ width:'100%', padding:'10px 36px', background:'#f1f3f4', border:'none', borderRadius:10, fontSize:14, outline:'none', color:'#202124' }}/>
              {search && (
                <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#9aa0a6', background:'none', border:'none', cursor:'pointer', padding:4 }}>
                  <i className="fas fa-times-circle"/>
                </button>
              )}
            </div>
          </div>
        )}

        {/* CATEGORY FILTER */}
        <div className="cat-bar" style={{ position:'sticky', top: showSearch ? 98 : 56, zIndex:49, background:'#fff', borderBottom:'1px solid #f0f0f0', paddingTop:10, paddingBottom:10 }}>
          {CATS.map(c => (
            <button key={c} className={`cat-btn ${cat===c?'active':''}`}
              onClick={() => { setCat(c); window.scrollTo({ top:0, behavior:'smooth' }) }}>
              {c}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div>
            <HeroSkeleton/>
            <div style={{ padding:'0 16px' }}>
              {Array.from({length:4}).map((_,i) => <SmallSkeleton key={i}/>)}
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <i className="fas fa-exclamation-circle" style={{ fontSize:36, color:'#ea4335', marginBottom:12, display:'block' }}/>
            <p style={{ fontWeight:600, marginBottom:8, color:'#202124' }}>Could not load news</p>
            <p style={{ fontSize:12, color:'#9aa0a6', marginBottom:16 }}>{error}</p>
            <button onClick={loadInitial} style={{ padding:'10px 24px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>↺ Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#9aa0a6' }}>
            <i className="fas fa-search" style={{ fontSize:40, marginBottom:12, display:'block', opacity:.4 }}/>
            <p style={{ fontWeight:600, marginBottom:6 }}>No results found</p>
            <p style={{ fontSize:13 }}>Try a different search or category</p>
          </div>
        ) : isFiltering ? (
          // FILTERED VIEW
          <div style={{ padding:'8px 16px' }}>
            <p style={{ fontSize:12, color:'#9aa0a6', padding:'8px 0', fontWeight:500 }}>
              {filtered.length} results{cat !== 'All' ? ` in ${cat}` : ''}{search ? ` for "${search}"` : ''}
            </p>
            {filtered.map(item => <CompactCard key={item.id} item={item}/>)}
          </div>
        ) : (
          // HOME VIEW — professional layout
          <div>
            {/* Hero */}
            {filtered[0] && <HeroCard item={filtered[0]} onRepost={handleRepost}/>}

            {/* Latest Updates strip */}
            {filtered.length > 1 && (
              <div style={{ margin:'4px 16px 16px', background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', overflow:'hidden' }}>
                <div style={{ background:'#1a73e8', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff1744', animation:'pulse 1s infinite' }}/>
                  <span style={{ color:'#fff', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em' }}>
                    Latest Updates
                  </span>
                </div>
                <div style={{ padding:'0 14px' }}>
                  {filtered.slice(1, 5).map(item => <CompactCard key={item.id} item={item}/>)}
                </div>
              </div>
            )}

            {/* 2-column grid */}
            {filtered.length > 5 && (
              <div style={{ padding:'0 16px', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <div style={{ width:4, height:22, background:'#9334e6', borderRadius:2 }}/>
                  <h2 style={{ fontSize:16, fontWeight:700, color:'#202124' }}>More Stories</h2>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {filtered.slice(5, 11).map(item => <GridCard key={item.id} item={item}/>)}
                </div>
              </div>
            )}

            {/* Category sections */}
            {(() => {
              const grouped = groupByCategory(filtered.slice(11))
              return Object.entries(grouped)
                .filter(([, items]) => items.length >= 2)
                .slice(0, 6)
                .map(([category, items]) => (
                  <CategorySection
                    key={category}
                    title={category}
                    items={items}
                    accent={CAT_COLORS[category] || '#1a73e8'}
                    onRepost={handleRepost}
                    onSeeAll={c => { setCat(c); window.scrollTo({ top:0, behavior:'smooth' }) }}
                  />
                ))
            })()}

            {/* Remaining compact */}
            {filtered.length > 40 && (
              <div style={{ margin:'8px 16px 0', background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'4px 14px' }}>
                <div style={{ padding:'10px 0 6px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:4, height:18, background:'#34a853', borderRadius:2 }}/>
                  <h2 style={{ fontSize:15, fontWeight:700, color:'#202124' }}>More News</h2>
                </div>
                {filtered.slice(40).map(item => <CompactCard key={item.id} item={item}/>)}
              </div>
            )}

            {/* INFINITE SCROLL SENTINEL */}
            <div ref={sentinelRef} style={{ height:1 }}/>
            {loadingMore && <LoadMoreSpinner/>}
            {!hasMore && allNews.length > PAGE_SIZE && (
              <p style={{ textAlign:'center', color:'#9aa0a6', fontSize:13, padding:'20px 0' }}>
                You've read all {allNews.length} articles ✓
              </p>
            )}
          </div>
        )}
      </div>

      {/* REPOST MODAL */}
      {repostItem && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setRepostItem(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Share to Socialgati?</span>
              <button className="icon-btn" onClick={() => setRepostItem(null)}><i className="fas fa-times"/></button>
            </div>
            <div style={{ display:'flex', gap:12, marginBottom:20, background:'#f8f9fa', padding:12, borderRadius:10 }}>
              {repostItem.image && <img src={repostItem.image} style={{ width:64, height:64, borderRadius:8, objectFit:'cover', flexShrink:0 }} alt=""/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, color:CAT_COLORS[repostItem.category]||'#1a73e8', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{repostItem.category}</div>
                <div style={{ fontSize:14, fontWeight:600, color:'#202124', lineHeight:1.4,
                  display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{repostItem.title}</div>
                <div style={{ fontSize:11, color:'#9aa0a6', marginTop:4 }}>{repostItem.source}</div>
              </div>
            </div>
            <button onClick={() => handleRepost(repostItem)} disabled={reposting}
              style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {reposting ? <><i className="fas fa-spinner fa-spin"/> Posting...</> : <><i className="fas fa-retweet"/> Repost to Community</>}
            </button>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <BottomNav/>
    </>
  )
}
