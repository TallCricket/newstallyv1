import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, query, limit, addDoc, serverTimestamp, where, getDoc, doc } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo, catIcon } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useNavigate } from 'react-router-dom'

const CATS = ['All','National','World','Business','Technology','Health','Education','Sports','General']

const CAT_COLORS = {
  National:'#e53935', World:'#1a73e8', Business:'#34a853',
  Technology:'#9334e6', Health:'#f4a261', Education:'#0077b6',
  Sports:'#ff6d00', General:'#546e7a', Entertainment:'#ad1457'
}

// ===== SKELETONS =====
function HeroSkeleton() {
  return (
    <div style={{ margin:'16px', borderRadius:16, overflow:'hidden', background:'#fff', border:'1px solid #e0e0e0' }}>
      <div className="skeleton" style={{ height:220 }}/>
      <div style={{ padding:16 }}>
        <div className="skeleton" style={{ height:10, width:'30%', marginBottom:10, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:20, width:'90%', marginBottom:8, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:20, width:'70%', marginBottom:8, borderRadius:4 }}/>
        <div className="skeleton" style={{ height:13, width:'50%', borderRadius:4 }}/>
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

// ===== HERO CARD (featured top story) =====
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
          {/* Gradient overlay */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.1) 60%, transparent 100%)' }}/>
          {/* Category badge on image */}
          <div style={{ position:'absolute', top:12, left:12 }}>
            <span style={{ background:accent, color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, textTransform:'uppercase', letterSpacing:'.05em' }}>
              {item.category}
            </span>
          </div>
          {/* Source on image */}
          <div style={{ position:'absolute', bottom:12, left:14, right:14 }}>
            <p style={{ color:'rgba(255,255,255,.8)', fontSize:11, fontWeight:600, marginBottom:4 }}>{item.source} · {timeAgo(item.date)}</p>
            <h2 style={{ color:'#fff', fontSize:18, fontWeight:700, lineHeight:1.4,
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {item.title}
            </h2>
          </div>
        </div>
      ) : (
        <div style={{ background:`linear-gradient(135deg, ${accent}22, ${accent}44)`, padding:'28px 20px' }}>
          <span style={{ background:accent, color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, textTransform:'uppercase', display:'inline-block', marginBottom:12 }}>
            {item.category}
          </span>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#202124', lineHeight:1.4, marginBottom:8 }}>{item.title}</h2>
          <p style={{ fontSize:12, color:'#9aa0a6' }}>{item.source} · {timeAgo(item.date)}</p>
        </div>
      )}

      {/* Body */}
      <div style={{ padding:'14px 16px' }}>
        {item.description && (
          <p style={{ fontSize:14, color:'#5f6368', lineHeight:1.6, marginBottom:12,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {item.description}
          </p>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:8 }} onClick={e=>e.stopPropagation()}>
          <a href={item.url} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 0',
              background:'#1a73e8', color:'#fff', borderRadius:8, fontSize:13, fontWeight:700, textDecoration:'none' }}>
            <i className="fas fa-external-link-alt" style={{ fontSize:11 }}/> Read Full Story
          </a>
          <button onClick={e=>{e.stopPropagation();onRepost(item)}}
            style={{ padding:'9px 14px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, fontWeight:600, color:'#5f6368', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <i className="fas fa-retweet" style={{ color:'#34a853' }}/> Share
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== COMPACT CARD (small horizontal) =====
function CompactCard({ item }) {
  const navigate = useNavigate()
  const [imgErr, setImgErr] = useState(false)
  const accent = CAT_COLORS[item.category] || '#1a73e8'

  return (
    <div style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid #f1f3f4', cursor:'pointer' }}
      onClick={() => navigate(`/news/${item.id}`)}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:accent, flexShrink:0 }}/>
          <span style={{ fontSize:10, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:'.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {item.category}
          </span>
          <span style={{ fontSize:10, color:'#9aa0a6', marginLeft:'auto', flexShrink:0 }}>{timeAgo(item.date)}</span>
        </div>
        <p style={{ fontSize:14, fontWeight:600, color:'#202124', lineHeight:1.45,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:4 }}>
          {item.title}
        </p>
        <p style={{ fontSize:11, color:'#9aa0a6', fontWeight:500 }}>{item.source}</p>
      </div>
      {item.image && !imgErr && (
        <img src={item.image} alt="" loading="lazy" onError={()=>setImgErr(true)}
          style={{ width:80, height:60, borderRadius:8, objectFit:'cover', flexShrink:0, background:'#f1f3f4' }}/>
      )}
    </div>
  )
}

// ===== GRID CARD (medium, 2-col) =====
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
          <img src={item.image} alt="" loading="lazy" onError={()=>setImgErr(true)}
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
          <span>{item.source}</span>
          <span>{timeAgo(item.date)}</span>
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
      {/* Section Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:4, height:22, background:accent, borderRadius:2 }}/>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#202124' }}>{title}</h2>
        </div>
        <button onClick={() => onSeeAll && onSeeAll(title)} style={{ fontSize:12, color:accent, fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
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
              onError={e=>e.target.style.display='none'}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 60%)' }}/>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:12 }}>
              <p style={{ color:'#fff', fontSize:15, fontWeight:700, lineHeight:1.4,
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {main.title}
              </p>
              <p style={{ color:'rgba(255,255,255,.7)', fontSize:11, marginTop:4 }}>{main.source} · {timeAgo(main.date)}</p>
            </div>
          </div>
        )}
        {!main.image && (
          <div style={{ padding:'14px 16px' }}>
            <p style={{ fontSize:15, fontWeight:700, color:'#202124', lineHeight:1.4 }}>{main.title}</p>
            <p style={{ fontSize:12, color:'#9aa0a6', marginTop:6 }}>{main.source} · {timeAgo(main.date)}</p>
          </div>
        )}
      </div>

      {/* Remaining stories */}
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
              <p style={{ fontSize:11, color:'#9aa0a6', marginTop:3 }}>{item.source} · {timeAgo(item.date)}</p>
            </div>
            {item.image && (
              <img src={item.image} alt="" loading="lazy" style={{ width:68, height:52, borderRadius:6, objectFit:'cover', flexShrink:0 }}
                onError={e=>e.target.style.display='none'}/>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== MAIN PAGE =====
export default function NewsTally() {
  const { user } = useAuth()
  const [allNews, setAllNews] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [repostItem, setRepostItem] = useState(null)
  const [reposting, setReposting] = useState(false)

  const loadNews = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const snap = await getDocs(query(collection(db, 'news'), limit(200)))
      if (snap.empty) { setError('No news yet. Run syncAllNews in Apps Script.'); return }
      const items = snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(n => n.title)
        .sort((a,b) => {
          const getDate = n => {
            const d = n.pubDate || n.fetchedAt || n.savedAt || n.date || ''
            if (!d) return 0
            const t = new Date(d).getTime()
            return isNaN(t) ? 0 : t
          }
          return getDate(b) - getDate(a)
        })
      setAllNews(items); setFiltered(items)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadNews() }, [loadNews])

  useEffect(() => {
    let r = allNews
    if (cat !== 'All') r = r.filter(n => n.category === cat)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(n => n.title?.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q))
    }
    setFiltered(r)
  }, [cat, search, allNews])

  const handleRepost = async (item) => {
    if (!user) return setShowAuth(true)
    setReposting(true)
    try {
      const dup = await getDocs(query(collection(db,'artifacts',APP_ID,'public','data','reposts'),
        where('userId','==',user.uid), where('headline','==',item.title), where('type','==','repost'), limit(1)))
      if (!dup.empty) { showToast('Already reposted!'); setRepostItem(null); return }
      const uSnap = await getDoc(doc(db,'users',user.uid)).catch(()=>null)
      const uData = uSnap?.data() || {}
      await addDoc(collection(db,'artifacts',APP_ID,'public','data','reposts'), {
        userId: user.uid, username: uData.username || user.displayName || 'User',
        userAvatar: user.photoURL || '', image: item.image || '', headline: item.title,
        newsUrl: item.url || '', newsSource: item.source || '', newsCategory: item.category || '',
        newsId: String(item.id||''), likes: [], commentsCount: 0,
        timestamp: serverTimestamp(), type: 'repost'
      })
      showToast('✅ Reposted to Socialgati!')
      setRepostItem(null)
    } catch(e) { showToast('Repost failed') }
    finally { setReposting(false) }
  }

  // Group by category for sections
  const groupByCategory = (items) => {
    const map = {}
    items.forEach(n => {
      if (!map[n.category]) map[n.category] = []
      map[n.category].push(n)
    })
    return map
  }

  const isFiltering = cat !== 'All' || search.trim()

  return (
    <>
      {/* ===== HEADER ===== */}
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="NewsTally"/>
          <span className="logo-text">NewsTally</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setShowSearch(s=>!s)}>
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

        {/* ===== SEARCH BAR ===== */}
        {showSearch && (
          <div style={{ padding:'10px 16px', background:'#fff', borderBottom:'1px solid #e0e0e0', position:'sticky', top:56, zIndex:50 }}>
            <div style={{ position:'relative' }}>
              <i className="fas fa-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9aa0a6', fontSize:14, pointerEvents:'none' }}/>
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search news, topics..."
                style={{ width:'100%', padding:'10px 36px', background:'#f1f3f4', border:'none', borderRadius:10, fontSize:14, outline:'none', color:'#202124' }}/>
              {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#9aa0a6', background:'none', border:'none', cursor:'pointer', padding:4 }}>
                <i className="fas fa-times-circle"/>
              </button>}
            </div>
          </div>
        )}

        {/* ===== CATEGORY FILTER ===== */}
        <div className="cat-bar" style={{ position:'sticky', top: showSearch ? 98 : 56, zIndex:49, background:'#fff', borderBottom:'1px solid #f0f0f0', paddingTop:10, paddingBottom:10 }}>
          {CATS.map(c => (
            <button key={c} className={`cat-btn ${cat===c?'active':''}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>

        {/* ===== CONTENT ===== */}
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
            <button onClick={loadNews} style={{ padding:'10px 24px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>↺ Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#9aa0a6' }}>
            <i className="fas fa-search" style={{ fontSize:40, marginBottom:12, display:'block', opacity:.4 }}/>
            <p style={{ fontWeight:600, marginBottom:6 }}>No results found</p>
            <p style={{ fontSize:13 }}>Try a different search or category</p>
          </div>
        ) : isFiltering ? (
          // ===== FILTERED VIEW — simple list =====
          <div style={{ padding:'8px 16px' }}>
            <p style={{ fontSize:12, color:'#9aa0a6', padding:'8px 0', fontWeight:500 }}>
              {filtered.length} results {cat !== 'All' ? `in ${cat}` : ''}{search ? ` for "${search}"` : ''}
            </p>
            {filtered.map(item => <CompactCard key={item.id} item={item}/>)}
          </div>
        ) : (
          // ===== HOME VIEW — professional layout =====
          <div>
            {/* Hero — top story */}
            {filtered[0] && <HeroCard item={filtered[0]} onRepost={handleRepost}/>}

            {/* Breaking / Latest strip */}
            {filtered.length > 1 && (
              <div style={{ margin:'4px 16px 16px', background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', overflow:'hidden' }}>
                <div style={{ background:'#1a73e8', padding:'8px 14px' }}>
                  <span style={{ color:'#fff', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em' }}>
                    🔴 Latest Updates
                  </span>
                </div>
                <div style={{ padding:'0 14px' }}>
                  {filtered.slice(1, 5).map((item, i) => (
                    <CompactCard key={item.id} item={item}/>
                  ))}
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

            {/* Category Sections */}
            {(() => {
              const grouped = groupByCategory(filtered.slice(11))
              return Object.entries(grouped)
                .filter(([, items]) => items.length >= 2)
                .slice(0, 5)
                .map(([category, items]) => (
                  <CategorySection
                    key={category}
                    title={category}
                    items={items}
                    accent={CAT_COLORS[category] || '#1a73e8'}
                    onRepost={handleRepost}
                    onSeeAll={(cat) => { setCat(cat); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  />
                ))
            })()}

            {/* Remaining as compact list */}
            {filtered.length > 30 && (
              <div style={{ margin:'8px 16px 0', background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'4px 14px' }}>
                <div style={{ padding:'10px 0 6px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:4, height:18, background:'#34a853', borderRadius:2 }}/>
                  <h2 style={{ fontSize:15, fontWeight:700, color:'#202124' }}>More News</h2>
                </div>
                {filtered.slice(30).map(item => <CompactCard key={item.id} item={item}/>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== REPOST MODAL ===== */}
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
