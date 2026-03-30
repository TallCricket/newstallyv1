import { useEffect, useState, useCallback, useRef } from 'react'
import {
  collection, getDocs, query, limit, orderBy, startAfter,
  addDoc, updateDoc, arrayUnion, increment as fbIncrement,
  serverTimestamp, where, getDoc, doc, onSnapshot
} from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo, catIcon } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../context/TranslationContext'
import { useTranslate } from '../hooks/useTranslate'

const DEFAULT_CATS = ['All','National','World','Business','Technology','Health','Education','Sports','General']
const PAGE_SIZE = 20

const CAT_COLORS = {
  National:'#e53935', World:'#1a73e8', Business:'#34a853',
  Technology:'#9334e6', Health:'#f4a261', Education:'#0077b6',
  Sports:'#ff6d00', General:'#546e7a', Entertainment:'#ad1457'
}

function getItemDate(n) {
  // Handle Firestore Timestamps, ISO strings, and fallbacks
  const ts = n.timestamp || n.pubDate || n.fetchedAt || n.savedAt || n.date
  if (!ts) return 0
  if (ts?.toDate) return ts.toDate().getTime()  // Firestore Timestamp
  if (ts?.seconds) return ts.seconds * 1000     // Firestore Timestamp (serialized)
  const t = new Date(ts).getTime()
  return isNaN(t) ? 0 : t
}
function sortByDate(items) {
  return [...items].sort((a, b) => {
    // Only respect rank if BOTH have a rank (manager-ranked articles)
    const aRank = (a.rank != null && a.rank < 9999) ? a.rank : null
    const bRank = (b.rank != null && b.rank < 9999) ? b.rank : null
    if (aRank !== null && bRank !== null) return aRank - bRank
    // Otherwise latest date first
    return getItemDate(b) - getItemDate(a)
  })
}

// --- Skeletons ----------------------------------------------------
function HeroSkeleton() {
  return (
    <div style={{ margin:'16px', borderRadius:16, overflow:'hidden', background:'var(--surface)', border:'1px solid var(--border)' }}>
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
    <div style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border2)' }}>
      <div style={{ flex:1 }}>
        <div className="skeleton" style={{ height:10, width:'35%', marginBottom:8, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:14, width:'100%', marginBottom:6, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:14, width:'80%', borderRadius:4 }}/>
      </div>
      <div className="skeleton" style={{ width:80, height:60, borderRadius:8, flexShrink:0 }}/>
    </div>
  )
}

// --- Hero Card ----------------------------------------------------
function HeroCard({ item, onRepost }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [imgErr, setImgErr] = useState(false)
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  const { text: title } = useTranslate(item.title)
  const { text: desc } = useTranslate(item.description || '')
  return (
    <div style={{ margin:'12px 16px', borderRadius:16, overflow:'hidden', background:'var(--surface)', boxShadow:'var(--shadow-md)', cursor:'pointer' }}
      onClick={() => navigate(`/news/${item.id}`)}>
      {item.image && !imgErr ? (
        <div style={{ position:'relative', height:220, overflow:'hidden', background:'var(--surface2)' }}>
          <img src={item.image} alt={item.title} loading="eager" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={() => setImgErr(true)}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.75) 0%,rgba(0,0,0,.1) 60%,transparent 100%)' }}/>
          <div style={{ position:'absolute', top:12, left:12 }}>
            <span style={{ background:accent, color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, textTransform:'uppercase', letterSpacing:'.05em' }}>{item.category}</span>
          </div>
          <div style={{ position:'absolute', bottom:12, left:14, right:14 }}>
            <p style={{ color:'rgba(255,255,255,.75)', fontSize:11, fontWeight:600, marginBottom:4 }}>{item.source} {"\u00b7"} {timeAgo(item.date || item.pubDate)}</p>
            <h2 style={{ color:'#fff', fontSize:18, fontWeight:700, lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{title}</h2>
          </div>
        </div>
      ) : (
        <div style={{ background:`linear-gradient(135deg,${accent}22,${accent}44)`, padding:'28px 20px' }}>
          <span style={{ background:accent, color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, textTransform:'uppercase', display:'inline-block', marginBottom:12 }}>{item.category}</span>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--ink)', lineHeight:1.4, marginBottom:8 }}>{title}</h2>
          <p style={{ fontSize:12, color:'var(--muted)' }}>{item.source} {"\u00b7"} {timeAgo(item.date || item.pubDate)}</p>
        </div>
      )}
      <div style={{ padding:'14px 16px' }}>
        {item.description && (
          <p style={{ fontSize:14, color:'var(--muted)', lineHeight:1.6, marginBottom:12, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{desc}</p>
        )}
        <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => navigate(`/news/${item.id}`)}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 0', background:'#1a73e8', color:'#fff', borderRadius:8, fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}>
            <i className="fas fa-newspaper" style={{ fontSize:11 }}/> {t('readFull')}
          </button>
          <button onClick={e => { e.stopPropagation(); onRepost(item) }}
            style={{ padding:'9px 16px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, fontWeight:700, color:'#34a853', background:'var(--surface)', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <i className="fas fa-retweet"/> {t('repost')}
          </button>
        </div>
      </div>
    </div>
  )
}

function CompactCard({ item, onRepost }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [imgErr, setImgErr] = useState(false)
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  const { text: title } = useTranslate(item.title)
  return (
    <div style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border2)', cursor:'pointer' }}
      onClick={() => navigate(`/news/${item.id}`)}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:accent, flexShrink:0 }}/>
          <span style={{ fontSize:10, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:'.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.category}</span>
          <span style={{ fontSize:10, color:'var(--muted2)', marginLeft:'auto', flexShrink:0 }}>{timeAgo(item.date || item.pubDate)}</span>
        </div>
        <p style={{ fontSize:14, fontWeight:600, color:'var(--ink)', lineHeight:1.45, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:4 }}>{title}</p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <p style={{ fontSize:11, color:'var(--muted2)', fontWeight:500 }}>{item.source}</p>
          {onRepost && (
            <button onClick={e => { e.stopPropagation(); onRepost(item) }}
              style={{ fontSize:11, color:'#34a853', background:'none', border:'none', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:4, padding:'2px 6px', borderRadius:6 }}>
              <i className="fas fa-retweet" style={{ fontSize:11 }}/> {t('repost')}
            </button>
          )}
        </div>
      </div>
      {item.image && !imgErr && (
        <img src={item.image} alt="" loading="lazy" onError={() => setImgErr(true)}
          style={{ width:80, height:60, borderRadius:8, objectFit:'cover', flexShrink:0, background:'var(--surface2)' }}/>
      )}
    </div>
  )
}

function GridCard({ item }) {
  const navigate = useNavigate()
  const [imgErr, setImgErr] = useState(false)
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  const { text: title } = useTranslate(item.title)
  return (
    <div style={{ background:'var(--surface)', borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', cursor:'pointer' }}
      onClick={() => navigate(`/news/${item.id}`)}>
      {item.image && !imgErr ? (
        <div style={{ height:110, overflow:'hidden', background:'var(--surface2)', position:'relative' }}>
          <img src={item.image} alt="" loading="lazy" onError={() => setImgErr(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', top:6, left:6 }}>
            <span style={{ background:accent, color:'#fff', fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99, textTransform:'uppercase' }}>{item.category}</span>
          </div>
        </div>
      ) : (
        <div style={{ height:60, background:`linear-gradient(135deg,${accent}22,${accent}33)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className={catIcon(item.category)} style={{ fontSize:20, color:accent, opacity:.5 }}/>
        </div>
      )}
      <div style={{ padding:'10px 10px 12px' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', lineHeight:1.4, marginBottom:6, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{title}</p>
        <div style={{ fontSize:10, color:'var(--muted2)', display:'flex', justifyContent:'space-between' }}>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{item.source}</span>
          <span>{timeAgo(item.date || item.pubDate)}</span>
        </div>
      </div>
    </div>
  )
}

function CategorySection({ title, items, accent, onRepost, onSeeAll }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  if (!items.length) return null
  const [main, ...rest] = items
  return (
    <div style={{ margin:'20px 0' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:4, height:22, background:accent, borderRadius:2 }}/>
          <h2 style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>{title}</h2>
        </div>
        <button onClick={() => onSeeAll && onSeeAll(title)}
          style={{ fontSize:12, color:accent, fontWeight:700, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          See all <i className="fas fa-arrow-right" style={{ fontSize:10 }}/>
        </button>
      </div>
      <div style={{ margin:'0 16px', borderRadius:12, overflow:'hidden', background:'var(--surface)', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', cursor:'pointer', marginBottom:1 }}
        onClick={() => navigate(`/news/${main.id}`)}>
        {main.image && (
          <div style={{ height:160, overflow:'hidden', background:'var(--surface2)', position:'relative' }}>
            <img src={main.image} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 60%)' }}/>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:12 }}>
              <p style={{ color:'#fff', fontSize:15, fontWeight:700, lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{main.title}</p>
              <p style={{ color:'rgba(255,255,255,.7)', fontSize:11, marginTop:4 }}>{main.source} {"\u00b7"} {timeAgo(main.date || main.pubDate)}</p>
            </div>
          </div>
        )}
        {!main.image && (
          <div style={{ padding:'14px 16px' }}>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--ink)', lineHeight:1.4 }}>{main.title}</p>
            <p style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>{main.source} {"\u00b7"} {timeAgo(main.date || main.pubDate)}</p>
          </div>
        )}
      </div>
      <div style={{ margin:'0 16px', background:'var(--surface)', border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 12px 12px', padding:'0 14px' }}>
        {rest.slice(0,3).map((item, i) => (
          <div key={item.id} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom: i < 2 ? '1px solid var(--border2)' : 'none', cursor:'pointer' }}
            onClick={() => navigate(`/news/${item.id}`)}>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--ink)', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</p>
              <p style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>{item.source} {"\u00b7"} {timeAgo(item.date || item.pubDate)}</p>
            </div>
            {item.image && <img src={item.image} alt="" loading="lazy" style={{ width:68, height:52, borderRadius:6, objectFit:'cover', flexShrink:0 }} onError={e => e.target.style.display='none'}/>}
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Home/Category layout {"\u2014"} same for ALL and every specific category --
function NewsLayout({ items, cat, onRepost, onSeeAll, sentinelRef, loadingMore, hasMore, onLoadMore, totalLoaded }) {
  const { t } = useTranslation()
  const groupByCategory = (arr) => {
    const map = {}
    arr.forEach(n => { if (!map[n.category]) map[n.category] = []; map[n.category].push(n) })
    return map
  }
  if (!items.length) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
      <i className="fas fa-newspaper" style={{ fontSize:40, marginBottom:12, display:'block', opacity:.3 }}/>
      <p style={{ fontWeight:600, color:'var(--ink)', marginBottom:6 }}>{t('noNews')}</p>
      <p style={{ fontSize:13 }}>Check back later for the latest updates</p>
    </div>
  )

  return (
    <div style={{ background:'var(--bg)' }}>
      {/* Hero {"\u2014"} always the most recent */}
      <HeroCard item={items[0]} onRepost={onRepost}/>

      {/* Latest Updates strip {"\u2014"} items 1{"\u2013"}4 */}
      {items.length > 1 && (
        <div style={{ margin:'4px 16px 16px', background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ background:'#1a73e8', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff1744', animation:'pulse 1s infinite' }}/>
            <span style={{ color:'#fff', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em' }}>{t('latestUpdates')}</span>
          </div>
          <div style={{ padding:'0 14px' }}>
            {items.slice(1, 5).map(item => <CompactCard key={item.id} item={item} onRepost={onRepost}/>)}
          </div>
        </div>
      )}

      {/* 2-col grid {"\u2014"} items 5{"\u2013"}10 */}
      {items.length > 5 && (
        <div style={{ padding:'0 16px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:4, height:22, background:'#9334e6', borderRadius:2 }}/>
            <h2 style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>More Stories</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {items.slice(5, 11).map(item => <GridCard key={item.id} item={item}/>)}
          </div>
        </div>
      )}

      {/* Category sections {"\u2014"} only on "All" tab */}
      {cat === 'All' && items.length > 11 && (() => {
        const grouped = groupByCategory(items.slice(11))
        return Object.entries(grouped)
          .filter(([, arr]) => arr.length >= 2)
          .slice(0, 6)
          .map(([category, arr]) => (
            <CategorySection key={category} title={category} items={arr}
              accent={CAT_COLORS[category] || '#1a73e8'}
              onRepost={onRepost} onSeeAll={onSeeAll}/>
          ))
      })()}

      {/* Remaining articles {"\u2014"} for specific category or after category sections */}
      {(() => {
        const startIdx = cat === 'All' ? 40 : 11
        const remaining = items.slice(startIdx)
        return remaining.length > 0 ? (
          <div style={{ margin:'8px 16px 0', background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', padding:'4px 14px' }}>
            <div style={{ padding:'10px 0 6px', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:4, height:18, background:'#34a853', borderRadius:2 }}/>
              <h2 style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>More News</h2>
            </div>
            {remaining.map(item => <CompactCard key={item.id} item={item} onRepost={onRepost}/>)}
          </div>
        ) : null
      })()}

      {/* Pagination */}
      <div ref={sentinelRef} style={{ height:1 }}/>
      {loadingMore && (
        <div style={{ display:'flex', justifyContent:'center', padding:'20px 0', gap:8, color:'var(--muted)', fontSize:13 }}>
          <i className="fas fa-spinner fa-spin"/><span>Loading more news...</span>
        </div>
      )}
      {!loadingMore && hasMore && (
        <div style={{ display:'flex', justifyContent:'center', padding:'16px 0 8px' }}>
          <button onClick={onLoadMore}
            style={{ padding:'10px 28px', background:'var(--surface)', border:'1.5px solid #1a73e8', borderRadius:24, fontSize:14, fontWeight:700, color:'#1a73e8', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
            <i className="fas fa-arrow-down"/> Load More
          </button>
        </div>
      )}
      {!hasMore && totalLoaded >= PAGE_SIZE && (
        <p style={{ textAlign:'center', color:'var(--muted)', fontSize:13, padding:'20px 0' }}>
          You've read all {totalLoaded} articles {"\u2713"}
        </p>
      )}
    </div>
  )
}

// --- Repost Modal -------------------------------------------------
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
        <div style={{ display:'flex', gap:12, marginBottom:20, background:'var(--surface2)', padding:12, borderRadius:10 }}>
          {item.image && <img src={item.image} style={{ width:64, height:64, borderRadius:8, objectFit:'cover', flexShrink:0 }} alt=""/>}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:accent, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{item.category}</div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{item.source}</div>
          </div>
        </div>
        <button onClick={() => onConfirm(item)} disabled={reposting}
          style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {reposting ? <><i className="fas fa-spinner fa-spin"/> Posting...</> : <><i className="fas fa-retweet"/> Repost to Community</>}
        </button>
      </div>
    </div>
  )
}

// ===================================================================
export default function NewsTally() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t, lang } = useTranslation()

  const [allNews, setAllNews]         = useState([])
  const lastDocRef                    = useRef(null)
  const orderFieldRef                 = useRef(null)
  const [hasMore, setHasMore]         = useState(true)
  const liveUnsubRef                  = useRef(null)

  const [catItems, setCatItems]       = useState([])
  const catLastDocRef                 = useRef(null)
  const [catHasMore, setCatHasMore]   = useState(true)

  const [filtered, setFiltered]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState('')

  const [cat, setCat]                 = useState('All')
  const [cats, setCats]               = useState(DEFAULT_CATS) // loaded from Firestore config
  const [search, setSearch]           = useState('')
  const [showSearch, setShowSearch]   = useState(false)
  const [showAuth, setShowAuth]       = useState(false)
  const [repostItem, setRepostItem]   = useState(null)
  const [reposting, setReposting]     = useState(false)
  const sentinelRef = useRef(null)

  // Load category order from Firestore config
  useEffect(() => {
    getDoc(doc(db, 'config', 'rankings')).then(snap => {
      if (snap.exists() && Array.isArray(snap.data().categoryOrder)) {
        const order = snap.data().categoryOrder
        setCats(['All', ...order])
      }
    }).catch(() => {})
  }, [])

  // KEY FIX: No orderBy in Firestore query -> returns ALL sources (not just DD News)
  // Sort is done client-side so all news from all platforms appears latest-first
  const fetchBatch = useCallback(async (isFirst = false) => {
    // Try with orderBy first (requires Firestore index), fallback without
    const makeQuery = (withOrder) => {
      const base = collection(db, 'news')
      if (isFirst) {
        return withOrder
          ? query(base, orderBy('timestamp', 'desc'), limit(PAGE_SIZE * 2))
          : query(base, limit(PAGE_SIZE * 2))
      }
      if (!lastDocRef.current) return null
      return withOrder
        ? query(base, orderBy('timestamp', 'desc'), startAfter(lastDocRef.current), limit(PAGE_SIZE * 2))
        : query(base, startAfter(lastDocRef.current), limit(PAGE_SIZE * 2))
    }
    let snap
    try {
      const q = makeQuery(true)
      if (!q) return []
      snap = await getDocs(q)
    } catch {
      // Fallback: no orderBy (index may not exist)
      const q = makeQuery(false)
      if (!q) return []
      snap = await getDocs(q)
    }
    if (snap.empty) { setHasMore(false); return [] }
    if (snap.docs.length < PAGE_SIZE) setHasMore(false)
    lastDocRef.current = snap.docs[snap.docs.length - 1]
    return snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(n => n.title)
  }, [])

  const fetchCategoryBatch = useCallback(async (category, isFirst = false) => {
    const make = (withOrder) => {
      const base = [where('category', '==', category)]
      if (!isFirst && catLastDocRef.current) base.push(startAfter(catLastDocRef.current))
      if (withOrder) base.splice(1, 0, orderBy('timestamp', 'desc'))
      base.push(limit(PAGE_SIZE * 2))
      return query(collection(db, 'news'), ...base)
    }
    let snap
    try {
      snap = await getDocs(make(true))
    } catch {
      snap = await getDocs(make(false))
    }
    if (snap.empty) { setCatHasMore(false); return [] }
    if (snap.docs.length < PAGE_SIZE) setCatHasMore(false)
    catLastDocRef.current = snap.docs[snap.docs.length - 1]
    return snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(n => n.title)
  }, [])

  const loadInitial = useCallback(() => {
    // Cancel any previous listener
    if (liveUnsubRef.current) { liveUnsubRef.current(); liveUnsubRef.current = null }
    setLoading(true); setError(''); setHasMore(true); lastDocRef.current = null

    // Try real-time listener with orderBy, fallback to one-time fetch
    const liveQ = query(collection(db, 'news'), orderBy('timestamp', 'desc'), limit(PAGE_SIZE * 2))
    liveUnsubRef.current = onSnapshot(liveQ,
      (snap) => {
        if (snap.empty) {
          // Try fallback without orderBy (index may not exist yet)
          getDocs(query(collection(db, 'news'), limit(PAGE_SIZE * 2)))
            .then(fbSnap => {
              const items = fbSnap.docs.map(d => ({ id:d.id, ...d.data() })).filter(n => n.title)
              if (items.length) {
                lastDocRef.current = fbSnap.docs[fbSnap.docs.length - 1]
                setAllNews(sortByDate(items))
                setError('')
              } else {
                setError('No news articles found. Please check back later.')
              }
              setLoading(false)
            })
            .catch(e => { setError(e.message); setLoading(false) })
          return
        }
        const items = snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(n => n.title)
        lastDocRef.current = snap.docs[snap.docs.length - 1]
        if (snap.docs.length < PAGE_SIZE) setHasMore(false)
        setAllNews(sortByDate(items))
        setError('')
        setLoading(false)
      },
      (err) => {
        // Listener error — fallback to one-time fetch without orderBy
        getDocs(query(collection(db, 'news'), limit(PAGE_SIZE * 2)))
          .then(fbSnap => {
            const items = fbSnap.docs.map(d => ({ id:d.id, ...d.data() })).filter(n => n.title)
            if (items.length) {
              lastDocRef.current = fbSnap.docs[fbSnap.docs.length - 1]
              setAllNews(sortByDate(items))
              setError('')
            } else {
              setError(err.message || 'No news articles found.')
            }
            setLoading(false)
          })
          .catch(() => { setError(err.message); setLoading(false) })
      }
    )
  }, []) // eslint-disable-line

  const loadCategoryInitial = useCallback(async (category) => {
    setLoading(true); setError(''); setCatItems([]); setCatHasMore(true); catLastDocRef.current = null
    try { setCatItems(sortByDate(await fetchCategoryBatch(category, true))) }
    catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [fetchCategoryBatch])

  const loadMoreAll = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const items = await fetchBatch(false)
      if (items.length) setAllNews(prev => {
        const ids = new Set(prev.map(n => n.id))
        return sortByDate([...prev, ...items.filter(n => !ids.has(n.id))])
      })
    } catch(e) { console.error(e) }
    finally { setLoadingMore(false) }
  }, [loadingMore, hasMore, fetchBatch])

  const loadMoreCat = useCallback(async () => {
    if (loadingMore || !catHasMore || cat === 'All') return
    setLoadingMore(true)
    try {
      const items = await fetchCategoryBatch(cat, false)
      if (items.length) setCatItems(prev => {
        const ids = new Set(prev.map(n => n.id))
        return sortByDate([...prev, ...items.filter(n => !ids.has(n.id))])
      })
    } catch(e) { console.error(e) }
    finally { setLoadingMore(false) }
  }, [loadingMore, catHasMore, cat, fetchCategoryBatch])

  const loadMore = useCallback(() => {
    if (search.trim()) return
    return cat === 'All' ? loadMoreAll() : loadMoreCat()
  }, [cat, search, loadMoreAll, loadMoreCat])

  useEffect(() => {
    loadInitial()
    return () => { if (liveUnsubRef.current) { liveUnsubRef.current(); liveUnsubRef.current = null } }
  }, [loadInitial])
  useEffect(() => {
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

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold:0.1, rootMargin:'300px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  const handleRepost = async (item) => {
    if (!user) return setShowAuth(true)
    setReposting(true)
    try {
      const uSnap = await getDoc(doc(db,'users',user.uid)).catch(() => null)
      const uData = uSnap?.data() || {}
      const myInfo = { uid:user.uid, username:uData.username||user.displayName||'User', avatar:user.photoURL||'', timestamp:new Date().toISOString() }
      const myRepost = await getDocs(query(collection(db,'artifacts',APP_ID,'public','data','reposts'), where('newsId','==',String(item.id||item.title)), where('repostedBy','array-contains',user.uid), limit(1))).catch(() => ({ empty:true }))
      if (!myRepost.empty) { showToast('Already reposted!'); setRepostItem(null); return }
      const existing = await getDocs(query(collection(db,'artifacts',APP_ID,'public','data','reposts'), where('newsId','==',String(item.id||item.title)), where('type','==','repost'), limit(1)))
      if (!existing.empty) {
        await updateDoc(existing.docs[0].ref, { repostCount:fbIncrement(1), repostedBy:arrayUnion(user.uid), repostedUsers:arrayUnion(myInfo) })
        showToast('{"\u2705"} You reposted this news!')
      } else {
        await addDoc(collection(db,'artifacts',APP_ID,'public','data','reposts'), { userId:user.uid, username:myInfo.username, userAvatar:myInfo.avatar, image:item.image||'', headline:item.title, newsUrl:item.url||'', newsSource:item.source||'', newsCategory:item.category||'', newsId:String(item.id||item.title), likes:[], commentsCount:0, repostCount:1, repostedBy:[user.uid], repostedUsers:[myInfo], timestamp:serverTimestamp(), type:'repost' })
        showToast('{"\u2705"} Reposted to Socialgati!')
      }
      setRepostItem(null)
    } catch(e) { console.error(e); showToast('Repost failed') }
    finally { setReposting(false) }
  }

  const currentHasMore  = cat === 'All' ? hasMore : catHasMore
  const currentTotal    = cat === 'All' ? allNews.length : catItems.length

  return (
    <>
      {/* -- Mobile header -- */}
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="NewsTally"/>
          <span className="logo-text">NewsTally</span>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          <button onClick={() => setShowSearch(s => !s)} style={{ width:36, height:36, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:16, background:'none', border:'none', cursor:'pointer' }}>
            <i className="fas fa-search"/>
          </button>
        </div>
      </header>

      {/* -- DESKTOP layout: Google News style -- */}
      <div className="nt-desktop-only">
        {/* Desktop topbar */}
        <div className="nt-desktop-topbar">
          <div className="logo" style={{ cursor:'pointer' }} onClick={() => navigate('/news')}>
            <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="NewsTally" style={{ width:36, height:36, borderRadius:'50%' }}/>
            <span style={{ fontSize:20, fontWeight:800, color:'var(--ink)', marginLeft:8 }}>NewsTally</span>
          </div>
          {/* Search bar in topbar */}
          <div style={{ flex:1, maxWidth:500, position:'relative' }}>
            <i className="fas fa-search" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', fontSize:14, pointerEvents:'none' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search news, topics, sources..."
              style={{ width:'100%', padding:'10px 14px 10px 40px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:99, fontSize:14, outline:'none', color:'var(--ink)' }}/>
            {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', background:'none', border:'none', cursor:'pointer', padding:4 }}><i className="fas fa-times-circle"/></button>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            {[['/', 'fas fa-house'], ['/news', 'fas fa-newspaper'], ['/shorts', 'fas fa-circle-play'], ['/search', 'fas fa-search'], ['/profile', 'fas fa-user']].map(([path, icon]) => (
              <button key={path} onClick={() => navigate(path)}
                style={{ width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', border:'none', background: window.location.pathname===path ? 'rgba(26,115,232,.1)' : 'transparent', color: window.location.pathname===path ? '#1a73e8' : 'var(--muted)', fontSize:16, cursor:'pointer' }}>
                <i className={icon}/>
              </button>
            ))}
          </div>
        </div>

        <div className="nt-desktop-shell" style={{ paddingTop:64 }}>
          {/* Left sidebar: categories */}
          <div className="nt-desktop-left">
            <p style={{ fontSize:11, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', padding:'4px 14px 8px' }}>Categories</p>
            {cats.map(c => (
              <button key={c} className={`nt-sidebar-cat ${cat===c ? 'active' : ''}`} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="nt-desktop-main">
            {loading ? (
              <div>
                <HeroSkeleton/>
                <div style={{ padding:'0' }}>{Array.from({length:4}).map((_,i) => <SmallSkeleton key={i}/>)}</div>
              </div>
            ) : error ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <i className="fas fa-exclamation-circle" style={{ fontSize:36, color:'#ea4335', marginBottom:12, display:'block' }}/>
                <p style={{ fontWeight:600, marginBottom:8, color:'var(--ink)' }}>Could not load news</p>
                <button onClick={loadInitial} style={{ padding:'10px 24px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>{"\u21ba"} Retry</button>
              </div>
            ) : search.trim() ? (
              <div>
                <p style={{ fontSize:13, color:'var(--muted)', marginBottom:16, fontWeight:500 }}>{filtered.length} results for "{search}"</p>
                <div className="nt-main-grid">
                  {filtered.map(item => <GridCard key={item.id} item={item}/>)}
                </div>
              </div>
            ) : (
              <>
                {/* Hero story */}
                {filtered.length > 0 && (
                  <div style={{ marginBottom:20 }}>
                    <HeroCard item={filtered[0]} onRepost={setRepostItem}/>
                  </div>
                )}
                {/* 2-col grid for rest */}
                {filtered.length > 1 && (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                      <div style={{ width:4, height:20, background:'#1a73e8', borderRadius:2 }}/>
                      <h2 style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>{t('latestUpdates')}</h2>
                    </div>
                    <div className="nt-main-grid" style={{ marginBottom:20 }}>
                      {filtered.slice(1, 9).map(item => <GridCard key={item.id} item={item}/>)}
                    </div>
                  </>
                )}
                {/* More in 3-col */}
                {filtered.length > 9 && (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                      <div style={{ width:4, height:20, background:'#9334e6', borderRadius:2 }}/>
                      <h2 style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>More Stories</h2>
                    </div>
                    <div className="nt-main-grid-3">
                      {filtered.slice(9).map(item => <GridCard key={item.id} item={item}/>)}
                    </div>
                  </>
                )}
                {/* Load more sentinel */}
                <div ref={sentinelRef} style={{ height:60, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {loadingMore && <i className="fas fa-spinner fa-spin" style={{ color:'var(--muted)', fontSize:20 }}/>}
                </div>
              </>
            )}
          </div>

          {/* Right panel */}
          <div className="nt-desktop-right-panel">
            {/* Trending / top articles */}
            <div className="nt-widget">
              <div className="nt-widget-title">Trending Now</div>
              {filtered.slice(0, 6).map((item, idx) => (
                <div key={item.id} className="nt-trend-item" onClick={() => navigate(`/news/${item.id}`)}>
                  <span className="nt-trend-num">#{idx + 1}</span>
                  <span className="nt-trend-text">{item.title}</span>
                  {item.image && <img src={item.image} className="nt-trend-img" alt="" onError={e => e.target.style.display='none'}/>}
                </div>
              ))}
            </div>

            {/* Switch to Socialgati */}
            <div className="nt-widget" style={{ textAlign:'center' }}>
              <i className="fas fa-bolt" style={{ fontSize:24, color:'#1a73e8', marginBottom:8, display:'block' }}/>
              <p style={{ fontSize:14, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>Socialgati Community</p>
              <p style={{ fontSize:12, color:'var(--muted)', marginBottom:12, lineHeight:1.5 }}>Discuss the news. Post your thoughts.</p>
              <button onClick={() => navigate('/')} style={{ width:'100%', padding:'9px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Open Socialgati
              </button>
            </div>

            {/* Category quick links */}
            <div className="nt-widget">
              <div className="nt-widget-title">Browse Categories</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {cats.filter(c => c !== 'All').map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    style={{ padding:'5px 12px', borderRadius:99, background: cat===c ? '#1a73e820' : 'var(--surface2)', color: cat===c ? '#1a73e8' : 'var(--muted)', border: `1px solid ${cat===c ? '#1a73e8' : 'var(--border)'}`, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -- MOBILE layout -- */}
      <div className="nt-mobile-only">
        <div className="main-wrapper" style={{ paddingBottom:80 }}>
          {showSearch && (
            <div style={{ padding:'10px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)', position:'sticky', top:56, zIndex:50 }}>
              <div style={{ position:'relative' }}>
                <i className="fas fa-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', fontSize:14, pointerEvents:'none' }}/>
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search news, topics..."
                  style={{ width:'100%', padding:'10px 36px', background:'var(--surface2)', border:'none', borderRadius:10, fontSize:14, outline:'none', color:'var(--ink)' }}/>
                {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', background:'none', border:'none', cursor:'pointer', padding:4 }}><i className="fas fa-times-circle"/></button>}
              </div>
            </div>
          )}

          <div className="cat-bar" style={{ position:'sticky', top: showSearch ? 98 : 56, zIndex:49 }}>
            {cats.map(c => (
              <button key={c} className={`cat-btn ${cat===c?'active':''}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ background:'var(--bg)' }}>
              <HeroSkeleton/>
              <div style={{ padding:'0 16px' }}>{Array.from({length:4}).map((_,i) => <SmallSkeleton key={i}/>)}</div>
            </div>
          ) : error ? (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <i className="fas fa-exclamation-circle" style={{ fontSize:36, color:'#ea4335', marginBottom:12, display:'block' }}/>
              <p style={{ fontWeight:600, marginBottom:8, color:'var(--ink)' }}>Could not load news</p>
              <p style={{ fontSize:12, color:'var(--muted)', marginBottom:16 }}>{error}</p>
              <button onClick={loadInitial} style={{ padding:'10px 24px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>{"\u21ba"} Retry</button>
            </div>
          ) : search.trim() ? (
            <div style={{ padding:'8px 16px', background:'var(--bg)' }}>
              <p style={{ fontSize:12, color:'var(--muted)', padding:'8px 0', fontWeight:500 }}>{filtered.length} results for "{search}"</p>
              {filtered.length === 0
                ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}><i className="fas fa-search" style={{ fontSize:36, display:'block', marginBottom:12, opacity:.3 }}/><p>No results found</p></div>
                : filtered.map(item => <CompactCard key={item.id} item={item} onRepost={setRepostItem}/>)
              }
            </div>
          ) : (
            <NewsLayout
              items={filtered} cat={cat}
              onRepost={setRepostItem} onSeeAll={c => setCat(c)}
              sentinelRef={sentinelRef} loadingMore={loadingMore}
              hasMore={currentHasMore} onLoadMore={loadMore}
              totalLoaded={currentTotal}
            />
          )}
        </div>
      </div>

      <RepostModal item={repostItem} onClose={() => setRepostItem(null)} onConfirm={handleRepost} reposting={reposting}/>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <BottomNav/>
    </>
  )
}
