import { useEffect, useState, useRef, useCallback } from 'react'
import { collection, getDocs, query, limit } from 'firebase/firestore'
import { db } from '../firebase/config'
import BottomNav from '../components/BottomNav'

const CATS = ['All','National','World','Business','Technology','Sports','Health']

function catIcon(cat) {
  const m = { Sports:'fas fa-futbol', Technology:'fas fa-microchip', Business:'fas fa-chart-line', Health:'fas fa-heart-pulse', National:'fas fa-flag', World:'fas fa-globe', Entertainment:'fas fa-film' }
  return m[cat] || 'fas fa-newspaper'
}

function gradClass(cat) {
  const m = { National:'gc', Sports:'gs', Technology:'gt', Business:'gb', Health:'gp', World:'gd' }
  return m[cat] || 'gc'
}

export default function Shorts() {
  const [allNews, setAllNews] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [curIdx, setCurIdx] = useState(0)
  const [cat, setCat] = useState('All')
  const [cards, setCards] = useState([null, null, null]) // [prev, current, next]
  const vpRef = useRef()
  const trackRef = useRef()
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const isDragging = useRef(false)
  const currentTranslate = useRef(0)
  const VH = useRef(window.innerHeight)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, 'news'), limit(200)))
        const items = snap.docs.map(d=>({id:d.id,...d.data()})).filter(n=>n.title)
          .sort((a,b)=>new Date(b.pubDate||b.fetchedAt||0)-new Date(a.pubDate||a.fetchedAt||0))
        setAllNews(items)
        setFiltered(items)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    let f = allNews
    if (cat !== 'All') f = f.filter(n => n.category === cat)
    setFiltered(f)
    setCurIdx(0)
  }, [cat, allNews])

  useEffect(() => {
    if (filtered.length === 0) return
    setCards([filtered[curIdx-1]||null, filtered[curIdx]||null, filtered[curIdx+1]||null])
  }, [filtered, curIdx])

  const h = VH.current

  const navigate = useCallback((dir) => {
    setCurIdx(prev => {
      const next = prev + dir
      if (next < 0 || next >= filtered.length) return prev
      return next
    })
  }, [filtered.length])

  // Touch handlers
  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    isDragging.current = true
  }

  const onTouchMove = (e) => {
    if (!isDragging.current) return
    const dy = e.touches[0].clientY - touchStartY.current
    const el = trackRef.current
    if (el) el.style.transform = `translate3d(0,${-curIdx * h + dy}px,0)`
  }

  const onTouchEnd = (e) => {
    if (!isDragging.current) return
    isDragging.current = false
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const dt = Date.now() - touchStartTime.current
    const isSwipe = Math.abs(dy) > 60 || (Math.abs(dy) > 30 && dt < 300)
    const el = trackRef.current
    if (el) {
      el.style.transition = 'transform .3s cubic-bezier(.25,.46,.45,.94)'
      if (isSwipe) {
        navigate(dy < 0 ? 1 : -1)
      } else {
        el.style.transform = `translate3d(0,${-curIdx * h}px,0)`
      }
      setTimeout(() => { if (el) el.style.transition = '' }, 350)
    }
  }

  // Update track position when curIdx changes
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.style.transition = 'transform .3s cubic-bezier(.25,.46,.45,.94)'
    el.style.transform = `translate3d(0,${-curIdx * h}px,0)`
    setTimeout(() => { if (el) el.style.transition = '' }, 350)
  }, [curIdx, h])

  if (loading) return (
    <div style={{ position:'fixed', inset:0, background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', color:'#fff' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize:32, marginBottom:12, display:'block' }}/>
        <p style={{ fontSize:14, opacity:.6 }}>Loading Shorts...</p>
      </div>
    </div>
  )

  if (filtered.length === 0) return (
    <div style={{ position:'fixed', inset:0, background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', color:'#fff' }}>
        <i className="fas fa-newspaper" style={{ fontSize:40, marginBottom:12, display:'block', opacity:.4 }}/>
        <p style={{ fontWeight:600 }}>No shorts available</p>
      </div>
      <BottomNav darkMode />
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'#000', overflow:'hidden' }}>
      {/* Category bar */}
      <div className="shorts-cat-bar" style={{ paddingTop: 'calc(8px + env(safe-area-inset-top,0px))' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:8 }}>
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" style={{ width:28, height:28, borderRadius:'50%' }} alt=""/>
        </div>
        {CATS.map(c => (
          <button key={c} className={`short-cat-btn ${cat===c?'active':''}`} onClick={()=>setCat(c)}>{c}</button>
        ))}
      </div>

      {/* Cards track */}
      <div ref={vpRef} id="shorts-vp"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ top: 48 }}>
        <div ref={trackRef} style={{ position:'absolute', top:0, left:0, width:'100%', willChange:'transform', transform:`translate3d(0,0,0)` }}>
          {filtered.map((item, i) => (
            <ShortCard key={item.id} item={item} height={h} idx={i} curIdx={curIdx}/>
          ))}
        </div>
      </div>

      {/* Counter */}
      <div style={{ position:'fixed', top: 'calc(56px + env(safe-area-inset-top,0px))', right:16, background:'rgba(0,0,0,.5)', color:'#fff', padding:'4px 10px', borderRadius:99, fontSize:12, fontWeight:700, zIndex:201 }}>
        {curIdx+1} / {filtered.length}
      </div>

      {/* Bottom nav */}
      <BottomNav darkMode/>
    </div>
  )
}

function ShortCard({ item, height, idx, curIdx }) {
  const [imgErr, setImgErr] = useState(false)
  const visible = Math.abs(idx - curIdx) <= 1

  if (!visible) return <div style={{ position:'absolute', top:idx*height, left:0, width:'100%', height, background:'#000' }}/>

  const desc = (item.description||item.title||'').substring(0, 300)
  const hasImg = item.image && !imgErr

  return (
    <div style={{ position:'absolute', top:idx*height, left:0, width:'100%', height, overflow:'hidden', display:'flex', flexDirection:'column', background:'#111118' }}
      onClick={()=>item.url&&window.open(item.url,'_blank','noopener')}>

      {/* Image top 38% */}
      <div style={{ flex:'0 0 38%', position:'relative', overflow:'hidden', background:'#1a1a2e' }}>
        {hasImg ? (
          <img src={item.image} alt="" loading={Math.abs(idx-curIdx)<=1?'eager':'lazy'}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
            onError={()=>setImgErr(true)}/>
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
            <i className={catIcon(item.category)} style={{ fontSize:36, color:'rgba(255,255,255,.25)' }}/>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(255,255,255,.3)' }}>{item.category}</span>
          </div>
        )}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:60, background:'linear-gradient(to bottom,transparent,#111118)', pointerEvents:'none' }}/>
        {/* Meta overlay */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'8px 14px 4px', display:'flex', alignItems:'center', gap:7, zIndex:2 }}>
          <span style={{ background:'rgba(26,115,232,.9)', color:'#fff', fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:99, textTransform:'uppercase', letterSpacing:'.05em' }}>
            <i className={catIcon(item.category)} style={{ fontSize:9, marginRight:3 }}/>{item.category}
          </span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.6)', fontWeight:600 }}>{item.source}</span>
        </div>
      </div>

      {/* Title */}
      <div style={{ padding:'14px 16px 8px', flexShrink:0 }}>
        <h2 style={{ fontSize:17, fontWeight:700, color:'#fff', lineHeight:1.45, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {item.title}
        </h2>
      </div>

      {/* Description */}
      <div style={{ flex:1, overflow:'hidden', padding:'0 16px', fontSize:14, color:'rgba(255,255,255,.8)', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:6, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
        {desc}
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, borderTop:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.4)', fontWeight:600 }}>{item.source}</span>
        </div>
        <div style={{ display:'flex', gap:8 }} onClick={e=>e.stopPropagation()}>
          <button className="short-btn full" onClick={()=>item.url&&window.open(item.url,'_blank','noopener')}>
            <i className="fas fa-arrow-right"/> Full Story
          </button>
        </div>
      </div>
    </div>
  )
}
