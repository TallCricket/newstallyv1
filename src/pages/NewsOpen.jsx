import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { doc, getDoc, collection, query, limit, getDocs, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { timeAgo, catIcon, showToast } from '../utils'
import NewsCard from '../components/NewsCard'
import BottomNav from '../components/BottomNav'

// ===== SAVE/BOOKMARK helpers =====
function getSavedIds() {
  try { return JSON.parse(localStorage.getItem('nt_saved_news') || '[]') } catch { return [] }
}
function setSavedIds(ids) {
  localStorage.setItem('nt_saved_news', JSON.stringify(ids))
}

// ===== READING HISTORY helper =====
function saveToHistory(item) {
  try {
    const history = JSON.parse(localStorage.getItem('nt_history') || '[]')
    const idx = history.findIndex(h => h.id === item.id)
    if (idx > -1) history.splice(idx, 1)
    history.unshift({ id: item.id, title: item.title, image: item.image, category: item.category, ts: Date.now() })
    localStorage.setItem('nt_history', JSON.stringify(history.slice(0, 20)))
  } catch {}
}

export default function NewsOpen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [readPct, setReadPct] = useState(0)
  const articleRef = useRef(null)

  // ===== Reading Progress Bar =====
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.body.scrollHeight - window.innerHeight
      if (docHeight > 0) setReadPct(Math.min(100, (scrollTop / docHeight) * 100))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ===== Fetch Article =====
  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const snap = await getDoc(doc(db, 'news', id))
        if (snap.exists()) {
          const d = { id: snap.id, ...snap.data() }
          setItem(d)
          // Check if saved
          setSaved(getSavedIds().includes(snap.id))
          // Save to reading history
          saveToHistory(d)

          // Load related by same category first, then fallback
          let rel = []
          if (d.category) {
            try {
              const catSnap = await getDocs(
                query(collection(db, 'news'), where('category', '==', d.category), orderBy('savedAt', 'desc'), limit(8))
              )
              rel = catSnap.docs.map(dc => ({ id: dc.id, ...dc.data() })).filter(n => n.id !== id && n.title)
            } catch {}
          }
          // Fallback: latest news if not enough related
          if (rel.length < 3) {
            const fallSnap = await getDocs(query(collection(db, 'news'), limit(12)))
            const fallback = fallSnap.docs.map(dc => ({ id: dc.id, ...dc.data() })).filter(n => n.id !== id && n.title)
            // Merge, deduplicate
            const relIds = new Set(rel.map(r => r.id))
            rel = [...rel, ...fallback.filter(n => !relIds.has(n.id))].slice(0, 5)
          }
          setRelated(rel.slice(0, 5))
        }
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
    window.scrollTo(0, 0)
  }, [id])

  // ===== Save / Bookmark =====
  const toggleSave = () => {
    const ids = getSavedIds()
    if (saved) {
      setSavedIds(ids.filter(i => i !== id))
      setSaved(false)
      showToast('Removed from saved')
    } else {
      setSavedIds([id, ...ids])
      setSaved(true)
      showToast('🔖 Saved!')
    }
  }

  // ===== Share =====
  const shareUrl = () => `${window.location.origin}/news/${id}`

  const shareWA = () => {
    if (!item) return
    const u = shareUrl()
    const desc = (item.description || '').substring(0, 120)
    window.open(`https://wa.me/?text=${encodeURIComponent(`📰 *${item.title}*\n\n${desc}...\n\n🔗 ${u}\n\n📲 *NewsTally*`)}`, '_blank')
  }
  const shareTW = () => {
    if (!item) return
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('📰 ' + item.title)}&url=${encodeURIComponent(shareUrl())}&via=newstallyofficial`, '_blank')
  }
  const shareTG = () => {
    if (!item) return
    const u = shareUrl()
    const desc = (item.description || '').substring(0, 100)
    window.open(`https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(`📰 ${item.title}\n\n${desc}...`)}`, '_blank')
  }
  const shareCopy = () => {
    const u = shareUrl()
    navigator.clipboard?.writeText(u).then(() => showToast('🔗 Link copied!')).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = u; ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy')
      document.body.removeChild(ta); showToast('🔗 Link copied!')
    })
  }
  const handleNativeShare = () => {
    if (navigator.share && item) {
      navigator.share({ title: item.title, url: shareUrl() })
    } else {
      setShowShare(s => !s)
    }
  }

  // ===== Calc read time =====
  const readTime = item ? Math.max(1, Math.ceil(((item.title || '').length + (item.description || '').length) / 200)) : 1

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize:32, color:'#1a73e8' }}/>
    </div>
  )

  if (!item) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', gap:16, padding:20 }}>
      <i className="fas fa-newspaper" style={{ fontSize:48, color:'#e0e0e0' }}/>
      <p style={{ fontWeight:600, color:'#606060' }}>Article not found</p>
      <button onClick={()=>navigate('/news')} style={{ padding:'10px 24px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>← Back to News</button>
    </div>
  )

  return (
    <>
      {/* ===== READING PROGRESS BAR ===== */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:3, background:'#e8eaed', zIndex:201 }}>
        <div style={{ height:'100%', width:`${readPct}%`, background:'linear-gradient(90deg,#1a73e8,#9334e6)', transition:'width .1s', borderRadius:2 }}/>
      </div>

      <div style={{ maxWidth:720, margin:'0 auto', minHeight:'100dvh', background:'#fff', paddingBottom:80 }}>

        {/* ===== STICKY HEADER ===== */}
        <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #f0f0f0', position:'sticky', top:0, background:'rgba(255,255,255,.97)', backdropFilter:'blur(20px)', zIndex:100 }}>
          <button onClick={()=>navigate(-1)} className="page-back-btn"><i className="fas fa-arrow-left"/></button>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, overflow:'hidden', cursor:'pointer' }} onClick={()=>navigate('/news')}>
            <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="NewsTally" style={{ width:26, height:26, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>
            <span style={{ fontSize:16, fontWeight:700, color:'#1a73e8', letterSpacing:'-.3px' }}>NewsTally</span>
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            {/* Save button in header */}
            <button className="icon-btn" onClick={toggleSave} title={saved ? 'Remove from saved' : 'Save article'}>
              <i className={saved ? 'fas fa-bookmark' : 'far fa-bookmark'} style={{ color: saved ? '#1a73e8' : undefined }}/>
            </button>
            {/* Share button in header */}
            <button className="icon-btn" onClick={handleNativeShare} title="Share">
              <i className="fas fa-share-alt"/>
            </button>
          </div>
        </div>

        {/* ===== HERO IMAGE ===== */}
        {item.image && (
          <div style={{ width:'100%', aspectRatio:'16/9', overflow:'hidden', background:'#f1f3f4' }}>
            <img src={item.image} alt={item.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={e=>e.target.style.display='none'}/>
          </div>
        )}

        <div style={{ padding:'20px 16px 0' }}>

          {/* ===== CATEGORY + READ TIME ===== */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:14 }}>
            <span style={{ background:'#e8f0fe', color:'#1a73e8', fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:99, textTransform:'uppercase', letterSpacing:'.07em', display:'flex', alignItems:'center', gap:5 }}>
              <i className="fas fa-tag" style={{ fontSize:10 }}/> {item.category || 'News'}
            </span>
            <span style={{ fontSize:12, color:'#9aa0a6', display:'flex', alignItems:'center', gap:4 }}>
              <i className="far fa-clock" style={{ fontSize:11 }}/> {readTime} min read
            </span>
          </div>

          {/* ===== TITLE ===== */}
          <h1 style={{ fontSize:'clamp(20px,4.5vw,28px)', fontWeight:700, lineHeight:1.4, color:'#0a0a14', letterSpacing:'-.3px', marginBottom:16 }}>
            {item.title}
          </h1>

          {/* ===== SOURCE BAR with Save & Share ===== */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'#f8f9fa', borderRadius:10, borderLeft:'3px solid #1a73e8', marginBottom:20, gap:10, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#202124' }}>{item.source || 'NewsTally'}</div>
              <div style={{ fontSize:11, color:'#9aa0a6', marginTop:2 }}>{timeAgo(item.date || item.pubDate)}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={toggleSave}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, background: saved ? '#e8f0fe' : '#fff', border: saved ? '1.5px solid #aecbfa' : '1.5px solid #e8eaed', fontSize:12, fontWeight:600, color: saved ? '#1a73e8' : '#3c4043', cursor:'pointer', transition:'all .15s' }}>
                <i className={saved ? 'fas fa-bookmark' : 'far fa-bookmark'}/> {saved ? 'Saved' : 'Save'}
              </button>
              <button onClick={() => setShowShare(s => !s)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, background:'#fff', border:'1.5px solid #e8eaed', fontSize:12, fontWeight:600, color:'#3c4043', cursor:'pointer', transition:'all .15s' }}>
                <i className="fas fa-share-alt"/> Share
              </button>
            </div>
          </div>

          {/* ===== SHARE PANEL ===== */}
          {showShare && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', paddingBottom:16, marginBottom:4, borderBottom:'1px solid #e8eaed' }}>
              <button onClick={shareWA} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:99, background:'#25d366', color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                <i className="fab fa-whatsapp"/> WhatsApp
              </button>
              <button onClick={shareTW} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:99, background:'#000', color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                <i className="fab fa-x-twitter"/> X
              </button>
              <button onClick={shareTG} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:99, background:'#0088cc', color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                <i className="fab fa-telegram"/> Telegram
              </button>
              <button onClick={shareCopy} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:99, background:'#f1f3f4', color:'#3c4043', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                <i className="fas fa-link"/> Copy
              </button>
            </div>
          )}

          {/* ===== DESCRIPTION / ARTICLE BODY ===== */}
          {item.description ? (
            <div ref={articleRef} style={{ fontSize:16, lineHeight:1.85, color:'#3c4043', marginBottom:24 }}>
              {item.description.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5).map((s, i) => (
                <p key={i} style={{ marginBottom:14 }}>{s.trim()}</p>
              ))}
            </div>
          ) : (
            <div style={{ padding:28, textAlign:'center', background:'#f8f9fa', borderRadius:12, marginBottom:20 }}>
              <i className="fas fa-newspaper" style={{ fontSize:28, color:'#dadce0', display:'block', marginBottom:10 }}/>
              <p style={{ fontSize:14, color:'#9aa0a6' }}>Full article not available in feed.</p>
            </div>
          )}

          {/* ===== READ FULL ARTICLE BUTTON ===== */}
          {item.url && item.url !== '#' && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:13, background:'#1a73e8', color:'#fff', borderRadius:10, fontSize:15, fontWeight:700, marginBottom:20, textDecoration:'none', transition:'all .2s' }}
              onMouseOver={e=>e.currentTarget.style.background='#1557b0'}
              onMouseOut={e=>e.currentTarget.style.background='#1a73e8'}>
              <i className="fas fa-external-link-alt"/> Read Full Article on {item.source || 'Source'}
            </a>
          )}

          {/* ===== TAGS (Category + Source) ===== */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20, alignItems:'center', paddingTop:12, borderTop:'1px solid #f1f3f4' }}>
            {item.category && (
              <span style={{ fontSize:12, fontWeight:600, color:'#1a73e8', background:'#e8f0fe', padding:'4px 12px', borderRadius:99, cursor:'pointer' }}>
                #{item.category}
              </span>
            )}
            {item.source && (
              <span style={{ fontSize:12, color:'#5f6368', background:'#f1f3f4', padding:'4px 12px', borderRadius:99 }}>
                {item.source}
              </span>
            )}
          </div>

          {/* ===== POWERED BY ===== */}
          <div style={{ textAlign:'center', padding:'20px 0', marginTop:8 }}>
            <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#f0ebff', padding:'10px 20px', borderRadius:99, fontSize:13, fontWeight:700, color:'#9334e6', textDecoration:'none' }}>
              <i className="fas fa-bolt"/> Powered by Socialgati
            </a>
          </div>
        </div>

        {/* ===== RELATED ARTICLES ===== */}
        {related.length > 0 && (
          <div style={{ padding:'0 16px 20px' }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#202124', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:4, height:20, background:'#1a73e8', borderRadius:2, display:'inline-block' }}/>
              More like this
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {related.map(r => (
                <RelatedCard key={r.id} item={r} onNavigate={() => navigate(`/news/${r.id}`)} />
              ))}
            </div>
          </div>
        )}

      </div>
      <BottomNav/>
    </>
  )
}

// ===== Related Card (horizontal layout like HTML version) =====
function RelatedCard({ item, onNavigate }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div onClick={onNavigate} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid #f1f3f4', cursor:'pointer', transition:'opacity .15s' }}
      onMouseOver={e=>e.currentTarget.style.opacity='.75'}
      onMouseOut={e=>e.currentTarget.style.opacity='1'}>
      <img
        src={imgErr ? 'https://placehold.co/80x60/e8f0fe/1a73e8?text=NT' : (item.image || 'https://placehold.co/80x60/e8f0fe/1a73e8?text=NT')}
        alt={item.title}
        loading="lazy"
        onError={() => setImgErr(true)}
        style={{ width:80, height:60, borderRadius:8, objectFit:'cover', flexShrink:0, background:'#f1f3f4' }}
      />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#1a73e8', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>
          {item.category}
        </div>
        <div style={{ fontSize:13, fontWeight:600, color:'#202124', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {item.title}
        </div>
        <div style={{ fontSize:11, color:'#9aa0a6', marginTop:4 }}>
          {item.source} · {timeAgo(item.date)}
        </div>
      </div>
    </div>
  )
}
