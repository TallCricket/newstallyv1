import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import {
  doc, getDoc, collection, query, limit, getDocs, where,
  addDoc, updateDoc, arrayUnion, increment as fbIncrement, serverTimestamp
} from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { timeAgo, catIcon, showToast } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useTranslation } from '../context/TranslationContext'
import { useTranslate } from '../hooks/useTranslate'

const CAT_COLORS = {
  National:'#e53935', World:'#1a73e8', Business:'#34a853',
  Technology:'#9334e6', Health:'#f4a261', Education:'#0077b6',
  Sports:'#ff6d00', General:'#546e7a', Entertainment:'#ad1457'
}

// -- LocalStorage helpers --
function getSavedIds() { try { return JSON.parse(localStorage.getItem('nt_saved_news') || '[]') } catch { return [] } }
function setSavedIds(ids) { localStorage.setItem('nt_saved_news', JSON.stringify(ids)) }
function saveToHistory(item) {
  try {
    const history = JSON.parse(localStorage.getItem('nt_history') || '[]')
    const idx = history.findIndex(h => h.id === item.id)
    if (idx > -1) history.splice(idx, 1)
    history.unshift({ id:item.id, title:item.title, image:item.image, category:item.category, ts:Date.now() })
    localStorage.setItem('nt_history', JSON.stringify(history.slice(0, 20)))
  } catch {}
}

// -- Repost bottom-sheet modal --
function RepostModal({ item, onClose, onConfirm, reposting }) {
  if (!item) return null
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:560, background:'var(--surface)', borderRadius:'20px 20px 0 0', padding:'20px 20px 36px', border:'1px solid var(--border)' }}>
        <div style={{ width:40, height:4, background:'var(--border)', borderRadius:99, margin:'0 auto 16px' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <span style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>Share to Socialgati?</span>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--muted)' }}>
            <i className="fas fa-times"/>
          </button>
        </div>
        <div style={{ display:'flex', gap:12, marginBottom:20, background:'var(--surface2)', padding:12, borderRadius:12 }}>
          {item.image && <img src={item.image} style={{ width:64, height:64, borderRadius:8, objectFit:'cover', flexShrink:0 }} alt=""/>}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:accent, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{item.category}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{item.source}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'13px 0', background:'var(--surface2)', border:'none', borderRadius:12, fontSize:14, fontWeight:600, color:'var(--muted)', cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(item)} disabled={reposting}
            style={{ flex:2, padding:'13px 0', background:'linear-gradient(135deg,#1a73e8,#1557b0)', border:'none', borderRadius:12, color:'#fff', fontSize:14, fontWeight:700, cursor: reposting ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: reposting ? .7 : 1 }}>
            {reposting ? <><i className="fas fa-spinner fa-spin"/> Posting...</> : <><i className="fas fa-retweet"/> Repost</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// -- Related card --
function RelatedCard({ item, onNavigate }) {
  const [imgErr, setImgErr] = useState(false)
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  return (
    <div onClick={onNavigate}
      style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border2)', cursor:'pointer' }}
      onMouseOver={e => e.currentTarget.style.opacity='.75'}
      onMouseOut={e => e.currentTarget.style.opacity='1'}>
      <img
        src={imgErr ? `https://placehold.co/80x60/${accent.slice(1)}/fff?text=NT` : (item.image || `https://placehold.co/80x60/e8f0fe/1a73e8?text=NT`)}
        alt={item.title} loading="lazy" onError={() => setImgErr(true)}
        style={{ width:80, height:60, borderRadius:8, objectFit:'cover', flexShrink:0, background:'var(--surface2)' }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{item.category}</div>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</div>
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{item.source} {"\u00b7"} {timeAgo(item.date)}</div>
      </div>
    </div>
  )
}

// ===================================================================
// MAIN PAGE
// ===================================================================
export default function NewsOpen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { lang, translate, getLangName, t } = useTranslation()

  const [item, setItem]             = useState(null)
  const [related, setRelated]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [saved, setSaved]           = useState(false)
  const [showShare, setShowShare]   = useState(false)
  const [readPct, setReadPct]       = useState(0)
  const [showAuth, setShowAuth]     = useState(false)
  const [repostItem, setRepostItem] = useState(null)
  const [reposting, setReposting]   = useState(false)
  const [translating, setTranslating]   = useState(false)
  const [translated, setTranslated]     = useState(null)   // { title, description }
  const articleRef = useRef(null)

  // Reading progress
  useEffect(() => {
    const onScroll = () => {
      const docHeight = document.body.scrollHeight - window.innerHeight
      if (docHeight > 0) setReadPct(Math.min(100, (window.scrollY / docHeight) * 100))
    }
    window.addEventListener('scroll', onScroll, { passive:true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Load article
  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const snap = await getDoc(doc(db, 'news', id))
        if (snap.exists()) {
          const d = { id:snap.id, ...snap.data() }
          setItem(d)
          setSaved(getSavedIds().includes(snap.id))
          saveToHistory(d)
          let rel = []
          if (d.category) {
            try {
              const catSnap = await getDocs(query(collection(db,'news'), where('category','==',d.category), limit(8)))
              rel = catSnap.docs.map(dc => ({ id:dc.id, ...dc.data() })).filter(n => n.id !== id && n.title)
            } catch {}
          }
          if (rel.length < 3) {
            const fallSnap = await getDocs(query(collection(db,'news'), limit(12)))
            const fallback = fallSnap.docs.map(dc => ({ id:dc.id, ...dc.data() })).filter(n => n.id !== id && n.title)
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

  // -- AUTO-TRANSLATE when article loads or language changes --
  useEffect(() => {
    setShowOriginal(false) // always show translated version by default
    if (!item || lang === 'en') {
      setTranslated(null)
      return
    }
    let cancelled = false
    setTranslating(true)
    Promise.all([
      translate(item.title || ''),
      translate(item.description || '')
    ]).then(([tTitle, tDesc]) => {
      if (!cancelled) {
        setTranslated({ title: tTitle, description: tDesc })
        setTranslating(false)
      }
    }).catch(() => {
      if (!cancelled) setTranslating(false)
    })
    return () => { cancelled = true }
  }, [item, lang]) // eslint-disable-line

  // Save / bookmark
  const toggleSave = () => {
    const ids = getSavedIds()
    if (saved) { setSavedIds(ids.filter(i => i !== id)); setSaved(false); showToast('Removed from saved') }
    else { setSavedIds([id, ...ids]); setSaved(true); showToast('🔖 Saved!') }
  }

  // Share helpers
  const shareUrl = () => `${window.location.origin}/news/${id}`
  const shareWA  = () => item && window.open(`https://wa.me/?text=${encodeURIComponent(`📰 *${item.title}*\n\n${(item.description||'').substring(0,120)}...\n\n🔗 ${shareUrl()}\n\n📲 *NewsTally*`)}`, '_blank')
  const shareTW  = () => item && window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('📰 '+item.title)}&url=${encodeURIComponent(shareUrl())}&via=newstallyofficial`, '_blank')
  const shareTG  = () => item && window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(`📰 ${item.title}\n\n${(item.description||'').substring(0,100)}...`)}`, '_blank')
  const shareCopy = () => {
    navigator.clipboard?.writeText(shareUrl()).then(() => showToast('🔗 Link copied!')).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = shareUrl(); ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy')
      document.body.removeChild(ta); showToast('🔗 Link copied!')
    })
  }
  const handleNativeShare = () => {
    if (navigator.share && item) navigator.share({ title:item.title, url:shareUrl() })
    else setShowShare(s => !s)
  }

  // Smart repost
  const handleRepost = async (newsItem) => {
    if (!user) { setShowAuth(true); return }
    setReposting(true)
    try {
      const uSnap = await getDoc(doc(db,'users',user.uid)).catch(() => null)
      const uData = uSnap?.data() || {}
      const myInfo = { uid:user.uid, username:uData.username||user.displayName||'User', avatar:user.photoURL||'', timestamp:new Date().toISOString() }
      const myRepost = await getDocs(query(
        collection(db,'artifacts',APP_ID,'public','data','reposts'),
        where('newsId','==',String(newsItem.id||newsItem.title)),
        where('repostedBy','array-contains',user.uid), limit(1)
      )).catch(() => ({ empty:true }))
      if (!myRepost.empty) { showToast('Already reposted!'); setRepostItem(null); return }
      const existing = await getDocs(query(
        collection(db,'artifacts',APP_ID,'public','data','reposts'),
        where('newsId','==',String(newsItem.id||newsItem.title)), where('type','==','repost'), limit(1)
      ))
      if (!existing.empty) {
        await updateDoc(existing.docs[0].ref, { repostCount:fbIncrement(1), repostedBy:arrayUnion(user.uid), repostedUsers:arrayUnion(myInfo) })
        showToast('{"\u2705"} You reposted this news!')
      } else {
        await addDoc(collection(db,'artifacts',APP_ID,'public','data','reposts'), {
          userId:user.uid, username:myInfo.username, userAvatar:myInfo.avatar,
          image:newsItem.image||'', headline:newsItem.title, newsUrl:newsItem.url||'',
          newsSource:newsItem.source||'', newsCategory:newsItem.category||'',
          newsId:String(newsItem.id||newsItem.title), likes:[], commentsCount:0, repostCount:1,
          repostedBy:[user.uid], repostedUsers:[myInfo], timestamp:serverTimestamp(), type:'repost'
        })
        showToast('{"\u2705"} Reposted to Socialgati!')
      }
      setRepostItem(null)
    } catch(e) { console.error(e); showToast('Repost failed') }
    finally { setReposting(false) }
  }

  // Show original toggle (translation is now automatic)
  const [showOriginal, setShowOriginal] = useState(false)

  const readTime = item ? Math.max(1, Math.ceil(((item.title||'').length + (item.description||'').length) / 200)) : 1
  const accent   = CAT_COLORS[item?.category] || '#1a73e8'

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:42, height:42, border:'3px solid var(--border)', borderTopColor:'#1a73e8', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 14px' }}/>
        <p style={{ color:'var(--muted)', fontSize:13 }}>Loading article...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  if (!item) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', gap:16, padding:20, background:'var(--bg)' }}>
      <i className="fas fa-newspaper" style={{ fontSize:48, color:'var(--border)' }}/>
      <p style={{ fontWeight:600, color:'var(--muted)' }}>Article not found</p>
      <button onClick={() => navigate('/news')} style={{ padding:'10px 24px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>\u2190 Back to News</button>
    </div>
  )

  return (
    <>
      {/* -- Reading progress bar -- */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:3, background:'var(--border)', zIndex:201 }}>
        <div style={{ height:'100%', width:`${readPct}%`, background:`linear-gradient(90deg,${accent},#9334e6)`, transition:'width .1s', borderRadius:2 }}/>
      </div>

      <div style={{ maxWidth:720, margin:'0 auto', minHeight:'100dvh', background:'var(--surface)', paddingBottom:80 }}>

        {/* -- Sticky header -- */}
        <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--header-bg)', backdropFilter:'blur(20px)', zIndex:100 }}>
          <button onClick={() => navigate(-1)} className="page-back-btn"><i className="fas fa-arrow-left"/></button>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, overflow:'hidden', cursor:'pointer' }} onClick={() => navigate('/news')}>
            <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="NewsTally" style={{ width:26, height:26, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>
            <span style={{ fontSize:16, fontWeight:700, color:'#1a73e8', letterSpacing:'-.3px' }}>NewsTally</span>
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <button className="icon-btn" onClick={toggleSave}>
              <i className={saved ? 'fas fa-bookmark' : 'far fa-bookmark'} style={{ color: saved ? '#1a73e8' : undefined }}/>
            </button>
            <button className="icon-btn" onClick={() => setRepostItem(item)}>
              <i className="fas fa-retweet" style={{ color:'#34a853' }}/>
            </button>
            <button className="icon-btn" onClick={handleNativeShare}>
              <i className="fas fa-share-alt"/>
            </button>
          </div>
        </div>

        {/* -- Hero image -- */}
        {item.image && (
          <div style={{ width:'100%', aspectRatio:'16/9', overflow:'hidden', background:'var(--surface2)' }}>
            <img src={item.image} alt={item.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={e => e.target.style.display='none'}/>
          </div>
        )}

        <div style={{ padding:'20px 16px 0' }}>

          {/* -- Category + read time -- */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:14 }}>
            <span style={{ background:`${accent}20`, color:accent, fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:99, textTransform:'uppercase', letterSpacing:'.07em', display:'flex', alignItems:'center', gap:5 }}>
              <i className={catIcon(item.category)} style={{ fontSize:10 }}/> {item.category || 'News'}
            </span>
            <span style={{ fontSize:12, color:'var(--muted)', display:'flex', alignItems:'center', gap:4 }}>
              <i className="far fa-clock" style={{ fontSize:11 }}/> {readTime} min read
            </span>
          </div>

          {/* -- Title -- */}
          {translating && lang !== 'en' && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'8px 12px', background:'rgba(147,52,230,.06)', borderRadius:8, border:'1px solid rgba(147,52,230,.15)' }}>
              <i className="fas fa-spinner fa-spin" style={{ color:'#9334e6', fontSize:12 }}/>
              <span style={{ fontSize:12, color:'#9334e6', fontWeight:600 }}>Translating to {getLangName()}{"\u2026"}</span>
            </div>
          )}
          <h1 style={{ fontSize:'clamp(20px,4.5vw,28px)', fontWeight:700, lineHeight:1.4, color:'var(--ink)', letterSpacing:'-.3px', marginBottom:16 }}>
            {(!showOriginal && translated?.title) ? translated.title : item.title}
          </h1>

          {/* -- Source bar -- */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'var(--surface2)', borderRadius:10, borderLeft:`3px solid ${accent}`, marginBottom:20, gap:10, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{item.source || 'NewsTally'}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{timeAgo(item.date || item.pubDate)}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={toggleSave}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, background: saved ? `${accent}15` : 'var(--surface)', border: saved ? `1.5px solid ${accent}44` : '1.5px solid var(--border)', fontSize:12, fontWeight:600, color: saved ? accent : 'var(--ink)', cursor:'pointer' }}>
                <i className={saved ? 'fas fa-bookmark' : 'far fa-bookmark'}/> {saved ? t('saved') : t('save')}
              </button>
              <button onClick={() => setRepostItem(item)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, background:'rgba(52,168,83,.1)', border:'1.5px solid rgba(52,168,83,.3)', fontSize:12, fontWeight:700, color:'#2e7d32', cursor:'pointer' }}>
                <i className="fas fa-retweet"/> Repost
              </button>
              {lang !== 'en' && translated && (
                <button onClick={() => setShowOriginal(v => !v)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8,
                    background: showOriginal ? 'var(--surface2)' : 'rgba(147,52,230,.12)',
                    border:`1.5px solid ${showOriginal ? 'var(--border)' : 'rgba(147,52,230,.4)'}`,
                    fontSize:12, fontWeight:700, color: showOriginal ? 'var(--muted)' : '#9334e6', cursor:'pointer' }}>
                  <i className="fas fa-language"/>
                  {showOriginal ? 'Show Translated' : getLangName().split(' ')[0]}
                </button>
              )}
              <button onClick={() => setShowShare(s => !s)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, background:'var(--surface)', border:'1.5px solid var(--border)', fontSize:12, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>
                <i className="fas fa-share-alt"/> Share
              </button>
            </div>
          </div>

          {/* -- Share panel -- */}
          {showShare && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', paddingBottom:16, marginBottom:4, borderBottom:'1px solid var(--border)' }}>
              <button onClick={shareWA} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:99, background:'#25d366', color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                <i className="fab fa-whatsapp"/> WhatsApp
              </button>
              <button onClick={shareTW} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:99, background:'#000', color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                <i className="fab fa-x-twitter"/> X
              </button>
              <button onClick={shareTG} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:99, background:'#0088cc', color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                <i className="fab fa-telegram"/> Telegram
              </button>
              <button onClick={shareCopy} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:99, background:'var(--surface2)', color:'var(--ink)', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                <i className="fas fa-link"/> Copy
              </button>
            </div>
          )}

          {/* -- Article body -- */}
          {(item.description) ? (
            <div ref={articleRef} style={{ fontSize:16, lineHeight:1.85, color:'var(--ink2)', marginBottom:24 }}>
              {translated && !showOriginal && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, padding:'8px 12px', background:'rgba(147,52,230,.08)', borderRadius:8, border:'1px solid rgba(147,52,230,.2)' }}>
                  <i className="fas fa-language" style={{ color:'#9334e6', fontSize:13 }}/>
                  <span style={{ fontSize:12, color:'#9334e6', fontWeight:600 }}>Translated to {getLangName()}</span>
                </div>
              )}
              {((!showOriginal && translated?.description) || item.description).split(/(?<=[.!?\u0964])\s+/).filter(s => s.trim().length > 5).map((s, i) => (
                <p key={i} style={{ marginBottom:14 }}>{s.trim()}</p>
              ))}
            </div>
          ) : (
            <div style={{ padding:28, textAlign:'center', background:'var(--surface2)', borderRadius:12, marginBottom:20 }}>
              <i className="fas fa-newspaper" style={{ fontSize:28, color:'var(--border)', display:'block', marginBottom:10 }}/>
              <p style={{ fontSize:14, color:'var(--muted)' }}>Full article not available in feed.</p>
            </div>
          )}

                    {/* -- Read full + repost buttons -- */}
          <div style={{ display:'flex', gap:10, marginBottom:20 }}>
            {item.url && item.url !== '#' && (
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 0', background:'#1a73e8', color:'#fff', borderRadius:10, fontSize:14, fontWeight:700, textDecoration:'none' }}>
                <i className="fas fa-external-link-alt"/> Read Full Article
              </a>
            )}
            <button onClick={() => setRepostItem(item)}
              style={{ padding:'13px 20px', background:'rgba(52,168,83,.12)', border:'1.5px solid rgba(52,168,83,.35)', borderRadius:10, fontSize:14, fontWeight:700, color:'#2e7d32', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
              <i className="fas fa-retweet"/> Repost
            </button>
          </div>

          {/* -- Tags -- */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20, alignItems:'center', paddingTop:12, borderTop:'1px solid var(--border)' }}>
            {item.category && (
              <span style={{ fontSize:12, fontWeight:600, color:accent, background:`${accent}18`, padding:'4px 12px', borderRadius:99 }}>
                #{item.category}
              </span>
            )}
            {item.source && (
              <span style={{ fontSize:12, color:'var(--muted)', background:'var(--surface2)', padding:'4px 12px', borderRadius:99 }}>
                {item.source}
              </span>
            )}
          </div>

          <div style={{ textAlign:'center', padding:'20px 0', marginTop:8 }}>
            <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(147,52,230,.1)', padding:'10px 20px', borderRadius:99, fontSize:13, fontWeight:700, color:'#9334e6', textDecoration:'none' }}>
              <i className="fas fa-bolt"/> Powered by Socialgati
            </a>
          </div>
        </div>

        {/* -- Related articles -- */}
        {related.length > 0 && (
          <div style={{ padding:'0 16px 20px' }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'var(--ink)', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:4, height:20, background:'#1a73e8', borderRadius:2, display:'inline-block' }}/>
              More like this
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {related.map(r => <RelatedCard key={r.id} item={r} onNavigate={() => navigate(`/news/${r.id}`)}/>)}
            </div>
          </div>
        )}
      </div>

      <RepostModal item={repostItem} onClose={() => setRepostItem(null)} onConfirm={handleRepost} reposting={reposting}/>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <BottomNav/>
    </>
  )
}
