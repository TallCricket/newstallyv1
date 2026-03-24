import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { doc, getDoc, collection, query, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { timeAgo, catIcon } from '../utils'
import NewsCard from '../components/NewsCard'
import BottomNav from '../components/BottomNav'

export default function NewsOpen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const snap = await getDoc(doc(db, 'news', id))
        if (snap.exists()) {
          const d = { id: snap.id, ...snap.data() }
          setItem(d)
          // Load related
          const relSnap = await getDocs(query(collection(db, 'news'), limit(10)))
          const rel = relSnap.docs.map(d=>({id:d.id,...d.data()})).filter(n=>n.id!==id&&n.title).slice(0,4)
          setRelated(rel)
        }
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

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
      <div style={{ maxWidth:720, margin:'0 auto', minHeight:'100dvh', background:'#fff', paddingBottom:80 }}>
        {/* Back */}
        <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid #f0f0f0', position:'sticky', top:0, background:'rgba(255,255,255,.97)', backdropFilter:'blur(20px)', zIndex:50 }}>
          <button onClick={()=>navigate(-1)} className="page-back-btn"><i className="fas fa-arrow-left"/></button>
          <span style={{ fontSize:13, fontWeight:600, color:'#202124', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.source}</span>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button className="icon-btn" onClick={()=>{
              if(navigator.share) navigator.share({title:item.title,url:item.url})
              else { navigator.clipboard?.writeText(item.url); }
            }}><i className="fas fa-share-nodes"/></button>
          </div>
        </div>

        {/* Image */}
        {item.image && (
          <img src={item.image} alt={item.title} style={{ width:'100%', maxHeight:280, objectFit:'cover' }}
            onError={e=>e.target.style.display='none'}/>
        )}

        <div style={{ padding:'20px 16px' }}>
          {/* Category */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ background:'#e8f0fe', color:'#1a73e8', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:4, textTransform:'uppercase', letterSpacing:'.05em' }}>
              <i className={catIcon(item.category)} style={{ marginRight:4 }}/>{item.category}
            </span>
            <span style={{ fontSize:11, color:'#9aa0a6' }}>{item.source}</span>
            <span style={{ fontSize:11, color:'#9aa0a6', marginLeft:'auto' }}>{timeAgo(item.date||item.pubDate)}</span>
          </div>

          {/* Title */}
          <h1 style={{ fontSize:22, fontWeight:700, lineHeight:1.4, color:'#202124', marginBottom:16 }}>{item.title}</h1>

          {/* Description */}
          {item.description && (
            <p style={{ fontSize:16, lineHeight:1.75, color:'#444', marginBottom:24 }}>{item.description}</p>
          )}

          {/* Read Full */}
          {item.url && item.url !== '#' && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px', background:'#1a73e8', color:'#fff', borderRadius:8, fontWeight:600, fontSize:14, marginBottom:32 }}>
              Read Full Article <i className="fas fa-external-link-alt"/>
            </a>
          )}

          {/* Related */}
          {related.length > 0 && (
            <div>
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:16, color:'#202124' }}>Related News</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {related.map(r => <NewsCard key={r.id} item={r}/>)}
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav/>
    </>
  )
}
