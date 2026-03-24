import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, query, limit, addDoc, serverTimestamp, where, getDoc, doc, getDocs as _getDocs } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../utils'
import BottomNav from '../components/BottomNav'
import NewsCard from '../components/NewsCard'
import AuthModal from '../components/AuthModal'

const CATS = ['All','National','World','Business','Technology','Health','Education','Sports','General']

function Skeleton() {
  return (
    <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:'1px solid #e0e0e0' }}>
      <div className="skeleton" style={{ width:'100%', height:180 }}/>
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
        <div className="skeleton" style={{ height:10, width:'40%' }}/>
        <div className="skeleton" style={{ height:16, width:'90%' }}/>
        <div className="skeleton" style={{ height:13, width:'70%' }}/>
      </div>
    </div>
  )
}

export default function NewsTally() {
  const { user, userData } = useAuth()
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
      if (snap.empty) { setError('No news available yet.'); return }
      const items = snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(n=>n.title)
        .sort((a,b) => new Date(b.pubDate||b.fetchedAt||b.savedAt||0) - new Date(a.pubDate||a.fetchedAt||a.savedAt||0))
      setAllNews(items); setFiltered(items)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadNews() }, [loadNews])

  useEffect(() => {
    let r = allNews
    if (cat !== 'All') r = r.filter(n => n.category === cat)
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(n => n.title?.toLowerCase().includes(q)||n.description?.toLowerCase().includes(q)) }
    setFiltered(r)
  }, [cat, search, allNews])

  const handleRepost = async (item) => {
    if (!user) return setShowAuth(true)
    setReposting(true)
    try {
      // Check duplicate
      const dup = await getDocs(query(collection(db,'artifacts',APP_ID,'public','data','reposts'), where('userId','==',user.uid), where('headline','==',item.title), where('type','==','repost'), limit(1)))
      if (!dup.empty) { showToast('Already reposted!'); setRepostItem(null); return }
      const uSnap = await getDoc(doc(db,'users',user.uid)).catch(()=>null)
      const uData = uSnap?.data() || {}
      await addDoc(collection(db,'artifacts',APP_ID,'public','data','reposts'), {
        userId: user.uid,
        username: uData.username || user.displayName || 'User',
        userAvatar: user.photoURL || '',
        image: item.image || '',
        headline: item.title,
        newsUrl: item.url || '',
        newsSource: item.source || '',
        newsCategory: item.category || '',
        newsId: String(item.id||''),
        likes: [], commentsCount: 0,
        timestamp: serverTimestamp(), type: 'repost'
      })
      showToast('✅ Reposted to Socialgati!')
      setRepostItem(null)
    } catch(e) { showToast('Repost failed') }
    finally { setReposting(false) }
  }

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="NewsTally"/>
          <span className="logo-text">NewsTally</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={()=>setShowSearch(s=>!s)}>
            <i className="fas fa-magnifying-glass"/>
          </button>
          {user
            ? <img src={user.photoURL||`https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff`} style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', cursor:'pointer' }} alt=""/>
            : <button className="btn-signin" onClick={()=>setShowAuth(true)}>Sign In</button>
          }
        </div>
      </header>

      <div className="main-wrapper">
        {showSearch && (
          <div style={{ padding:'10px 16px', background:'#fff', borderBottom:'1px solid #e0e0e0' }}>
            <div style={{ position:'relative' }}>
              <i className="fas fa-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9aa0a6', fontSize:14, pointerEvents:'none' }}/>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search news..."
                style={{ width:'100%', padding:'10px 36px', background:'#f1f3f4', border:'none', borderRadius:10, fontSize:14, outline:'none', color:'#202124' }}/>
              {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#9aa0a6' }}><i className="fas fa-times"/></button>}
            </div>
          </div>
        )}

        <div className="cat-bar">
          {CATS.map(c => <button key={c} className={`cat-btn ${cat===c?'active':''}`} onClick={()=>setCat(c)}>{c}</button>)}
        </div>

        <div style={{ padding:'0 16px 80px', display:'flex', flexDirection:'column', gap:16 }}>
          {loading ? Array.from({length:5}).map((_,i)=><Skeleton key={i}/>) :
           error ? (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <i className="fas fa-exclamation-circle" style={{ fontSize:36, color:'#ea4335', marginBottom:12, display:'block' }}/>
              <p style={{ fontWeight:600, marginBottom:8 }}>Could not load news</p>
              <p style={{ fontSize:12, color:'#9aa0a6', marginBottom:16 }}>{error}</p>
              <button onClick={loadNews} style={{ padding:'10px 24px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>↺ Retry</button>
            </div>
           ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'#9aa0a6' }}>
              <i className="fas fa-newspaper" style={{ fontSize:40, marginBottom:12, display:'block', opacity:.4 }}/>
              <p style={{ fontWeight:600, marginBottom:6 }}>No news found</p>
            </div>
           ) : filtered.map((item,i) => (
            <NewsCard key={item.id} item={item} featured={i===0} onRepost={setRepostItem}/>
           ))}
        </div>
      </div>

      {/* Repost confirm modal */}
      {repostItem && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setRepostItem(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Repost to Socialgati?</span>
              <button className="icon-btn" onClick={()=>setRepostItem(null)}><i className="fas fa-times"/></button>
            </div>
            <div style={{ display:'flex', gap:12, marginBottom:20 }}>
              {repostItem.image && <img src={repostItem.image} style={{ width:60, height:60, borderRadius:8, objectFit:'cover', flexShrink:0 }} alt=""/>}
              <div>
                <div style={{ fontSize:12, color:'#1a73e8', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{repostItem.category}</div>
                <div style={{ fontSize:14, fontWeight:600, color:'#202124', lineHeight:1.4 }}>{repostItem.title}</div>
                <div style={{ fontSize:12, color:'#9aa0a6', marginTop:4 }}>{repostItem.source}</div>
              </div>
            </div>
            <button onClick={()=>handleRepost(repostItem)} disabled={reposting}
              style={{ width:'100%', padding:13, background:'#1a73e8', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer' }}>
              {reposting ? <i className="fas fa-spinner fa-spin"/> : '↺ Repost to Community'}
            </button>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={()=>setShowAuth(false)}/>}
      <BottomNav/>
    </>
  )
}
