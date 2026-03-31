import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection, query, orderBy, limit, onSnapshot,
  addDoc, updateDoc, arrayUnion, increment as fbIncrement,
  serverTimestamp, where, getDoc, doc, getDocs
} from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useNavigate } from 'react-router-dom'

const CAT_COLORS = {
  National:'#e53935', World:'#1a73e8', Business:'#34a853',
  Technology:'#9334e6', Health:'#f4a261', Education:'#0077b6',
  Sports:'#ff6d00', General:'#546e7a', Entertainment:'#ad1457',
  Cricket:'#00bcd4'
}

function getAccent(cat) { return CAT_COLORS[cat] || '#1a73e8' }

// ── Canvas share card (no CORS) ───────────────────────────────────
async function buildCanvas(item) {
  const W = 720, H = 960, IMG_H = 440
  const accent = getAccent(item.category)
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)

  let imgLoaded = false
  if (item.image) {
    await new Promise(resolve => {
      const img = new Image(); img.crossOrigin = 'anonymous'
      img.onload = () => {
        const ar = img.naturalWidth / img.naturalHeight
        let sw = W, sh = W / ar
        if (sh < IMG_H) { sh = IMG_H; sw = IMG_H * ar }
        ctx.drawImage(img, (W-sw)/2, (IMG_H-sh)/2, sw, sh)
        imgLoaded = true; resolve()
      }
      img.onerror = resolve
      img.src = `https://images.weserv.nl/?url=${encodeURIComponent(item.image)}&w=720&h=440&fit=cover&output=jpg`
      setTimeout(resolve, 3000)
    })
  }
  if (!imgLoaded) {
    const g = ctx.createLinearGradient(0,0,W,IMG_H)
    g.addColorStop(0, accent+'44'); g.addColorStop(1, accent+'88')
    ctx.fillStyle = g; ctx.fillRect(0,0,W,IMG_H)
    ctx.fillStyle = accent+'55'; ctx.font = 'bold 80px serif'
    ctx.textAlign = 'center'; ctx.fillText('📰', W/2, IMG_H/2+30)
  }
  const ov = ctx.createLinearGradient(0, IMG_H*0.3, 0, IMG_H)
  ov.addColorStop(0,'rgba(0,0,0,0)'); ov.addColorStop(1,'rgba(0,0,0,0.55)')
  ctx.fillStyle = ov; ctx.fillRect(0,0,W,IMG_H)

  // Category pill
  ctx.fillStyle = accent
  const ct = (item.category||'NEWS').toUpperCase()
  ctx.font = 'bold 22px sans-serif'
  const pw = ctx.measureText(ct).width + 48
  ctx.beginPath(); ctx.roundRect(28,28,pw,44,22); ctx.fill()
  ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.fillText(ct, 28+pw/2, 56)

  // Title
  ctx.fillStyle='#202124'; ctx.font='bold 34px sans-serif'; ctx.textAlign='left'
  let ly = IMG_H+44, ln=''
  for (const w of (item.title||'').split(' ')) {
    const t = ln+w+' '
    if (ctx.measureText(t).width > W-56 && ln) { ctx.fillText(ln.trim(),28,ly); ln=w+' '; ly+=44; if(ly>IMG_H+176){ctx.fillText(ln.trim()+'...',28,ly);ly+=44;break} } else ln=t
  }
  if(ln) ctx.fillText(ln.trim(),28,ly)

  // Desc
  if(item.description){
    let dy=ly+44, dl=''
    ctx.fillStyle='#5f6368'; ctx.font='26px sans-serif'
    for(const w of item.description.split(' ')){
      const t=dl+w+' '
      if(ctx.measureText(t).width>W-56&&dl){ctx.fillText(dl.trim(),28,dy);dl=w+' ';dy+=36;if(dy>ly+200){ctx.fillText(dl.trim()+'...',28,dy);break}}else dl=t
    }
    if(dl) ctx.fillText(dl.trim(),28,dy)
  }

  ctx.strokeStyle='#f0f0f0'; ctx.lineWidth=2
  ctx.beginPath(); ctx.moveTo(0,H-110); ctx.lineTo(W,H-110); ctx.stroke()

  await new Promise(resolve => {
    const logo = new Image(); logo.crossOrigin='anonymous'
    logo.onload = () => { ctx.save(); ctx.beginPath(); ctx.arc(48,H-60,32,0,Math.PI*2); ctx.clip(); ctx.drawImage(logo,16,H-92,64,64); ctx.restore(); resolve() }
    logo.onerror = resolve
    logo.src = 'https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png'
    setTimeout(resolve, 2000)
  })
  ctx.fillStyle='#9aa0a6'; ctx.font='20px sans-serif'; ctx.textAlign='left'; ctx.fillText('READ MORE AT',96,H-72)
  ctx.fillStyle='#202124'; ctx.font='bold 28px sans-serif'; ctx.fillText('NewsTally',96,H-38)
  ctx.fillStyle='#9aa0a6'; ctx.textAlign='right'; ctx.fillText('Source',W-28,H-72)
  ctx.fillStyle=accent; ctx.font='bold 26px sans-serif'; ctx.fillText(item.source||'NewsTally',W-28,H-38)
  const stripe = ctx.createLinearGradient(0,0,W,0)
  stripe.addColorStop(0,'#1a73e8'); stripe.addColorStop(1,accent)
  ctx.fillStyle=stripe; ctx.fillRect(0,H-8,W,8)
  return canvas
}

// ── Share Modal ───────────────────────────────────────────────────
function ShareModal({ item, onClose }) {
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)
  const accent = getAccent(item?.category)

  useEffect(() => {
    if (!item) return
    let gone = false
    buildCanvas(item).then(c => { if (!gone) setPreview(c.toDataURL('image/jpeg',0.92)) }).catch(()=>{})
    return () => { gone = true }
  }, [item])

  if (!item) return null
  const shareUrl = item.url && item.url !== '#' ? item.url : 'https://newstally.online'
  const txt = `📰 ${item.title}\n\n${(item.description||'').slice(0,100)}...\n\n🔗 ${shareUrl}\n\n📲 NewsTally`
  const open = u => window.open(u,'_blank','noopener')

  const btns = [
    { label:'WhatsApp',  icon:'fab fa-whatsapp',    bg:'#25d366', fn:()=>open(`https://wa.me/?text=${encodeURIComponent(txt)}`) },
    { label:'Twitter',   icon:'fab fa-x-twitter',   bg:'#000',    fn:()=>open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('📰 '+item.title)}&url=${encodeURIComponent(shareUrl)}`) },
    { label:'Telegram',  icon:'fab fa-telegram',    bg:'#0088cc', fn:()=>open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('📰 '+item.title)}`) },
    { label:'Facebook',  icon:'fab fa-facebook',    bg:'#1877f2', fn:()=>open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`) },
    { label:'Instagram', icon:'fab fa-instagram',   bg:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', fn:()=>{navigator.clipboard?.writeText(shareUrl);showToast('Link copied!')} },
    { label:'More',      icon:'fas fa-share-nodes', bg:'#34a853', fn:()=>{ if(navigator.share) navigator.share({title:item.title,url:shareUrl}); else {navigator.clipboard?.writeText(shareUrl);showToast('🔗 Copied!')} } },
    { label:'Copy',      icon:'fas fa-link',        bg:'#5f6368', fn:()=>{navigator.clipboard?.writeText(shareUrl);showToast('🔗 Link copied!')} },
  ]

  const save = async () => {
    setSaving(true)
    try { const c = await buildCanvas(item); const a = document.createElement('a'); a.download=`newstally-${Date.now()}.jpg`; a.href=c.toDataURL('image/jpeg',0.92); a.click(); showToast('✅ Saved!') }
    catch { showToast('Try screenshot instead.') }
    setSaving(false)
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(6px)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{width:'100%',maxWidth:480,background:'var(--surface)',borderRadius:'24px 24px 0 0',paddingBottom:'calc(20px + env(safe-area-inset-bottom,0px))',border:'1px solid var(--border)'}}>
        <div style={{width:40,height:4,background:'var(--border)',borderRadius:99,margin:'14px auto 0'}}/>
        {/* Preview */}
        <div style={{margin:'14px 16px 0',borderRadius:14,overflow:'hidden',background:'var(--surface2)',minHeight:140,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {preview ? <img src={preview} alt="" style={{width:'100%',display:'block',borderRadius:14}}/> : <i className="fas fa-spinner fa-spin" style={{fontSize:24,color:'var(--muted)',padding:40}}/>}
        </div>
        {/* Buttons */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',padding:'16px 12px 0'}}>
          {btns.map(b=>(
            <button key={b.label} onClick={()=>{b.fn();onClose()}} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7,padding:'10px 4px',background:'transparent',border:'none',cursor:'pointer'}}>
              <div style={{width:50,height:50,borderRadius:'50%',background:b.bg,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 10px rgba(0,0,0,.15)'}}>
                <i className={b.icon} style={{color:'#fff',fontSize:19}}/>
              </div>
              <span style={{fontSize:10,color:'var(--muted)',fontWeight:600}}>{b.label}</span>
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:10,padding:'14px 16px 0'}}>
          <button onClick={save} disabled={saving} style={{flex:1,padding:'13px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:12,fontSize:14,fontWeight:700,color:'var(--ink)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {saving?<><i className="fas fa-spinner fa-spin"/>Saving...</>:<><i className="fas fa-image"/>Save Card</>}
          </button>
          <button onClick={onClose} style={{flex:1,padding:'13px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:12,fontSize:14,fontWeight:600,color:'var(--muted)',cursor:'pointer'}}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Repost Modal ──────────────────────────────────────────────────
function RepostModal({ item, onClose, onConfirm, reposting }) {
  if (!item) return null
  const accent = getAccent(item.category)
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(6px)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{width:'100%',maxWidth:480,background:'var(--surface)',borderRadius:'20px 20px 0 0',padding:'20px 20px 36px',border:'1px solid var(--border)'}}>
        <div style={{width:40,height:4,borderRadius:99,background:'var(--border)',margin:'0 auto 18px'}}/>
        <p style={{fontWeight:700,fontSize:16,color:'var(--ink)',marginBottom:14}}>Repost to Socialgati?</p>
        <div style={{display:'flex',gap:12,background:'var(--surface2)',padding:12,borderRadius:12,marginBottom:18,border:'1px solid var(--border)'}}>
          {item.image&&<img src={item.image} alt="" style={{width:60,height:60,borderRadius:8,objectFit:'cover',flexShrink:0}} onError={e=>e.target.style.display='none'}/>}
          <div style={{flex:1,minWidth:0}}>
            <span style={{fontSize:10,fontWeight:800,textTransform:'uppercase',color:accent}}>{item.category}</span>
            <p style={{fontSize:13,fontWeight:600,color:'var(--ink)',lineHeight:1.4,marginTop:4,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{item.title}</p>
            <p style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{item.source}</p>
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'12px',background:'var(--surface2)',border:'none',borderRadius:12,color:'var(--muted)',fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
          <button onClick={()=>onConfirm(item)} disabled={reposting}
            style={{flex:2,padding:'12px',background:'linear-gradient(135deg,#1a73e8,#1557b0)',border:'none',borderRadius:12,color:'#fff',fontSize:14,fontWeight:700,cursor:reposting?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:reposting?.7:1}}>
            {reposting?<><i className="fas fa-spinner fa-spin"/>Posting...</>:<><i className="fas fa-retweet"/>Repost</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Live News Card (Reddit style) ─────────────────────────────────
function LiveCard({ item, onRepost, onShare, isNew }) {
  const [imgErr, setImgErr] = useState(false)
  const navigate = useNavigate()
  const accent = getAccent(item.category)

  return (
    <article style={{
      background: 'var(--surface)', borderRadius: 12,
      border: '1px solid var(--border)',
      marginBottom: 8, overflow: 'hidden',
      boxShadow: isNew ? `0 0 0 2px ${accent}44` : 'none',
      animation: isNew ? 'lnSlideIn .35s ease' : 'none'
    }}>
      <style>{`@keyframes lnSlideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Top: category + source + time */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px 0',flexWrap:'wrap'}}>
        <span style={{fontSize:10,fontWeight:800,color:accent,background:accent+'18',padding:'3px 9px',borderRadius:99,textTransform:'uppercase',letterSpacing:'.05em'}}>
          {item.category}
        </span>
        <span style={{fontSize:11,color:'var(--muted)',fontWeight:500}}>{item.source}</span>
        <span style={{fontSize:11,color:'var(--muted2)',marginLeft:'auto',flexShrink:0}}>
          {timeAgo(item.date || item.pubDate || item.savedAt)}
        </span>
        {isNew && (
          <span style={{fontSize:9,fontWeight:800,color:'#e53935',background:'#fde8e8',padding:'2px 7px',borderRadius:99,letterSpacing:'.05em',display:'flex',alignItems:'center',gap:4}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:'#e53935',display:'inline-block',animation:'livePulse 1s infinite'}}/>
            NEW
          </span>
        )}
      </div>

      {/* Content row */}
      <div style={{display:'flex',gap:12,padding:'10px 12px',alignItems:'flex-start'}}
        onClick={() => navigate(`/news/${item.id}`)}>
        <div style={{flex:1,minWidth:0,cursor:'pointer'}}>
          <h3 style={{fontSize:15,fontWeight:700,color:'var(--ink)',lineHeight:1.45,marginBottom:item.description?6:0,
            display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
            {item.title}
          </h3>
          {item.description && (
            <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.5,
              display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
              {item.description}
            </p>
          )}
        </div>
        {item.image && !imgErr && (
          <div style={{width:80,height:64,borderRadius:10,overflow:'hidden',flexShrink:0,background:'var(--surface2)',cursor:'pointer'}}>
            <img src={item.image} alt="" loading="lazy" onError={()=>setImgErr(true)}
              style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
          </div>
        )}
      </div>

      {/* Actions bar */}
      <div style={{display:'flex',alignItems:'center',gap:2,padding:'6px 8px 8px',borderTop:'1px solid var(--border2)'}}>
        {/* Read */}
        {item.url && item.url !== '#' && (
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            style={{display:'flex',alignItems:'center',gap:5,padding:'6px 10px',borderRadius:8,fontSize:12,fontWeight:600,color:'var(--muted)',textDecoration:'none'}}
            onMouseOver={e=>e.currentTarget.style.background='var(--surface2)'}
            onMouseOut={e=>e.currentTarget.style.background='transparent'}>
            <i className="fas fa-external-link-alt" style={{fontSize:10,color:'#1a73e8'}}/>
            Read
          </a>
        )}
        {/* Repost */}
        <button onClick={()=>onRepost(item)}
          style={{display:'flex',alignItems:'center',gap:5,padding:'6px 10px',borderRadius:8,fontSize:12,fontWeight:600,color:'var(--muted)',background:'none',border:'none',cursor:'pointer'}}
          onMouseOver={e=>e.currentTarget.style.background='var(--surface2)'}
          onMouseOut={e=>e.currentTarget.style.background='transparent'}>
          <i className="fas fa-retweet" style={{fontSize:12,color:'#34a853'}}/>
          Repost
        </button>
        {/* Share */}
        <button onClick={()=>onShare(item)}
          style={{display:'flex',alignItems:'center',gap:5,padding:'6px 10px',borderRadius:8,fontSize:12,fontWeight:600,color:'var(--muted)',background:'none',border:'none',cursor:'pointer'}}
          onMouseOver={e=>e.currentTarget.style.background='var(--surface2)'}
          onMouseOut={e=>e.currentTarget.style.background='transparent'}>
          <i className="fas fa-share-nodes" style={{fontSize:11,color:'#1a73e8'}}/>
          Share
        </button>
        <button onClick={()=>navigate(`/news/${item.id}`)}
          style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:5,padding:'6px 10px',borderRadius:8,fontSize:12,fontWeight:600,color:'#1a73e8',background:'none',border:'none',cursor:'pointer'}}
          onMouseOver={e=>e.currentTarget.style.background='var(--surface2)'}
          onMouseOut={e=>e.currentTarget.style.background='transparent'}>
          Full Story <i className="fas fa-chevron-right" style={{fontSize:9}}/>
        </button>
      </div>
    </article>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{background:'var(--surface)',borderRadius:12,padding:14,marginBottom:8,border:'1px solid var(--border)'}}>
      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <div className="skeleton" style={{width:60,height:16,borderRadius:99}}/>
        <div className="skeleton" style={{width:80,height:16,borderRadius:4}}/>
      </div>
      <div style={{display:'flex',gap:12}}>
        <div style={{flex:1}}>
          <div className="skeleton" style={{height:15,width:'95%',marginBottom:7,borderRadius:4}}/>
          <div className="skeleton" style={{height:15,width:'80%',marginBottom:7,borderRadius:4}}/>
          <div className="skeleton" style={{height:13,width:'60%',borderRadius:4}}/>
        </div>
        <div className="skeleton" style={{width:80,height:64,borderRadius:10,flexShrink:0}}/>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function LiveNews() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [items, setItems]           = useState([])
  const [newIds, setNewIds]         = useState(new Set())
  const [loading, setLoading]       = useState(true)
  const [newCount, setNewCount]     = useState(0)
  const [showNew, setShowNew]       = useState(false)
  const [cat, setCat]               = useState('All')
  const [cats, setCats]             = useState(['All'])
  const [repostItem, setRepostItem] = useState(null)
  const [reposting, setReposting]   = useState(false)
  const [shareItem, setShareItem]   = useState(null)
  const [showAuth, setShowAuth]     = useState(false)
  const [search, setSearch]         = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const firstLoadRef = useRef(true)
  const topRef       = useRef(null)
  const itemIdsRef   = useRef(new Set())

  // ── Real-time listener ────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'news'), orderBy('savedAt', 'desc'), limit(100))
    const fallbackQ = query(collection(db, 'news'), orderBy('timestamp', 'desc'), limit(100))

    let unsub = null

    const attach = (q) => {
      unsub = onSnapshot(q, snap => {
        const incoming = snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(n => n.title)

        if (firstLoadRef.current) {
          // First load — show all
          incoming.forEach(n => itemIdsRef.current.add(n.id))
          setItems(incoming)
          // Build categories
          const allCats = [...new Set(incoming.map(n=>n.category).filter(Boolean))]
          const cricket = allCats.filter(c=>c.toLowerCase()==='cricket')
          const others  = allCats.filter(c=>c.toLowerCase()!=='cricket').sort()
          setCats(['All','🔴 Live', ...cricket, ...others])
          setLoading(false)
          firstLoadRef.current = false
        } else {
          // Subsequent updates — detect new items
          const freshIds = new Set()
          incoming.forEach(n => {
            if (!itemIdsRef.current.has(n.id)) freshIds.add(n.id)
          })
          if (freshIds.size > 0) {
            setNewCount(c => c + freshIds.size)
            setShowNew(true)
            freshIds.forEach(id => itemIdsRef.current.add(id))
          }
          setItems(incoming)
        }
      }, () => {
        // Fallback to timestamp
        if (unsub) unsub()
        attach(fallbackQ)
      })
    }

    attach(q)
    return () => unsub && unsub()
  }, [])

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior:'smooth' })
    setShowNew(false)
    setNewCount(0)
    setNewIds(new Set())
  }

  // ── Handle repost ─────────────────────────────────────────────
  const handleRepost = useCallback(async (item) => {
    if (!user) { setRepostItem(null); setShowAuth(true); return }
    setReposting(true)
    try {
      const uSnap = await getDoc(doc(db,'users',user.uid)).catch(()=>null)
      const uData = uSnap?.data() || {}
      const myInfo = { uid:user.uid, username:uData.username||user.displayName||'User', avatar:user.photoURL||'', timestamp:new Date().toISOString() }
      const myRepost = await getDocs(query(
        collection(db,'artifacts',APP_ID,'public','data','reposts'),
        where('newsId','==',String(item.id||item.title)),
        where('repostedBy','array-contains',user.uid), limit(1)
      )).catch(()=>({empty:true}))
      if (!myRepost.empty) { showToast('Already reposted!'); setRepostItem(null); return }
      const existing = await getDocs(query(
        collection(db,'artifacts',APP_ID,'public','data','reposts'),
        where('newsId','==',String(item.id||item.title)), where('type','==','repost'), limit(1)
      ))
      if (!existing.empty) {
        await updateDoc(existing.docs[0].ref, { repostCount:fbIncrement(1), repostedBy:arrayUnion(user.uid), repostedUsers:arrayUnion(myInfo) })
        showToast('✅ Reposted!')
      } else {
        await addDoc(collection(db,'artifacts',APP_ID,'public','data','reposts'), {
          userId:user.uid, username:myInfo.username, userAvatar:myInfo.avatar,
          image:item.image||'', headline:item.title, newsUrl:item.url||'',
          newsSource:item.source||'', newsCategory:item.category||'',
          newsId:String(item.id||item.title), likes:[], commentsCount:0, repostCount:1,
          repostedBy:[user.uid], repostedUsers:[myInfo], timestamp:serverTimestamp(), type:'repost'
        })
        showToast('✅ Reposted to Socialgati!')
      }
      setRepostItem(null)
    } catch { showToast('Repost failed') }
    finally { setReposting(false) }
  }, [user])

  // ── Filter ────────────────────────────────────────────────────
  const displayed = items.filter(n => {
    if (cat === '🔴 Live') return true
    if (cat !== 'All' && n.category !== cat) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return n.title?.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div style={{background:'var(--bg)',minHeight:'100dvh',paddingBottom:80}}
      onTouchStart={e=>{window._lnSwipeX=e.touches[0].clientX;window._lnSwipeY=e.touches[0].clientY}}
      onTouchEnd={e=>{
        const dx=e.changedTouches[0].clientX-(window._lnSwipeX||0)
        const dy=Math.abs(e.changedTouches[0].clientY-(window._lnSwipeY||0))
        if(dx<-80&&dy<60) navigate('/')
      }}>
      <style>{`
        @keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
        @keyframes lnSlideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .ln-cat::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <header style={{position:'sticky',top:0,zIndex:100,background:'var(--header-bg)',backdropFilter:'blur(20px)',borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',height:56}}>
          <button onClick={()=>navigate('/')} style={{width:34,height:34,borderRadius:'50%',background:'var(--surface2)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:15,flexShrink:0}}>
            <i className="fas fa-arrow-left"/>
          </button>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#e53935',display:'inline-block',animation:'livePulse 1.2s infinite',flexShrink:0}}/>
              <span style={{fontSize:18,fontWeight:800,color:'var(--ink)',letterSpacing:'-.2px'}}>Live News</span>
            </div>
            <div style={{fontSize:10,color:'var(--muted)',fontWeight:500}}>Real-time from database</div>
          </div>
          <button onClick={()=>setShowSearch(s=>!s)}
            style={{width:36,height:36,borderRadius:10,background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className={showSearch?'fas fa-times':'fas fa-search'}/>
          </button>
          <button onClick={()=>navigate('/news')}
            style={{padding:'6px 14px',background:'#1a73e8',color:'#fff',borderRadius:99,fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>
            NewsTally
          </button>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div style={{padding:'0 16px 10px'}}>
            <div style={{position:'relative'}}>
              <i className="fas fa-search" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',fontSize:13,pointerEvents:'none'}}/>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search live news..."
                style={{width:'100%',padding:'9px 34px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,fontSize:14,outline:'none',color:'var(--ink)',boxSizing:'border-box'}}/>
              {search && <button onClick={()=>setSearch('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:4}}><i className="fas fa-times-circle"/></button>}
            </div>
          </div>
        )}

        {/* Category filter chips */}
        <div className="ln-cat" style={{display:'flex',gap:8,padding:'0 16px 10px',overflowX:'auto',scrollbarWidth:'none'}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCat(c)}
              style={{padding:'5px 14px',borderRadius:99,border:'none',fontSize:12,fontWeight:700,flexShrink:0,cursor:'pointer',
                background: cat===c ? '#1a73e8' : 'var(--surface2)',
                color: cat===c ? '#fff' : 'var(--muted)',
                boxShadow: cat===c ? '0 2px 8px rgba(26,115,232,.35)' : 'none'}}>
              {c}
            </button>
          ))}
        </div>
      </header>

      {/* "New items" banner */}
      {showNew && newCount > 0 && (
        <div style={{position:'sticky',top:0,zIndex:90,display:'flex',justifyContent:'center',padding:'8px 0'}}>
          <button onClick={scrollToTop}
            style={{display:'flex',alignItems:'center',gap:8,padding:'8px 20px',background:'#e53935',color:'#fff',borderRadius:99,fontSize:13,fontWeight:700,border:'none',cursor:'pointer',boxShadow:'0 3px 14px rgba(229,57,53,.45)'}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'#fff',animation:'livePulse 1s infinite',display:'inline-block'}}/>
            {newCount} new {newCount===1?'article':'articles'} — Tap to see
          </button>
        </div>
      )}

      <div ref={topRef}/>

      {/* Feed */}
      <div style={{padding:'8px 12px'}}>
        {/* Stats bar */}
        {!loading && (
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 4px 10px',borderBottom:'1px solid var(--border)',marginBottom:8}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'#e53935',animation:'livePulse 1.2s infinite',display:'inline-block',flexShrink:0}}/>
            <span style={{fontSize:12,color:'var(--muted)',fontWeight:600}}>
              {displayed.length} articles · Updates in real-time
            </span>
            <span style={{marginLeft:'auto',fontSize:11,color:'var(--muted)'}}>
              {cat === 'All' ? 'All categories' : cat}
            </span>
          </div>
        )}

        {loading
          ? Array.from({length:5}).map((_,i)=><Skeleton key={i}/>)
          : displayed.length === 0
            ? (
              <div style={{textAlign:'center',padding:'60px 20px'}}>
                <i className="fas fa-newspaper" style={{fontSize:40,color:'var(--border)',marginBottom:16,display:'block'}}/>
                <p style={{fontWeight:700,color:'var(--ink)',marginBottom:6}}>No articles found</p>
                <p style={{fontSize:13,color:'var(--muted)'}}>Try a different category or search</p>
              </div>
            )
            : displayed.map(item => (
              <LiveCard key={item.id} item={item}
                isNew={newIds.has(item.id)}
                onRepost={()=>setRepostItem(item)}
                onShare={()=>setShareItem(item)}/>
            ))
        }
      </div>

      {repostItem && <RepostModal item={repostItem} onClose={()=>setRepostItem(null)} onConfirm={handleRepost} reposting={reposting}/>}
      {shareItem  && <ShareModal  item={shareItem}  onClose={()=>setShareItem(null)}/>}
      {showAuth   && <AuthModal   onClose={()=>setShowAuth(false)}/>}
      <BottomNav/>
    </div>
  )
}
