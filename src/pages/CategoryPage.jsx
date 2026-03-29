/**
 * CategoryPage \u2014 /news/category/:cat
 * Shows news for a specific category (or "all") with the exact same
 * Hero \u2192 Latest Updates \u2192 Grid \u2192 Sections layout as the home feed.
 * Categories are dynamic: whatever is in Firestore shows up.
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { collection, getDocs, query, limit, where, orderBy, startAfter, getDoc, doc, addDoc, updateDoc, arrayUnion, increment as fbIncrement, serverTimestamp } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo, catIcon } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useNavigate, useParams, Link } from 'react-router-dom'

const PAGE_SIZE = 24
const CAT_COLORS = {
  National:'#e53935', World:'#1a73e8', Business:'#34a853',
  Technology:'#9334e6', Health:'#f4a261', Education:'#0077b6',
  Sports:'#ff6d00', General:'#546e7a', Entertainment:'#ad1457',
  Cricket:'#e53935', Politics:'#1a73e8', Science:'#00897b',
  Environment:'#43a047', Culture:'#8e24aa'
}
const accent = (cat) => CAT_COLORS[cat] || '#1a73e8'

function getItemDate(n) {
  const raw = n.pubDate || n.fetchedAt || n.savedAt || n.date || ''
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return isNaN(t) ? 0 : t
}
const sortByDate = items => [...items].sort((a, b) => getItemDate(b) - getItemDate(a))

// \u2500\u2500\u2500 Skeletons \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function HeroSkeleton() {
  return (
    <div style={{ margin:'16px', borderRadius:16, overflow:'hidden', background:'var(--surface)', border:'1px solid var(--border)' }}>
      <div className="skeleton" style={{ height:200 }}/>
      <div style={{ padding:16 }}>
        <div className="skeleton" style={{ height:10, width:'30%', marginBottom:10, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:20, width:'90%', marginBottom:8, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:20, width:'70%', borderRadius:4 }}/>
      </div>
    </div>
  )
}

// \u2500\u2500\u2500 Shared card components \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function HeroCard({ item, onRepost }) {
  const navigate = useNavigate()
  const [imgErr, setImgErr] = useState(false)
  const ac = accent(item.category)
  return (
    <div style={{ margin:'12px 16px', borderRadius:16, overflow:'hidden', background:'var(--surface)', boxShadow:'var(--shadow-md)', cursor:'pointer' }}
      onClick={() => navigate(`/news/${item.id}`)}>
      {item.image && !imgErr ? (
        <div style={{ position:'relative', height:200, overflow:'hidden', background:'var(--surface2)' }}>
          <img src={item.image} alt={item.title} loading="eager" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={() => setImgErr(true)}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.75) 0%,rgba(0,0,0,.1) 60%,transparent 100%)' }}/>
          <div style={{ position:'absolute', top:12, left:12 }}>
            <span style={{ background:ac, color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, textTransform:'uppercase' }}>{item.category}</span>
          </div>
          <div style={{ position:'absolute', bottom:12, left:14, right:14 }}>
            <p style={{ color:'rgba(255,255,255,.75)', fontSize:11, fontWeight:600, marginBottom:4 }}>{item.source} \u00b7 {timeAgo(item.date || item.pubDate)}</p>
            <h2 style={{ color:'#fff', fontSize:18, fontWeight:700, lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</h2>
          </div>
        </div>
      ) : (
        <div style={{ background:`linear-gradient(135deg,${ac}22,${ac}44)`, padding:'24px 20px' }}>
          <span style={{ background:ac, color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, textTransform:'uppercase', display:'inline-block', marginBottom:12 }}>{item.category}</span>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--ink)', lineHeight:1.4, marginBottom:8 }}>{item.title}</h2>
          <p style={{ fontSize:12, color:'var(--muted)' }}>{item.source} \u00b7 {timeAgo(item.date || item.pubDate)}</p>
        </div>
      )}
      <div style={{ padding:'12px 16px' }}>
        {item.description && <p style={{ fontSize:14, color:'var(--muted)', lineHeight:1.6, marginBottom:12, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.description}</p>}
        <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
          <a href={item.url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 0', background:'#1a73e8', color:'#fff', borderRadius:8, fontSize:13, fontWeight:700, textDecoration:'none' }}>
            <i className="fas fa-external-link-alt" style={{ fontSize:11 }}/> Read Full Story
          </a>
          <button onClick={e => { e.stopPropagation(); onRepost(item) }}
            style={{ padding:'9px 16px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, fontWeight:700, color:'#34a853', background:'var(--surface)', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <i className="fas fa-retweet"/> Repost
          </button>
        </div>
      </div>
    </div>
  )
}

function CompactCard({ item, onRepost }) {
  const navigate = useNavigate()
  const [imgErr, setImgErr] = useState(false)
  const ac = accent(item.category)
  return (
    <div style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border2)', cursor:'pointer' }}
      onClick={() => navigate(`/news/${item.id}`)}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:ac, flexShrink:0 }}/>
          <span style={{ fontSize:10, fontWeight:700, color:ac, textTransform:'uppercase', letterSpacing:'.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.category}</span>
          <span style={{ fontSize:10, color:'var(--muted2)', marginLeft:'auto', flexShrink:0 }}>{timeAgo(item.date || item.pubDate)}</span>
        </div>
        <p style={{ fontSize:14, fontWeight:600, color:'var(--ink)', lineHeight:1.45, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:4 }}>{item.title}</p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <p style={{ fontSize:11, color:'var(--muted2)', fontWeight:500 }}>{item.source}</p>
          {onRepost && (
            <button onClick={e => { e.stopPropagation(); onRepost(item) }}
              style={{ fontSize:11, color:'#34a853', background:'none', border:'none', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:4, padding:'2px 6px', borderRadius:6 }}>
              <i className="fas fa-retweet" style={{ fontSize:11 }}/> Repost
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
  const ac = accent(item.category)
  return (
    <div style={{ background:'var(--surface)', borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', cursor:'pointer' }}
      onClick={() => navigate(`/news/${item.id}`)}>
      {item.image && !imgErr ? (
        <div style={{ height:110, overflow:'hidden', background:'var(--surface2)', position:'relative' }}>
          <img src={item.image} alt="" loading="lazy" onError={() => setImgErr(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', top:6, left:6 }}>
            <span style={{ background:ac, color:'#fff', fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99, textTransform:'uppercase' }}>{item.category}</span>
          </div>
        </div>
      ) : (
        <div style={{ height:60, background:`linear-gradient(135deg,${ac}22,${ac}33)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className={catIcon(item.category)} style={{ fontSize:20, color:ac, opacity:.5 }}/>
        </div>
      )}
      <div style={{ padding:'10px 10px 12px' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', lineHeight:1.4, marginBottom:6, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</p>
        <div style={{ fontSize:10, color:'var(--muted2)', display:'flex', justifyContent:'space-between' }}>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{item.source}</span>
          <span>{timeAgo(item.date || item.pubDate)}</span>
        </div>
      </div>
    </div>
  )
}

// \u2500\u2500\u2500 Repost Modal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function RepostModal({ item, onClose, onConfirm, reposting }) {
  if (!item) return null
  const ac = accent(item.category)
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
            <div style={{ fontSize:11, color:ac, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{item.category}</div>
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

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
export default function CategoryPage() {
  const { cat: catParam } = useParams()         // e.g. "all", "sports", "technology"
  const navigate = useNavigate()
  const { user } = useAuth()

  // Normalise: "all" \u2192 'All', "sports" \u2192 "Sports"
  const cat = catParam === 'all'
    ? 'All'
    : catParam.charAt(0).toUpperCase() + catParam.slice(1).toLowerCase()

  const [items, setItems]           = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]       = useState(true)
  const [error, setError]           = useState('')
  const [repostItem, setRepostItem] = useState(null)
  const [reposting, setReposting]   = useState(false)
  const [showAuth, setShowAuth]     = useState(false)
  const lastDocRef = useRef(null)
  const sentinelRef = useRef(null)

  // \u2500\u2500 Fetch: NO source filter, sorted by fetchedAt/pubDate desc \u2500\u2500
  // KEY FIX: fetch ALL news without source filter, large batch, sort in JS
  const fetchItems = useCallback(async (isFirst = false) => {
    let q
    if (cat === 'All') {
      // Fetch large batch, no orderBy (avoids missing-field issue), sort in JS
      q = isFirst
        ? query(collection(db, 'news'), limit(PAGE_SIZE * 2))
        : lastDocRef.current
          ? query(collection(db, 'news'), startAfter(lastDocRef.current), limit(PAGE_SIZE * 2))
          : null
    } else {
      q = isFirst
        ? query(collection(db, 'news'), where('category', '==', cat), limit(PAGE_SIZE * 2))
        : lastDocRef.current
          ? query(collection(db, 'news'), where('category', '==', cat), startAfter(lastDocRef.current), limit(PAGE_SIZE * 2))
          : null
    }
    if (!q) return []
    const snap = await getDocs(q)
    if (snap.empty) { setHasMore(false); return [] }
    if (snap.docs.length < PAGE_SIZE) setHasMore(false)
    lastDocRef.current = snap.docs[snap.docs.length - 1]
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.title)
  }, [cat])

  // \u2500\u2500 Fetch all distinct categories for the sidebar \u2500\u2500
  const fetchCategories = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'news'), limit(200)))
      const cats = new Set(snap.docs.map(d => d.data().category).filter(Boolean))
      setAllCategories(['All', ...Array.from(cats).sort()])
    } catch { setAllCategories(['All','National','World','Business','Technology','Health','Education','Sports','General']) }
  }, [])

  const loadInitial = useCallback(async () => {
    setLoading(true); setError(''); setHasMore(true); lastDocRef.current = null
    try {
      const data = await fetchItems(true)
      setItems(sortByDate(data))
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [fetchItems])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const data = await fetchItems(false)
      if (data.length) {
        setItems(prev => {
          const ids = new Set(prev.map(n => n.id))
          return sortByDate([...prev, ...data.filter(n => !ids.has(n.id))])
        })
      }
    } catch(e) { console.error(e) }
    finally { setLoadingMore(false) }
  }, [loadingMore, hasMore, fetchItems])

  useEffect(() => { loadInitial() }, [loadInitial])
  useEffect(() => { fetchCategories() }, [fetchCategories])

  useEffect(() => {
    const s = sentinelRef.current
    if (!s) return
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore() }, { threshold:0.1, rootMargin:'300px' })
    obs.observe(s)
    return () => obs.disconnect()
  }, [loadMore])

  // \u2500\u2500 Repost \u2500\u2500
  const handleRepost = async (item) => {
    if (!user) return setShowAuth(true)
    setReposting(true)
    try {
      const uSnap = await getDoc(doc(db,'users',user.uid)).catch(() => null)
      const uData = uSnap?.data() || {}
      const myInfo = { uid:user.uid, username:uData.username||user.displayName||'User', avatar:user.photoURL||'', timestamp:new Date().toISOString() }
      const { getDocs: gd2, query: q2, collection: col2, where: w2, limit: l2 } = await import('firebase/firestore')
      const myR = await gd2(q2(col2(db,'artifacts',APP_ID,'public','data','reposts'), w2('newsId','==',String(item.id||item.title)), w2('repostedBy','array-contains',user.uid), l2(1))).catch(() => ({ empty:true }))
      if (!myR.empty) { showToast('Already reposted!'); setRepostItem(null); return }
      const ex = await gd2(q2(col2(db,'artifacts',APP_ID,'public','data','reposts'), w2('newsId','==',String(item.id||item.title)), w2('type','==','repost'), l2(1)))
      if (!ex.empty) {
        await updateDoc(ex.docs[0].ref, { repostCount:fbIncrement(1), repostedBy:arrayUnion(user.uid), repostedUsers:arrayUnion(myInfo) })
        showToast('\u2705 Reposted!')
      } else {
        await addDoc(col2(db,'artifacts',APP_ID,'public','data','reposts'), { userId:user.uid, username:myInfo.username, userAvatar:myInfo.avatar, image:item.image||'', headline:item.title, newsUrl:item.url||'', newsSource:item.source||'', newsCategory:item.category||'', newsId:String(item.id||item.title), likes:[], commentsCount:0, repostCount:1, repostedBy:[user.uid], repostedUsers:[myInfo], timestamp:serverTimestamp(), type:'repost' })
        showToast('\u2705 Reposted to Socialgati!')
      }
      setRepostItem(null)
    } catch(e) { console.error(e); showToast('Repost failed') }
    finally { setReposting(false) }
  }

  const ac = accent(cat)

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo" onClick={() => navigate('/news')} style={{ cursor:'pointer' }}>
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="NewsTally"/>
          <span className="logo-text">NewsTally</span>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate(-1)} className="icon-btn"><i className="fas fa-arrow-left"/></button>
        </div>
      </header>

      <div className="main-wrapper" style={{ paddingBottom:80 }}>

        {/* \u2500\u2500 Category scroll bar \u2500\u2500 */}
        <div className="cat-bar" style={{ position:'sticky', top:56, zIndex:49 }}>
          {allCategories.map(c => (
            <Link key={c}
              to={`/news/category/${c.toLowerCase()}`}
              style={{ textDecoration:'none' }}
              replace>
              <button className={`cat-btn ${cat === c ? 'active' : ''}`}
                style={{ background: cat === c ? ac : undefined, borderColor: cat === c ? ac : undefined }}>
                {c}
              </button>
            </Link>
          ))}
        </div>

        {/* \u2500\u2500 Category header \u2500\u2500 */}
        {cat !== 'All' && (
          <div style={{ padding:'12px 16px 4px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:4, height:22, background:ac, borderRadius:2 }}/>
            <h1 style={{ fontSize:20, fontWeight:800, color:'var(--ink)' }}>{cat}</h1>
            {!loading && <span style={{ fontSize:13, color:'var(--muted)', fontWeight:500 }}>{items.length}+ articles</span>}
          </div>
        )}

        {/* \u2500\u2500 Content \u2500\u2500 */}
        {loading ? (
          <div>
            <HeroSkeleton/>
            <div style={{ padding:'0 16px' }}>
              {Array.from({length:4}).map((_,i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border2)' }}>
                  <div style={{ flex:1 }}>
                    <div className="skeleton" style={{ height:10, width:'35%', marginBottom:8, borderRadius:4 }}/>
                    <div className="skeleton" style={{ height:14, width:'100%', marginBottom:6, borderRadius:4 }}/>
                    <div className="skeleton" style={{ height:14, width:'80%', borderRadius:4 }}/>
                  </div>
                  <div className="skeleton" style={{ width:80, height:60, borderRadius:8, flexShrink:0 }}/>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <i className="fas fa-exclamation-circle" style={{ fontSize:36, color:'#ea4335', marginBottom:12, display:'block' }}/>
            <p style={{ color:'var(--ink)', fontWeight:600, marginBottom:8 }}>Could not load news</p>
            <button onClick={loadInitial} style={{ padding:'10px 24px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>\u21ba Retry</button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
            <i className="fas fa-newspaper" style={{ fontSize:40, marginBottom:12, display:'block', opacity:.3 }}/>
            <p style={{ fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No news in {cat}</p>
          </div>
        ) : (
          <div style={{ background:'var(--bg)' }}>
            {/* Hero \u2014 most recent */}
            <HeroCard item={items[0]} onRepost={setRepostItem}/>

            {/* Latest Updates \u2014 items 1\u20134 */}
            {items.length > 1 && (
              <div style={{ margin:'4px 16px 16px', background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
                <div style={{ background:ac, padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,.5)', animation:'pulse 1s infinite' }}/>
                  <span style={{ color:'#fff', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em' }}>Latest {cat === 'All' ? '' : cat} Updates</span>
                </div>
                <div style={{ padding:'0 14px' }}>
                  {items.slice(1, 5).map(item => <CompactCard key={item.id} item={item} onRepost={setRepostItem}/>)}
                </div>
              </div>
            )}

            {/* 2-col grid \u2014 items 5\u201310 */}
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

            {/* Remaining as compact list */}
            {items.length > 11 && (
              <div style={{ margin:'8px 16px 0', background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', padding:'4px 14px' }}>
                <div style={{ padding:'10px 0 6px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:4, height:18, background:'#34a853', borderRadius:2 }}/>
                  <h2 style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>More News</h2>
                </div>
                {items.slice(11).map(item => <CompactCard key={item.id} item={item} onRepost={setRepostItem}/>)}
              </div>
            )}

            <div ref={sentinelRef} style={{ height:1 }}/>
            {loadingMore && (
              <div style={{ display:'flex', justifyContent:'center', padding:'20px 0', gap:8, color:'var(--muted)', fontSize:13 }}>
                <i className="fas fa-spinner fa-spin"/><span>Loading more...</span>
              </div>
            )}
            {!loadingMore && hasMore && (
              <div style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}>
                <button onClick={loadMore}
                  style={{ padding:'10px 28px', background:'var(--surface)', border:'1.5px solid #1a73e8', borderRadius:24, fontSize:14, fontWeight:700, color:'#1a73e8', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
                  <i className="fas fa-arrow-down"/> Load More
                </button>
              </div>
            )}
            {!hasMore && items.length > 10 && (
              <p style={{ textAlign:'center', color:'var(--muted)', fontSize:13, padding:'20px 0' }}>All {items.length} articles loaded \u2713</p>
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
