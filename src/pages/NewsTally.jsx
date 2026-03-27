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

function getItemDate(n) {
  const raw = n.pubDate || n.fetchedAt || n.savedAt || n.date || ''
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return isNaN(t) ? 0 : t
}
function sortByDate(items) {
  return [...items].sort((a, b) => getItemDate(b) - getItemDate(a))
}

// ── Skeletons ──
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

// ── Hero Card ──
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
            style={{ padding:'9px 16px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, fontWeight:700, color:'#34a853', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <i className="fas fa-retweet"/> Repost
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Compact Card ──
function CompactCard({ item, onRepost }) {
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
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <p style={{ fontSize:11, color:'#9aa0a6', fontWeight:500 }}>{item.source}</p>
          {onRepost && (
            <button onClick={e => { e.stopPropagation(); onRepost(item) }}
              style={{ fontSize:11, color:'#34a853', background:'none', border:'none', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:4, padding:'2px 6px', borderRadius:6, marginLeft:8 }}>
              <i className="fas fa-retweet" style={{ fontSize:11 }}/> Repost
            </button>
          )}
        </div>
      </div>
      {item.image && !imgErr && (
        <img src={item.image} alt="" loading="lazy" onError={() => setImgErr(true)}
          style={{ width:80, height:60, borderRadius:8, objectFit:'cover', flexShrink:0, background:'#f1f3f4' }}/>
      )}
    </div>
  )
}

// ── Grid Card ──
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

// ── Category Section ──
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

function LoadMoreSpinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'20px 0', gap:8, color:'#9aa0a6', fontSize:13 }}>
      <i className="fas fa-spinner fa-spin"/>
      <span>Loading more news...</span>
    </div>
  )
}

function LoadMoreButton({ onClick, loading }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'16px 0 8px' }}>
      <button onClick={onClick} disabled={loading}
        style={{ padding:'10px 28px', background:'#fff', border:'1.5px solid #1a73e8', borderRadius:24,
          fontSize:14, fontWeight:700, color:'#1a73e8', cursor: loading ? 'not-allowed' : 'pointer',
          display:'flex', alignItems:'center', gap:8, opacity: loading ? 0.6 : 1 }}>
        {loading ? <><i className="fas fa-spinner fa-spin"/> Loading...</> : <><i className="fas fa-arrow-down"/> Load More</>}
      </button>
    </div>
  )
}

// ── Repost Modal ──
function RepostModal({ item, onClose, onConfirm, reposting }) {
  if (!item) return null
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Share to Socialgati?</span>
          <button className="icon-btn" onClick={onClose}><i className="fas fa-times"/></button>
        </div>
        <div style={{ display:'flex', gap:12, marginBottom:20, background:'#f8f9fa', padding:12, borderRadius:10 }}>
          {item.image && <img src={item.image} style={{ width:64, height:64, borderRadius:8, objectFit:'cover', flexShrink:0 }} alt=""/>}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:accent, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{item.category}</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#202124', lineHeight:1.4,
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</div>
            <div style={{ fontSize:11, color:'#9aa0a6', marginTop:4 }}>{item.source}</div>
          </div>
        </div>
        <button onClick={() => onConfirm(item)} disabled={reposting}
          style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none',
            borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {reposting ? <><i className="fas fa-spinner fa-spin"/> Posting...</> : <><i className="fas fa-retweet"/> Repost to Community</>}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function NewsTally() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // All-category data
  const [allNews, setAllNews]         = useState([])
  const lastDocRef                    = useRef(null)
  const orderFieldRef                 = useRef(null)
  const [hasMore, setHasMore]         = useState(true)

  // Category-specific data
  const [catItems, setCatItems]       = useState([])
  const catLastDocRef                 = useRef(null)
  const [catHasMore, setCatHasMore]   = useState(true)

  const [filtered, setFiltered]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState('')

  const [cat, setCat]                 = useState('All')
  const [search, setSearch]           = useState('')
  const [showSearch, setShowSearch]   = useState(false)
  const [showAuth, setShowAuth]       = useState(false)
  const [repostItem, setRepostItem]   = useState(null)
  const [reposting, setReposting]     = useState(false)

  const sentinelRef = useRef(null)

  // ── Detect order field ──
  const detectOrderField = useCallback(async () => {
    for (const field of ['pubDate', 'fetchedAt', 'savedAt']) {
      try {
        const snap = await getDocs(query(collection(db, 'news'), orderBy(field, 'desc'), limit(1)))
        if (!snap.empty) { orderFieldRef.current = field; return field }
      } catch(e) {}
    }
    orderFieldRef.current = null; return null
  }, [])

  // ── Fetch batch — All ──
  const fetchBatch = useCallback(async (isFirst = false) => {
    const field = orderFieldRef.current
    let q
    if (field) {
      q = isFirst
        ? query(collection(db, 'news'), orderBy(field, 'desc'), limit(PAGE_SIZE))
        : lastDocRef.current
          ? query(collection(db, 'news'), orderBy(field, 'desc'), startAfter(lastDocRef.current), limit(PAGE_SIZE))
          : null
    } else {
      q = isFirst
        ? query(collection(db, 'news'), limit(PAGE_SIZE))
        : lastDocRef.current ? query(collection(db, 'news'), startAfter(lastDocRef.current), limit(PAGE_SIZE)) : null
    }
    if (!q) return []
    const snap = await getDocs(q)
    if (snap.empty) { setHasMore(false); return [] }
    if (snap.docs.length < PAGE_SIZE) setHasMore(false)
    lastDocRef.current = snap.docs[snap.docs.length - 1]
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.title)
  }, [])

  // ── Fetch batch — Category (all platforms' data per category) ──
  const fetchCategoryBatch = useCallback(async (category, isFirst = false) => {
    let constraints = [where('category', '==', category)]
    if (orderFieldRef.current) {
      try { constraints.push(orderBy(orderFieldRef.current, 'desc')) } catch(e) {}
    }
    if (!isFirst && catLastDocRef.current) constraints.push(startAfter(catLastDocRef.current))
    constraints.push(limit(PAGE_SIZE))
    let snap
    try {
      snap = await getDocs(query(collection(db, 'news'), ...constraints))
    } catch(e) {
      const fb = [where('category', '==', category)]
      if (!isFirst && catLastDocRef.current) fb.push(startAfter(catLastDocRef.current))
      fb.push(limit(PAGE_SIZE))
      snap = await getDocs(query(collection(db, 'news'), ...fb))
    }
    if (snap.empty) { setCatHasMore(false); return [] }
    if (snap.docs.length < PAGE_SIZE) setCatHasMore(false)
    catLastDocRef.current = snap.docs[snap.docs.length - 1]
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.title)
  }, [])

  // ── Load initial ──
  const loadInitial = useCallback(async () => {
    setLoading(true); setError(''); setHasMore(true); lastDocRef.current = null
    try {
      await detectOrderField()
      const items = await fetchBatch(true)
      if (!items.length) { setError('No news yet.'); return }
      setAllNews(sortByDate(items))
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [detectOrderField, fetchBatch])

  // ── Load category ──
  const loadCategoryInitial = useCallback(async (category) => {
    setLoading(true); setError(''); setCatItems([]); setCatHasMore(true); catLastDocRef.current = null
    try {
      const items = await fetchCategoryBatch(category, true)
      setCatItems(sortByDate(items))
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [fetchCategoryBatch])

  // ── Load more — All ──
  const loadMoreAll = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const items = await fetchBatch(false)
      if (items.length) {
        setAllNews(prev => {
          const ids = new Set(prev.map(n => n.id))
          return sortByDate([...prev, ...items.filter(n => !ids.has(n.id))])
        })
      }
    } catch(e) { console.error(e) }
    finally { setLoadingMore(false) }
  }, [loadingMore, hasMore, fetchBatch])

  // ── Load more — Category ──
  const loadMoreCat = useCallback(async () => {
    if (loadingMore || !catHasMore || cat === 'All') return
    setLoadingMore(true)
    try {
      const items = await fetchCategoryBatch(cat, false)
      if (items.length) {
        setCatItems(prev => {
          const ids = new Set(prev.map(n => n.id))
          return sortByDate([...prev, ...items.filter(n => !ids.has(n.id))])
        })
      }
    } catch(e) { console.error(e) }
    finally { setLoadingMore(false) }
  }, [loadingMore, catHasMore, cat, fetchCategoryBatch])

  const loadMore = useCallback(() => {
    if (search.trim()) return
    return cat === 'All' ? loadMoreAll() : loadMoreCat()
  }, [cat, search, loadMoreAll, loadMoreCat])

  useEffect(() => { loadInitial() }, [loadInitial])

  useEffect(() => {
    // reset scroll position on cat change
    if (cat !== 'All') loadCategoryInitial(cat)
    window.scrollTo({ top:0, behavior:'smooth' })
  }, [cat]) // eslint-disable-line

  useEffect(() => {
    let base = cat !== 'All' ? catItems : allNews
    if (search.trim()) {
      const q = search.toLowerCase()
      base = base.filter(n => n.title?.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q))
    }
    setFiltered(base)
  }, [cat, search, allNews, catItems])

  // ── IntersectionObserver ──
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1, rootMargin: '300px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  // ── Smart Repost ──
  const handleRepost = async (item) => {
    if (!user) return setShowAuth(true)
    setReposting(true)
    try {
      const uSnap = await getDoc(doc(db, 'users', user.uid)).catch(() => null)
      const uData = uSnap?.data() || {}
      const myInfo = {
        uid: user.uid,
        username: uData.username || user.displayName || 'User',
        avatar: user.photoURL || '',
        timestamp: new Date().toISOString()
      }
      const myRepost = await getDocs(query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
        where('newsId', '==', String(item.id || item.title)),
        where('repostedBy', 'array-contains', user.uid),
        limit(1)
      )).catch(() => ({ empty: true }))
      if (!myRepost.empty) { showToast('You already reposted this!'); setRepostItem(null); return }

      const existing = await getDocs(query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
        where('newsId', '==', String(item.id || item.title)),
        where('type', '==', 'repost'),
        limit(1)
      ))
      if (!existing.empty) {
        await updateDoc(existing.docs[0].ref, {
          repostCount: fbIncrement(1),
          repostedBy: arrayUnion(user.uid),
          repostedUsers: arrayUnion(myInfo)
        })
        showToast('✅ You reposted this news!')
      } else {
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'), {
          userId: user.uid, username: myInfo.username, userAvatar: myInfo.avatar,
          image: item.image || '', headline: item.title,
          newsUrl: item.url || '', newsSource: item.source || '',
          newsCategory: item.category || '', newsId: String(item.id || item.title),
          likes: [], commentsCount: 0, repostCount: 1,
          repostedBy: [user.uid], repostedUsers: [myInfo],
          timestamp: serverTimestamp(), type: 'repost'
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

  const currentHasMore = cat === 'All' ? hasMore : catHasMore
  const isFiltering    = cat !== 'All' || !!search.trim()

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="NewsTally"/>
          <span className="logo-text">NewsTally</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setShowSearch(s => !s)}>
            <i className={showSearch ? 'fas fa-times' : 'fas fa-magnifying-glass'}/>
          </button>
          {user
            ? <img src={user.photoURL || `https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff`}
                style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', cursor:'pointer' }} alt=""
                onClick={() => navigate('/profile')}/>
            : <button className="btn-signin" onClick={() => setShowAuth(true)}>Sign In</button>
          }
        </div>
      </header>

      <div className="main-wrapper" style={{ paddingBottom:80 }}>
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

        <div className="cat-bar" style={{ position:'sticky', top: showSearch ? 98 : 56, zIndex:49, background:'#fff', borderBottom:'1px solid #f0f0f0', paddingTop:10, paddingBottom:10 }}>
          {CATS.map(c => (
            <button key={c} className={`cat-btn ${cat===c?'active':''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>

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
          <div style={{ padding:'8px 16px' }}>
            <p style={{ fontSize:12, color:'#9aa0a6', padding:'8px 0', fontWeight:500 }}>
              {filtered.length} results{cat !== 'All' ? ` in ${cat}` : ''}{search ? ` for "${search}"` : ''}
            </p>
            {filtered.map(item => <CompactCard key={item.id} item={item} onRepost={setRepostItem}/>)}
            <div ref={sentinelRef} style={{ height:1 }}/>
            {loadingMore && <LoadMoreSpinner/>}
            {!loadingMore && currentHasMore && !search.trim() && <LoadMoreButton onClick={loadMore} loading={loadingMore}/>}
            {!currentHasMore && filtered.length >= 20 && !loading && (
              <p style={{ textAlign:'center', color:'#9aa0a6', fontSize:13, padding:'20px 0' }}>
                All {filtered.length} {cat !== 'All' ? cat : ''} articles loaded ✓
              </p>
            )}
          </div>
        ) : (
          <div>
            {filtered[0] && <HeroCard item={filtered[0]} onRepost={setRepostItem}/>}
            {filtered.length > 1 && (
              <div style={{ margin:'4px 16px 16px', background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', overflow:'hidden' }}>
                <div style={{ background:'#1a73e8', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff1744', animation:'pulse 1s infinite' }}/>
                  <span style={{ color:'#fff', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em' }}>Latest Updates</span>
                </div>
                <div style={{ padding:'0 14px' }}>
                  {filtered.slice(1, 5).map(item => <CompactCard key={item.id} item={item} onRepost={setRepostItem}/>)}
                </div>
              </div>
            )}
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
            {(() => {
              const grouped = groupByCategory(filtered.slice(11))
              return Object.entries(grouped)
                .filter(([, items]) => items.length >= 2)
                .slice(0, 6)
                .map(([category, items]) => (
                  <CategorySection key={category} title={category} items={items}
                    accent={CAT_COLORS[category] || '#1a73e8'} onRepost={setRepostItem}
                    onSeeAll={c => setCat(c)}/>
                ))
            })()}
            {filtered.length > 40 && (
              <div style={{ margin:'8px 16px 0', background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'4px 14px' }}>
                <div style={{ padding:'10px 0 6px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:4, height:18, background:'#34a853', borderRadius:2 }}/>
                  <h2 style={{ fontSize:15, fontWeight:700, color:'#202124' }}>More News</h2>
                </div>
                {filtered.slice(40).map(item => <CompactCard key={item.id} item={item} onRepost={setRepostItem}/>)}
              </div>
            )}
            <div ref={sentinelRef} style={{ height:1 }}/>
            {loadingMore && <LoadMoreSpinner/>}
            {!loadingMore && hasMore && <LoadMoreButton onClick={loadMoreAll} loading={loadingMore}/>}
            {!hasMore && allNews.length >= PAGE_SIZE && (
              <p style={{ textAlign:'center', color:'#9aa0a6', fontSize:13, padding:'20px 0' }}>
                You've read all {allNews.length} articles ✓
              </p>
            )}
          </div>
        )}
      </div>

      <RepostModal item={repostItem} onClose={() => setRepostItem(null)} onConfirm={handleRepost} reposting={reposting}/>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <BottomNav/>
    </>
  )
}
