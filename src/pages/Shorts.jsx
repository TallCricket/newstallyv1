import { useEffect, useState, useRef, useCallback } from 'react'
import {
  collection, getDocs, query, limit, orderBy, startAfter, where,
  addDoc, serverTimestamp, getDoc, doc
} from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'

// ── Constants ──────────────────────────────────────────────────────────────
const CATS      = ['All','National','World','Business','Technology','Sports','Health']
const PAGE_SIZE = 30
const LOAD_AHEAD = 5   // load more when this many cards remain

const CAT_COLORS = {
  National:'#e53935', World:'#1a73e8', Business:'#00c853',
  Technology:'#aa00ff', Health:'#ff6d00', Sports:'#ff1744',
  Entertainment:'#d500f9', General:'#546e7a'
}

function catIcon(cat) {
  const m = {
    Sports:'fas fa-futbol', Technology:'fas fa-microchip',
    Business:'fas fa-chart-line', Health:'fas fa-heart-pulse',
    National:'fas fa-flag', World:'fas fa-globe',
    Entertainment:'fas fa-film', General:'fas fa-newspaper'
  }
  return m[cat] || 'fas fa-newspaper'
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

// ── Repost Modal ───────────────────────────────────────────────────────────
function RepostModal({ item, onClose, onConfirm, reposting }) {
  const accent = CAT_COLORS[item?.category] || '#1a73e8'
  if (!item) return null
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,.75)',
        backdropFilter:'blur(6px)', zIndex:500,
        display:'flex', alignItems:'flex-end', justifyContent:'center'
      }}>
      <div style={{
        width:'100%', maxWidth:480,
        background:'#13131f', borderRadius:'20px 20px 0 0',
        padding:'20px 20px 36px', border:'1px solid rgba(255,255,255,.08)'
      }}>
        {/* Handle */}
        <div style={{ width:40, height:4, borderRadius:99, background:'rgba(255,255,255,.15)', margin:'0 auto 20px' }}/>

        <p style={{ color:'#fff', fontWeight:700, fontSize:16, marginBottom:16 }}>
          Repost to Socialgati?
        </p>

        {/* Preview */}
        <div style={{
          display:'flex', gap:12, background:'rgba(255,255,255,.06)',
          padding:12, borderRadius:12, marginBottom:20,
          border:'1px solid rgba(255,255,255,.08)'
        }}>
          {item.image && (
            <img src={item.image} alt=""
              style={{ width:60, height:60, borderRadius:8, objectFit:'cover', flexShrink:0 }}/>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <span style={{
              fontSize:10, fontWeight:800, textTransform:'uppercase',
              letterSpacing:'.06em', color:accent
            }}>{item.category}</span>
            <p style={{
              fontSize:13, fontWeight:600, color:'#fff', lineHeight:1.4, marginTop:4,
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'
            }}>{item.title}</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:4 }}>{item.source}</p>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{
              flex:1, padding:'13px 0', background:'rgba(255,255,255,.08)',
              border:'none', borderRadius:12, color:'rgba(255,255,255,.7)',
              fontSize:14, fontWeight:600, cursor:'pointer'
            }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(item)} disabled={reposting}
            style={{
              flex:2, padding:'13px 0',
              background:'linear-gradient(135deg,#1a73e8,#1557b0)',
              border:'none', borderRadius:12, color:'#fff',
              fontSize:14, fontWeight:700, cursor: reposting ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              opacity: reposting ? 0.7 : 1
            }}>
            {reposting
              ? <><i className="fas fa-spinner fa-spin"/> Posting...</>
              : <><i className="fas fa-retweet"/> Repost</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Short Card ─────────────────────────────────────────────────────────────
function ShortCard({ item, height, idx, curIdx, onRepost }) {
  const [imgErr, setImgErr] = useState(false)
  const isVisible = Math.abs(idx - curIdx) <= 1
  const accent = CAT_COLORS[item.category] || '#1a73e8'

  // Placeholder for off-screen cards — keeps layout intact, saves memory
  if (!isVisible) {
    return (
      <div style={{
        position:'absolute', top: idx * height, left:0,
        width:'100%', height, background:'#09090f'
      }}/>
    )
  }

  const desc = (item.description || '').substring(0, 280)

  return (
    <div style={{
      position:'absolute', top: idx * height, left:0,
      width:'100%', height, overflow:'hidden',
      display:'flex', flexDirection:'column',
      background:'#09090f'
    }}>

      {/* ── Image section (top 42%) ── */}
      <div style={{ flex:'0 0 42%', position:'relative', overflow:'hidden', background:'#0d0d1a' }}>
        {item.image && !imgErr ? (
          <img
            src={item.image} alt=""
            loading={Math.abs(idx - curIdx) <= 1 ? 'eager' : 'lazy'}
            onError={() => setImgErr(true)}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
          />
        ) : (
          <div style={{
            width:'100%', height:'100%', display:'flex',
            flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
            background:`linear-gradient(135deg, ${accent}18, ${accent}08)`
          }}>
            <i className={catIcon(item.category)} style={{ fontSize:40, color:`${accent}60` }}/>
          </div>
        )}

        {/* Gradient overlay — bottom fade */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:'70%',
          background:'linear-gradient(to bottom, transparent 0%, #09090f 100%)',
          pointerEvents:'none'
        }}/>

        {/* Top-left: source + time */}
        <div style={{
          position:'absolute', top:12, left:12,
          display:'flex', alignItems:'center', gap:6
        }}>
          <span style={{
            background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)',
            color:'rgba(255,255,255,.75)', fontSize:10, fontWeight:600,
            padding:'3px 8px', borderRadius:99,
            border:'1px solid rgba(255,255,255,.1)'
          }}>
            {item.source}
          </span>
          {(item.date || item.pubDate) && (
            <span style={{
              background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)',
              color:'rgba(255,255,255,.5)', fontSize:10, fontWeight:500,
              padding:'3px 8px', borderRadius:99
            }}>
              {timeAgo(item.date || item.pubDate)}
            </span>
          )}
        </div>

        {/* Category badge — bottom left */}
        <div style={{ position:'absolute', bottom:10, left:14 }}>
          <span style={{
            background: accent, color:'#fff',
            fontSize:9, fontWeight:800, letterSpacing:'.07em',
            textTransform:'uppercase', padding:'4px 10px', borderRadius:99,
            display:'inline-flex', alignItems:'center', gap:5,
            boxShadow:`0 2px 10px ${accent}60`
          }}>
            <i className={catIcon(item.category)} style={{ fontSize:8 }}/>
            {item.category}
          </span>
        </div>
      </div>

      {/* ── Text content ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'14px 16px 0', overflow:'hidden' }}>
        {/* Title */}
        <h2 style={{
          fontSize:17, fontWeight:800, color:'#fff',
          lineHeight:1.45, marginBottom:8, flexShrink:0,
          display:'-webkit-box', WebkitLineClamp:3,
          WebkitBoxOrient:'vertical', overflow:'hidden',
          letterSpacing:'-.01em'
        }}>
          {item.title}
        </h2>

        {/* Description */}
        {desc ? (
          <p style={{
            fontSize:13, color:'rgba(255,255,255,.55)',
            lineHeight:1.65, flexShrink:0,
            display:'-webkit-box', WebkitLineClamp:4,
            WebkitBoxOrient:'vertical', overflow:'hidden'
          }}>
            {desc}
          </p>
        ) : null}
      </div>

      {/* ── Action footer ── */}
      <div style={{
        padding:'12px 16px 16px', flexShrink:0,
        display:'flex', alignItems:'center', gap:10,
        borderTop:'1px solid rgba(255,255,255,.06)',
        background:'linear-gradient(to top, rgba(9,9,15,1) 60%, transparent)'
      }}>
        {/* Repost button */}
        <button
          onClick={e => { e.stopPropagation(); onRepost(item) }}
          style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'11px 18px',
            background:'rgba(255,255,255,.08)',
            border:'1px solid rgba(255,255,255,.12)',
            borderRadius:12, color:'#fff',
            fontSize:13, fontWeight:700, cursor:'pointer',
            backdropFilter:'blur(8px)',
            transition:'all .2s',
            flexShrink:0
          }}>
          <i className="fas fa-retweet" style={{ fontSize:14, color:'#34a853' }}/>
          Repost
        </button>

        {/* Read Full Story button */}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:'11px 0',
              background:'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
              borderRadius:12, color:'#fff',
              fontSize:13, fontWeight:700, textDecoration:'none',
              boxShadow:'0 4px 16px rgba(26,115,232,.35)',
              letterSpacing:'-.01em'
            }}>
            Read Full Story
            <i className="fas fa-arrow-up-right-from-square" style={{ fontSize:11 }}/>
          </a>
        )}
      </div>
    </div>
  )
}

// ── Swipe hint ─────────────────────────────────────────────────────────────
function SwipeHint() {
  return (
    <div style={{
      position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)',
      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
      animation:'swipeHintFade 2.5s ease forwards',
      zIndex:200, pointerEvents:'none'
    }}>
      <i className="fas fa-chevron-up" style={{ fontSize:18, color:'rgba(255,255,255,.4)' }}/>
      <span style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontWeight:600, letterSpacing:'.06em' }}>
        SWIPE UP
      </span>
      <style>{`
        @keyframes swipeHintFade {
          0%   { opacity:0; transform:translateX(-50%) translateY(8px); }
          20%  { opacity:1; transform:translateX(-50%) translateY(0); }
          80%  { opacity:1; }
          100% { opacity:0; }
        }
      `}</style>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Shorts() {
  const { user } = useAuth()

  // ── All-category data ──
  const [allNews, setAllNews]       = useState([])
  const lastDocRef                  = useRef(null)
  const orderFieldRef               = useRef(null)
  const [hasMore, setHasMore]       = useState(true)

  // ── Category-specific data ──
  const [catItems, setCatItems]     = useState([])
  const catLastDocRef               = useRef(null)
  const [catHasMore, setCatHasMore] = useState(true)

  // ── Derived / display ──
  const [filtered, setFiltered]     = useState([])

  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]           = useState('')

  const [cat, setCat]               = useState('All')
  const [curIdx, setCurIdx]         = useState(0)

  // ── Auth / Repost ──
  const [showAuth, setShowAuth]     = useState(false)
  const [repostItem, setRepostItem] = useState(null)
  const [reposting, setReposting]   = useState(false)
  const [showHint, setShowHint]     = useState(true)

  // ── Swipe / layout refs ──
  const vpRef           = useRef()
  const trackRef        = useRef()
  const touchStartY     = useRef(0)
  const touchStartTime  = useRef(0)
  const isDragging      = useRef(false)
  // BUG FIX: always read VH fresh to avoid stale value after orientation change
  const getH = () => window.innerHeight

  // ═══════════════════════════════════════════════════════
  // DATA LOADING — same pattern as NewsTally
  // ═══════════════════════════════════════════════════════

  const detectOrderField = useCallback(async () => {
    const fields = ['pubDate', 'fetchedAt', 'savedAt']
    for (const field of fields) {
      try {
        const snap = await getDocs(query(collection(db, 'news'), orderBy(field, 'desc'), limit(1)))
        if (!snap.empty) { orderFieldRef.current = field; return field }
      } catch(e) { /* index missing */ }
    }
    orderFieldRef.current = null
    return null
  }, [])

  // Fetch batch — "All" category
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

  // Fetch batch — specific category
  // BUG FIX: Each category fetches its own data from Firestore (not just local filter)
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
      // Fallback: no orderBy
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

  // Initial load — "All"
  const loadInitial = useCallback(async () => {
    setLoading(true); setError(''); setHasMore(true)
    lastDocRef.current = null
    try {
      await detectOrderField()
      const items = await fetchBatch(true)
      if (!items.length) { setError('No news available.'); return }
      setAllNews(sortByDate(items))
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [detectOrderField, fetchBatch])

  // Load category initial
  const loadCategoryInitial = useCallback(async (category) => {
    setLoading(true); setError('')
    setCatItems([]); setCatHasMore(true)
    catLastDocRef.current = null
    try {
      const items = await fetchCategoryBatch(category, true)
      setCatItems(sortByDate(items))
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [fetchCategoryBatch])

  // Load more — "All"
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
    } catch(e) { console.error('loadMoreAll:', e) }
    finally { setLoadingMore(false) }
  }, [loadingMore, hasMore, fetchBatch])

  // Load more — category
  // BUG FIX: Was completely blocked when cat !== 'All' in original
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
    } catch(e) { console.error('loadMoreCat:', e) }
    finally { setLoadingMore(false) }
  }, [loadingMore, catHasMore, cat, fetchCategoryBatch])

  // Unified load more
  const loadMore = useCallback(() => {
    if (cat === 'All') return loadMoreAll()
    return loadMoreCat()
  }, [cat, loadMoreAll, loadMoreCat])

  // Mount
  useEffect(() => { loadInitial() }, [loadInitial])

  // Cat change — fetch fresh data
  useEffect(() => {
    setCurIdx(0)
    if (cat !== 'All') loadCategoryInitial(cat)
  }, [cat]) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive filtered
  // BUG FIX: uses catItems for non-All, allNews for All
  useEffect(() => {
    setFiltered(cat === 'All' ? allNews : catItems)
  }, [cat, allNews, catItems])

  // Auto-load more when approaching end
  useEffect(() => {
    if (!filtered.length) return
    const remaining = filtered.length - 1 - curIdx
    if (remaining <= LOAD_AHEAD) loadMore()
  }, [curIdx, filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Hide swipe hint after first swipe
  useEffect(() => {
    if (curIdx > 0) setShowHint(false)
  }, [curIdx])

  // ═══════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════
  const navigate = useCallback((dir) => {
    setCurIdx(prev => {
      const next = prev + dir
      if (next < 0 || next >= filtered.length) return prev
      return next
    })
  }, [filtered.length])

  // BUG FIX: get fresh VH on every swipe to avoid stale value
  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    isDragging.current = true
  }, [])

  const onTouchMove = useCallback((e) => {
    if (!isDragging.current) return
    const h = getH()
    const dy = e.touches[0].clientY - touchStartY.current
    const el = trackRef.current
    if (el) el.style.transform = `translate3d(0,${-curIdx * h + dy}px,0)`
  }, [curIdx])

  const onTouchEnd = useCallback((e) => {
    if (!isDragging.current) return
    isDragging.current = false
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const dt = Date.now() - touchStartTime.current
    const isSwipe = Math.abs(dy) > 50 || (Math.abs(dy) > 25 && dt < 300)
    const el = trackRef.current
    const h = getH()
    if (el) {
      el.style.transition = 'transform .3s cubic-bezier(.25,.46,.45,.94)'
      if (isSwipe) {
        navigate(dy < 0 ? 1 : -1)
      } else {
        el.style.transform = `translate3d(0,${-curIdx * h}px,0)`
      }
      setTimeout(() => { if (el) el.style.transition = '' }, 360)
    }
  }, [curIdx, navigate])

  // Track position when curIdx changes
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const h = getH()
    el.style.transition = 'transform .3s cubic-bezier(.25,.46,.45,.94)'
    el.style.transform = `translate3d(0,${-curIdx * h}px,0)`
    setTimeout(() => { if (el) el.style.transition = '' }, 360)
  }, [curIdx])

  // ═══════════════════════════════════════════════════════
  // REPOST
  // ═══════════════════════════════════════════════════════
  const handleRepost = useCallback(async (item) => {
    if (!user) { setRepostItem(null); setShowAuth(true); return }
    setReposting(true)
    try {
      const { getDocs: gd, query: q2, collection: col, where: w2, limit: lim2 } =
        await import('firebase/firestore')
      const dup = await getDocs(query(
        collection(db,'artifacts',APP_ID,'public','data','reposts'),
        where('userId','==',user.uid), where('headline','==',item.title),
        where('type','==','repost'), limit(1)
      ))
      if (!dup.empty) { showToast('Already reposted!'); setRepostItem(null); return }
      const uSnap = await getDoc(doc(db,'users',user.uid)).catch(()=>null)
      const uData = uSnap?.data() || {}
      await addDoc(collection(db,'artifacts',APP_ID,'public','data','reposts'), {
        userId: user.uid, username: uData.username || user.displayName || 'User',
        userAvatar: user.photoURL || '', image: item.image || '',
        headline: item.title, newsUrl: item.url || '',
        newsSource: item.source || '', newsCategory: item.category || '',
        newsId: String(item.id||''), likes:[], commentsCount:0,
        timestamp: serverTimestamp(), type:'repost'
      })
      showToast('✅ Reposted to Socialgati!')
      setRepostItem(null)
    } catch(e) { showToast('Repost failed') }
    finally { setReposting(false) }
  }, [user])

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  if (loading) return (
    <div style={{ position:'fixed', inset:0, background:'#09090f', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', color:'#fff' }}>
        <div style={{
          width:48, height:48, borderRadius:'50%',
          border:'3px solid rgba(255,255,255,.1)',
          borderTopColor:'#1a73e8',
          animation:'spin .8s linear infinite',
          margin:'0 auto 16px'
        }}/>
        <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', fontWeight:600, letterSpacing:'.04em' }}>
          LOADING SHORTS
        </p>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  if (error || filtered.length === 0) return (
    <div style={{ position:'fixed', inset:0, background:'#09090f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
      <i className="fas fa-newspaper" style={{ fontSize:40, color:'rgba(255,255,255,.15)' }}/>
      <p style={{ color:'rgba(255,255,255,.5)', fontWeight:600, fontSize:15 }}>
        {error || 'No shorts available'}
      </p>
      {error && (
        <button onClick={loadInitial}
          style={{ marginTop:8, padding:'10px 24px', background:'#1a73e8', border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          Retry
        </button>
      )}
      <BottomNav darkMode/>
    </div>
  )

  const h = getH()
  const currentHasMore = cat === 'All' ? hasMore : catHasMore

  return (
    <div style={{ position:'fixed', inset:0, background:'#09090f', overflow:'hidden' }}>

      {/* ── Category bar ── */}
      <div style={{
        position:'fixed', top:0, left:0, right:0, zIndex:300,
        paddingTop:'calc(10px + env(safe-area-inset-top,0px))',
        paddingBottom:10, paddingLeft:12, paddingRight:12,
        display:'flex', alignItems:'center', gap:8,
        overflowX:'auto', scrollbarWidth:'none',
        background:'linear-gradient(to bottom, rgba(9,9,15,.95) 0%, transparent 100%)'
      }}>
        {/* Logo */}
        <img
          src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png"
          style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, marginRight:4 }}
          alt=""/>

        {CATS.map(c => {
          const isActive = cat === c
          const accent = CAT_COLORS[c] || '#fff'
          return (
            <button key={c}
              onClick={() => setCat(c)}
              style={{
                padding:'6px 14px', borderRadius:99, border:'none',
                fontSize:12, fontWeight:700, flexShrink:0, cursor:'pointer',
                letterSpacing:'.02em', transition:'all .2s',
                background: isActive ? accent : 'rgba(255,255,255,.1)',
                color: isActive ? '#fff' : 'rgba(255,255,255,.55)',
                boxShadow: isActive ? `0 2px 12px ${accent}50` : 'none'
              }}>
              {c}
            </button>
          )
        })}
      </div>

      {/* ── Viewport ── */}
      <div
        ref={vpRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position:'absolute', inset:0,
          overflow:'hidden', touchAction:'none'
        }}>
        <div
          ref={trackRef}
          style={{
            position:'absolute', top:0, left:0, width:'100%',
            willChange:'transform', transform:'translate3d(0,0,0)'
          }}>
          {filtered.map((item, i) => (
            <ShortCard
              key={item.id}
              item={item}
              height={h}
              idx={i}
              curIdx={curIdx}
              onRepost={item => setRepostItem(item)}
            />
          ))}
        </div>
      </div>

      {/* ── Loading more indicator ── */}
      {loadingMore && (
        <div style={{
          position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)',
          background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)',
          color:'rgba(255,255,255,.6)', fontSize:12, fontWeight:600,
          padding:'6px 16px', borderRadius:99, zIndex:200,
          display:'flex', alignItems:'center', gap:8,
          border:'1px solid rgba(255,255,255,.08)'
        }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize:11 }}/>
          Loading more...
        </div>
      )}

      {/* ── End of feed ── */}
      {!currentHasMore && filtered.length > PAGE_SIZE && curIdx >= filtered.length - 2 && (
        <div style={{
          position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)',
          background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)',
          color:'rgba(255,255,255,.4)', fontSize:12, fontWeight:600,
          padding:'6px 16px', borderRadius:99, zIndex:200,
          border:'1px solid rgba(255,255,255,.06)'
        }}>
          You're all caught up ✓
        </div>
      )}

      {/* ── Swipe hint (first load only) ── */}
      {showHint && filtered.length > 1 && <SwipeHint/>}

      {/* ── Repost modal ── */}
      {repostItem && (
        <RepostModal
          item={repostItem}
          onClose={() => setRepostItem(null)}
          onConfirm={handleRepost}
          reposting={reposting}
        />
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <BottomNav darkMode/>
    </div>
  )
}
