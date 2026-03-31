import { useEffect, useState, useRef, useCallback } from 'react'
import {
  collection, getDocs, query, limit, orderBy, startAfter, where,
  addDoc, updateDoc, arrayUnion, increment as fbIncrement,
  serverTimestamp, getDoc, doc
} from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'

const CATS      = ['All','National','World','Business','Technology','Sports','Health']
const PAGE_SIZE = 30
const LOAD_AHEAD = 5

const CAT_COLORS = {
  National:'#e53935', World:'#1a73e8', Business:'#00c853',
  Technology:'#aa00ff', Health:'#ff6d00', Sports:'#ff1744',
  Entertainment:'#d500f9', General:'#546e7a'
}

function catIcon(cat) {
  const m = { Sports:'fas fa-futbol', Technology:'fas fa-microchip', Business:'fas fa-chart-line', Health:'fas fa-heart-pulse', National:'fas fa-flag', World:'fas fa-globe', Entertainment:'fas fa-film' }
  return m[cat] || 'fas fa-newspaper'
}

function getItemDate(n) {
  const raw = n.pubDate || n.fetchedAt || n.savedAt || n.date || ''
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return isNaN(t) ? 0 : t
}
function sortByDate(items) { return [...items].sort((a,b) => getItemDate(b) - getItemDate(a)) }

// ── Share Card (hidden, used for html2canvas capture) ─────────────
function ShareCardHidden({ item, cardRef }) {
  const accent = CAT_COLORS[item?.category] || '#1a73e8'
  if (!item) return null
  return (
    <div ref={cardRef} style={{
      position: 'fixed', left: '-9999px', top: 0,
      width: 360, background: '#fff', borderRadius: 20,
      overflow: 'hidden', fontFamily: "'Google Sans', Roboto, sans-serif",
      boxShadow: '0 8px 40px rgba(0,0,0,.25)'
    }}>
      {/* Image */}
      <div style={{ position: 'relative', width: '100%', height: 220, background: '#eee', overflow: 'hidden' }}>
        {item.image
          ? <img src={item.image} alt="" crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
          : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${accent}33,${accent}66)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={catIcon(item.category)} style={{ fontSize: 48, color: accent, opacity: .5 }}/>
            </div>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 60%)' }}/>
        {/* Category badge */}
        <span style={{
          position: 'absolute', top: 14, left: 14,
          background: accent, color: '#fff', fontSize: 11, fontWeight: 800,
          letterSpacing: '.06em', textTransform: 'uppercase',
          padding: '5px 12px', borderRadius: 99
        }}>{item.category}</span>
      </div>
      {/* Body */}
      <div style={{ padding: '18px 20px 16px' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#202124', lineHeight: 1.45, marginBottom: 10,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.title}
        </div>
        {item.description && (
          <div style={{ fontSize: 13, color: '#5f6368', lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.description}
          </div>
        )}
      </div>
      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px 14px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" crossOrigin="anonymous"
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt=""/>
          <div>
            <div style={{ fontSize: 10, color: '#9aa0a6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>READ MORE AT</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#202124' }}>NewsTally</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#9aa0a6', fontWeight: 600 }}>Source</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a73e8' }}>{item.source}</div>
        </div>
      </div>
      {/* Blue stripe */}
      <div style={{ height: 5, background: `linear-gradient(90deg,#1a73e8,${accent})` }}/>
    </div>
  )
}

// ── Share Modal ───────────────────────────────────────────────────
function ShareModal({ item, onClose }) {
  const cardRef   = useRef(null)
  const [saving, setSaving] = useState(false)
  const accent    = CAT_COLORS[item?.category] || '#1a73e8'
  if (!item) return null

  const shareUrl  = item.url && item.url !== '#' ? item.url : `https://newstally.online`
  const shareText = `📰 ${item.title}\n\n${(item.description || '').substring(0, 100)}...\n\n🔗 ${shareUrl}\n\n📲 NewsTally`

  const openUrl = (url) => window.open(url, '_blank', 'noopener')

  const actions = [
    {
      label: 'WhatsApp', icon: 'fab fa-whatsapp', bg: '#25d366',
      fn: () => openUrl(`https://wa.me/?text=${encodeURIComponent(shareText)}`)
    },
    {
      label: 'Twitter', icon: 'fab fa-x-twitter', bg: '#000',
      fn: () => openUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent('📰 '+item.title)}&url=${encodeURIComponent(shareUrl)}`)
    },
    {
      label: 'Telegram', icon: 'fab fa-telegram', bg: '#0088cc',
      fn: () => openUrl(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('📰 '+item.title)}`)
    },
    {
      label: 'Facebook', icon: 'fab fa-facebook', bg: '#1877f2',
      fn: () => openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)
    },
    {
      label: 'Instagram', icon: 'fab fa-instagram', bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
      fn: () => { navigator.clipboard?.writeText(shareUrl); showToast('Link copied! Paste in Instagram bio.') }
    },
    {
      label: 'More', icon: 'fas fa-share-nodes', bg: '#34a853',
      fn: () => {
        if (navigator.share) navigator.share({ title: item.title, text: item.description, url: shareUrl })
        else { navigator.clipboard?.writeText(shareUrl); showToast('🔗 Link copied!') }
      }
    },
    {
      label: 'Copy Link', icon: 'fas fa-link', bg: '#5f6368',
      fn: () => { navigator.clipboard?.writeText(shareUrl); showToast('🔗 Link copied!') }
    },
  ]

  const saveCard = async () => {
    const el = cardRef.current
    if (!el || !window.html2canvas) { showToast('Saving not supported on this device'); return }
    setSaving(true)
    try {
      const canvas = await window.html2canvas(el, {
        useCORS: true, allowTaint: true, scale: 2,
        backgroundColor: '#ffffff', logging: false
      })
      const link = document.createElement('a')
      link.download = `newstally-${item.id || Date.now()}.png`
      link.href = canvas.toDataURL('image/png', 0.95)
      link.click()
      showToast('✅ Card saved!')
    } catch {
      showToast('Could not save card. Try screenshot instead.')
    }
    setSaving(false)
  }

  return (
    <>
      {/* Hidden card for capture */}
      <ShareCardHidden item={item} cardRef={cardRef}/>

      {/* Modal overlay */}
      <div onClick={e => e.target === e.currentTarget && onClose()}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', backdropFilter:'blur(8px)',
          zIndex:600, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
        <div style={{ width:'100%', maxWidth:480, background:'#13131f',
          borderRadius:'24px 24px 0 0', paddingBottom:'calc(20px + env(safe-area-inset-bottom,0px))',
          border:'1px solid rgba(255,255,255,.08)', animation:'slideUp .28s cubic-bezier(.4,0,.2,1)' }}>
          <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

          {/* Handle */}
          <div style={{ width:40, height:4, background:'rgba(255,255,255,.2)', borderRadius:99, margin:'14px auto 0' }}/>

          {/* Card preview */}
          <div style={{ margin:'16px 16px 0', borderRadius:16, overflow:'hidden', background:'#fff',
            boxShadow:'0 8px 32px rgba(0,0,0,.4)' }}>
            {/* Image preview */}
            <div style={{ position:'relative', width:'100%', height:180, overflow:'hidden', background:'#1a1a2e' }}>
              {item.image
                ? <img src={item.image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                    onError={e => e.target.style.display='none'}/>
                : <div style={{ width:'100%', height:'100%', background:`linear-gradient(135deg,${accent}33,${accent}55)`,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className={catIcon(item.category)} style={{ fontSize:40, color:accent, opacity:.5 }}/>
                  </div>
              }
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 50%)' }}/>
              <span style={{ position:'absolute', top:10, left:10, background:accent, color:'#fff',
                fontSize:10, fontWeight:800, letterSpacing:'.07em', textTransform:'uppercase',
                padding:'4px 10px', borderRadius:99 }}>{item.category}</span>
            </div>
            {/* Title */}
            <div style={{ padding:'12px 14px 10px', background:'#fff' }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#202124', lineHeight:1.4,
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {item.title}
              </div>
            </div>
            {/* Footer */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'8px 14px 10px', borderTop:'1px solid #f0f0f0', background:'#fff' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png"
                  style={{ width:24, height:24, borderRadius:'50%' }} alt=""/>
                <span style={{ fontSize:13, fontWeight:800, color:'#202124' }}>NewsTally</span>
              </div>
              <span style={{ fontSize:12, fontWeight:600, color:accent }}>{item.source}</span>
            </div>
            <div style={{ height:4, background:`linear-gradient(90deg,#1a73e8,${accent})` }}/>
          </div>

          {/* Share buttons grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, padding:'20px 16px 0' }}>
            {actions.map(a => (
              <button key={a.label} onClick={() => { a.fn(); onClose() }}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                  padding:'12px 4px', background:'transparent', border:'none', cursor:'pointer' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:a.bg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 2px 12px rgba(0,0,0,.3)' }}>
                  <i className={a.icon} style={{ color:'#fff', fontSize:20 }}/>
                </div>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:600, textAlign:'center' }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Save Card + Close */}
          <div style={{ display:'flex', gap:10, padding:'16px 16px 0' }}>
            <button onClick={saveCard} disabled={saving}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'14px 0', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)',
                borderRadius:14, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              {saving
                ? <><i className="fas fa-spinner fa-spin"/> Saving...</>
                : <><i className="fas fa-image"/> Save Card</>
              }
            </button>
            <button onClick={onClose}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'14px 0', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)',
                borderRadius:14, color:'rgba(255,255,255,.6)', fontSize:14, fontWeight:600, cursor:'pointer' }}>
              <i className="fas fa-times"/> Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Repost Modal ──────────────────────────────────────────────────
function RepostModal({ item, onClose, onConfirm, reposting }) {
  const accent = CAT_COLORS[item?.category] || '#1a73e8'
  if (!item) return null
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(6px)', zIndex:500,
        display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:480, background:'#13131f', borderRadius:'20px 20px 0 0',
        padding:'20px 20px 36px', border:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ width:40, height:4, borderRadius:99, background:'rgba(255,255,255,.15)', margin:'0 auto 20px' }}/>
        <p style={{ color:'#fff', fontWeight:700, fontSize:16, marginBottom:16 }}>Repost to Socialgati?</p>
        <div style={{ display:'flex', gap:12, background:'rgba(255,255,255,.06)', padding:12, borderRadius:12, marginBottom:20 }}>
          {item.image && <img src={item.image} alt="" style={{ width:60, height:60, borderRadius:8, objectFit:'cover', flexShrink:0 }}/>}
          <div style={{ flex:1, minWidth:0 }}>
            <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', color:accent }}>{item.category}</span>
            <p style={{ fontSize:13, fontWeight:600, color:'#fff', lineHeight:1.4, marginTop:4,
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:4 }}>{item.source}</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'13px 0', background:'rgba(255,255,255,.08)', border:'none', borderRadius:12,
              color:'rgba(255,255,255,.7)', fontSize:14, fontWeight:600, cursor:'pointer' }}>Cancel</button>
          <button onClick={() => onConfirm(item)} disabled={reposting}
            style={{ flex:2, padding:'13px 0', background:'linear-gradient(135deg,#1a73e8,#1557b0)', border:'none',
              borderRadius:12, color:'#fff', fontSize:14, fontWeight:700, cursor: reposting?'not-allowed':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: reposting ? 0.7 : 1 }}>
            {reposting ? <><i className="fas fa-spinner fa-spin"/> Posting...</> : <><i className="fas fa-retweet"/> Repost</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Short Card ────────────────────────────────────────────────────
function ShortCard({ item, height, idx, curIdx, onRepost, onShare }) {
  const [imgErr, setImgErr] = useState(false)
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  if (Math.abs(idx - curIdx) > 1) {
    return <div style={{ position:'absolute', top:idx*height, left:0, width:'100%', height, background:'#09090f' }}/>
  }
  const desc = (item.description || '').substring(0, 280)
  return (
    <div style={{ position:'absolute', top:idx*height, left:0, width:'100%', height, overflow:'hidden',
      display:'flex', flexDirection:'column', background:'#09090f' }}>

      {/* Image 42% */}
      <div style={{ flex:'0 0 42%', position:'relative', overflow:'hidden', background:'#0d0d1a' }}>
        {item.image && !imgErr ? (
          <img src={item.image} alt="" loading={Math.abs(idx-curIdx)<=1?'eager':'lazy'} onError={() => setImgErr(true)}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, background:`linear-gradient(135deg,${accent}18,${accent}08)` }}>
            <i className={catIcon(item.category)} style={{ fontSize:40, color:`${accent}60` }}/>
          </div>
        )}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'70%', background:'linear-gradient(to bottom,transparent,#09090f)', pointerEvents:'none' }}/>
        {/* Source + time */}
        <div style={{ position:'absolute', top:12, left:12, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)', color:'rgba(255,255,255,.75)', fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:99, border:'1px solid rgba(255,255,255,.1)' }}>
            {item.source}
          </span>
          {(item.date || item.pubDate) && (
            <span style={{ background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)', color:'rgba(255,255,255,.5)', fontSize:10, padding:'3px 8px', borderRadius:99 }}>
              {timeAgo(item.date || item.pubDate)}
            </span>
          )}
        </div>
        {/* Category badge */}
        <div style={{ position:'absolute', bottom:10, left:14 }}>
          <span style={{ background:accent, color:'#fff', fontSize:9, fontWeight:800, letterSpacing:'.07em', textTransform:'uppercase', padding:'4px 10px', borderRadius:99, display:'inline-flex', alignItems:'center', gap:5, boxShadow:`0 2px 10px ${accent}60` }}>
            <i className={catIcon(item.category)} style={{ fontSize:8 }}/> {item.category}
          </span>
        </div>
      </div>

      {/* Text */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'14px 16px 0', overflow:'hidden' }}>
        <h2 style={{ fontSize:17, fontWeight:800, color:'#fff', lineHeight:1.45, marginBottom:8, flexShrink:0,
          display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden', letterSpacing:'-.01em' }}>
          {item.title}
        </h2>
        {desc && (
          <p style={{ fontSize:13, color:'rgba(255,255,255,.55)', lineHeight:1.65, flexShrink:0,
            display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {desc}
          </p>
        )}
      </div>

      {/* Footer actions — now 3 buttons */}
      <div style={{ padding:'10px 16px 16px', flexShrink:0, display:'flex', alignItems:'center', gap:8,
        borderTop:'1px solid rgba(255,255,255,.06)', background:'linear-gradient(to top,rgba(9,9,15,1) 60%,transparent)' }}>
        {/* Repost */}
        <button onClick={e => { e.stopPropagation(); onRepost(item) }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px',
            background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)',
            borderRadius:12, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
          <i className="fas fa-retweet" style={{ fontSize:13, color:'#34a853' }}/> Repost
        </button>
        {/* Share */}
        <button onClick={e => { e.stopPropagation(); onShare(item) }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px',
            background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)',
            borderRadius:12, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
          <i className="fas fa-share-nodes" style={{ fontSize:13, color:'#1a73e8' }}/> Share
        </button>
        {/* Read Full */}
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
              padding:'10px 0', background:'linear-gradient(135deg,#1a73e8,#1557b0)', borderRadius:12,
              color:'#fff', fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 4px 16px rgba(26,115,232,.35)' }}>
            Read <i className="fas fa-arrow-up-right-from-square" style={{ fontSize:10 }}/>
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function Shorts() {
  const { user } = useAuth()

  const [allNews, setAllNews]         = useState([])
  const lastDocRef                    = useRef(null)
  const orderFieldRef                 = useRef(null)
  const [hasMore, setHasMore]         = useState(true)
  const [catItems, setCatItems]       = useState([])
  const catLastDocRef                 = useRef(null)
  const [catHasMore, setCatHasMore]   = useState(true)
  const [filtered, setFiltered]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cat, setCat]                 = useState('All')
  const [curIdx, setCurIdx]           = useState(0)
  const [showAuth, setShowAuth]       = useState(false)
  const [repostItem, setRepostItem]   = useState(null)
  const [reposting, setReposting]     = useState(false)
  const [shareItem, setShareItem]     = useState(null)
  const [showHint, setShowHint]       = useState(true)

  const vpRef          = useRef()
  const trackRef       = useRef()
  const touchStartY    = useRef(0)
  const touchStartTime = useRef(0)
  const isDragging     = useRef(false)
  const getH = () => window.innerHeight

  const detectOrderField = useCallback(async () => {
    for (const field of ['pubDate', 'fetchedAt', 'savedAt']) {
      try {
        const snap = await getDocs(query(collection(db, 'news'), orderBy(field, 'desc'), limit(1)))
        if (!snap.empty) { orderFieldRef.current = field; return field }
      } catch(e) {}
    }
    orderFieldRef.current = null; return null
  }, [])

  const fetchBatch = useCallback(async (isFirst = false) => {
    const field = orderFieldRef.current
    let q
    if (field) {
      q = isFirst
        ? query(collection(db, 'news'), orderBy(field, 'desc'), limit(PAGE_SIZE))
        : lastDocRef.current ? query(collection(db, 'news'), orderBy(field, 'desc'), startAfter(lastDocRef.current), limit(PAGE_SIZE)) : null
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

  const fetchCategoryBatch = useCallback(async (category, isFirst = false) => {
    let constraints = [where('category', '==', category)]
    if (orderFieldRef.current) { try { constraints.push(orderBy(orderFieldRef.current, 'desc')) } catch(e) {} }
    if (!isFirst && catLastDocRef.current) constraints.push(startAfter(catLastDocRef.current))
    constraints.push(limit(PAGE_SIZE))
    let snap
    try { snap = await getDocs(query(collection(db, 'news'), ...constraints)) }
    catch(e) {
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

  const loadInitial = useCallback(async () => {
    setLoading(true); lastDocRef.current = null; setHasMore(true)
    try { await detectOrderField(); const items = await fetchBatch(true); setAllNews(sortByDate(items)) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [detectOrderField, fetchBatch])

  const loadCategoryInitial = useCallback(async (category) => {
    setLoading(true); setCatItems([]); setCatHasMore(true); catLastDocRef.current = null
    try { const items = await fetchCategoryBatch(category, true); setCatItems(sortByDate(items)) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [fetchCategoryBatch])

  const loadMoreAll = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const items = await fetchBatch(false)
      if (items.length) setAllNews(prev => { const ids = new Set(prev.map(n=>n.id)); return sortByDate([...prev,...items.filter(n=>!ids.has(n.id))]) })
    } catch(e) {}
    finally { setLoadingMore(false) }
  }, [loadingMore, hasMore, fetchBatch])

  const loadMoreCat = useCallback(async () => {
    if (loadingMore || !catHasMore || cat === 'All') return
    setLoadingMore(true)
    try {
      const items = await fetchCategoryBatch(cat, false)
      if (items.length) setCatItems(prev => { const ids = new Set(prev.map(n=>n.id)); return sortByDate([...prev,...items.filter(n=>!ids.has(n.id))]) })
    } catch(e) {}
    finally { setLoadingMore(false) }
  }, [loadingMore, catHasMore, cat, fetchCategoryBatch])

  const loadMore = useCallback(() => { return cat === 'All' ? loadMoreAll() : loadMoreCat() }, [cat, loadMoreAll, loadMoreCat])

  useEffect(() => { loadInitial() }, [loadInitial])
  useEffect(() => { setCurIdx(0); if (cat !== 'All') loadCategoryInitial(cat) }, [cat]) // eslint-disable-line
  useEffect(() => { setFiltered(cat === 'All' ? allNews : catItems) }, [cat, allNews, catItems])
  useEffect(() => { if (!filtered.length) return; const rem = filtered.length - 1 - curIdx; if (rem <= LOAD_AHEAD) loadMore() }, [curIdx, filtered.length]) // eslint-disable-line
  useEffect(() => { if (curIdx > 0) setShowHint(false) }, [curIdx])

  const navigate = useCallback((dir) => {
    setCurIdx(prev => { const next = prev + dir; if (next < 0 || next >= filtered.length) return prev; return next })
  }, [filtered.length])

  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY; touchStartTime.current = Date.now(); isDragging.current = true
  }, [])
  const onTouchMove = useCallback((e) => {
    if (!isDragging.current) return
    const dy = e.touches[0].clientY - touchStartY.current
    const el = trackRef.current; const h = getH()
    if (el) el.style.transform = `translate3d(0,${-curIdx * h + dy}px,0)`
  }, [curIdx])
  const onTouchEnd = useCallback((e) => {
    if (!isDragging.current) return; isDragging.current = false
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const dt = Date.now() - touchStartTime.current
    const isSwipe = Math.abs(dy) > 50 || (Math.abs(dy) > 25 && dt < 300)
    const el = trackRef.current; const h = getH()
    if (el) {
      el.style.transition = 'transform .3s cubic-bezier(.25,.46,.45,.94)'
      if (isSwipe) navigate(dy < 0 ? 1 : -1)
      else el.style.transform = `translate3d(0,${-curIdx * h}px,0)`
      setTimeout(() => { if (el) el.style.transition = '' }, 360)
    }
  }, [curIdx, navigate])

  useEffect(() => {
    const el = trackRef.current; if (!el) return; const h = getH()
    el.style.transition = 'transform .3s cubic-bezier(.25,.46,.45,.94)'
    el.style.transform = `translate3d(0,${-curIdx * h}px,0)`
    setTimeout(() => { if (el) el.style.transition = '' }, 360)
  }, [curIdx])

  const handleRepost = useCallback(async (item) => {
    if (!user) { setRepostItem(null); setShowAuth(true); return }
    setReposting(true)
    try {
      const uSnap = await getDoc(doc(db, 'users', user.uid)).catch(() => null)
      const uData = uSnap?.data() || {}
      const myInfo = { uid: user.uid, username: uData.username || user.displayName || 'User', avatar: user.photoURL || '', timestamp: new Date().toISOString() }
      const myRepost = await getDocs(query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
        where('newsId', '==', String(item.id || item.title)),
        where('repostedBy', 'array-contains', user.uid), limit(1)
      )).catch(() => ({ empty: true }))
      if (!myRepost.empty) { showToast('Already reposted!'); setRepostItem(null); return }
      const existing = await getDocs(query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
        where('newsId', '==', String(item.id || item.title)), where('type', '==', 'repost'), limit(1)
      ))
      if (!existing.empty) {
        await updateDoc(existing.docs[0].ref, { repostCount: fbIncrement(1), repostedBy: arrayUnion(user.uid), repostedUsers: arrayUnion(myInfo) })
        showToast('✅ You reposted this news!')
      } else {
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'), {
          userId: user.uid, username: myInfo.username, userAvatar: myInfo.avatar,
          image: item.image||'', headline: item.title, newsUrl: item.url||'',
          newsSource: item.source||'', newsCategory: item.category||'',
          newsId: String(item.id||item.title), likes:[], commentsCount:0, repostCount:1,
          repostedBy:[user.uid], repostedUsers:[myInfo], timestamp:serverTimestamp(), type:'repost'
        })
        showToast('✅ Reposted to Socialgati!')
      }
      setRepostItem(null)
    } catch(e) { showToast('Repost failed') }
    finally { setReposting(false) }
  }, [user])

  if (loading) return (
    <div style={{ position:'fixed', inset:0, background:'#09090f', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid rgba(255,255,255,.1)', borderTopColor:'#1a73e8', animation:'spin .8s linear infinite', margin:'0 auto 16px' }}/>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:600, letterSpacing:'.04em' }}>LOADING SHORTS</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!filtered.length) return (
    <div style={{ position:'fixed', inset:0, background:'#09090f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
      <i className="fas fa-newspaper" style={{ fontSize:40, color:'rgba(255,255,255,.15)' }}/>
      <p style={{ color:'rgba(255,255,255,.5)', fontWeight:600 }}>No shorts available</p>
      <BottomNav darkMode/>
    </div>
  )

  const h = getH()

  return (
    <div style={{ position:'fixed', inset:0, background:'#09090f', overflow:'hidden' }}>
      {/* Category bar */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:300, paddingTop:'calc(10px + env(safe-area-inset-top,0px))', paddingBottom:10, paddingLeft:12, paddingRight:12, display:'flex', alignItems:'center', gap:8, overflowX:'auto', scrollbarWidth:'none', background:'linear-gradient(to bottom,rgba(9,9,15,.95),transparent)' }}>
        <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, marginRight:4 }} alt=""/>
        {CATS.map(c => {
          const isActive = cat === c; const accent = CAT_COLORS[c] || '#fff'
          return (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding:'6px 14px', borderRadius:99, border:'none', fontSize:12, fontWeight:700, flexShrink:0, cursor:'pointer',
                background: isActive ? accent : 'rgba(255,255,255,.1)',
                color: isActive ? '#fff' : 'rgba(255,255,255,.55)',
                boxShadow: isActive ? `0 2px 12px ${accent}50` : 'none' }}>
              {c}
            </button>
          )
        })}
      </div>

      {/* Viewport */}
      <div ref={vpRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ position:'absolute', inset:0, overflow:'hidden', touchAction:'none' }}>
        <div ref={trackRef} style={{ position:'absolute', top:0, left:0, width:'100%', willChange:'transform', transform:'translate3d(0,0,0)' }}>
          {filtered.map((item, i) => (
            <ShortCard key={item.id} item={item} height={h} idx={i} curIdx={curIdx}
              onRepost={item => setRepostItem(item)}
              onShare={item => setShareItem(item)}/>
          ))}
        </div>
      </div>

      {/* Loading more */}
      {loadingMore && (
        <div style={{ position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)', color:'rgba(255,255,255,.6)', fontSize:12, fontWeight:600, padding:'6px 16px', borderRadius:99, zIndex:200, display:'flex', alignItems:'center', gap:8 }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize:11 }}/> Loading more...
        </div>
      )}

      {/* Swipe hint */}
      {showHint && filtered.length > 1 && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:4, animation:'hintFade 2.5s ease forwards', zIndex:200, pointerEvents:'none' }}>
          <i className="fas fa-chevron-up" style={{ fontSize:18, color:'rgba(255,255,255,.4)' }}/>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontWeight:600, letterSpacing:'.06em' }}>SWIPE UP</span>
          <style>{`@keyframes hintFade{0%{opacity:0;transform:translateX(-50%) translateY(8px)}20%{opacity:1;transform:translateX(-50%) translateY(0)}80%{opacity:1}100%{opacity:0}}`}</style>
        </div>
      )}

      {repostItem && <RepostModal item={repostItem} onClose={() => setRepostItem(null)} onConfirm={handleRepost} reposting={reposting}/>}
      {shareItem  && <ShareModal  item={shareItem}  onClose={() => setShareItem(null)}/>}
      {showAuth   && <AuthModal   onClose={() => setShowAuth(false)}/>}
      <BottomNav darkMode/>
    </div>
  )
}
