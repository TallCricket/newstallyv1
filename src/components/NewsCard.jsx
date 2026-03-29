import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { timeAgo, catIcon } from '../utils'

export default function NewsCard({ item, featured = false, onRepost }) {
  const [imgErr, setImgErr] = useState(false)
  const navigate = useNavigate()

  // \u2705 FIX: Navigate to internal NewsOpen page instead of opening external URL
  const handleClick = () => {
    navigate(`/news/${item.id}`)
  }

  return (
    <div className="news-card fade-up" onClick={handleClick}>
      {item.image && !imgErr && (
        <div style={{ width:'100%', aspectRatio: featured ? '16/7' : '16/9', overflow:'hidden', background:'#f0f0f0' }}>
          <img src={item.image} alt={item.title} loading="lazy" onError={()=>setImgErr(true)}
            style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .5s' }}/>
        </div>
      )}
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:6, flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:10, fontWeight:700, color:'#1a73e8', textTransform:'uppercase', letterSpacing:'.06em', display:'flex', alignItems:'center', gap:4 }}>
            <i className={catIcon(item.category)} style={{ fontSize:9 }}/> {item.category}
          </span>
          <span style={{ fontSize:10, color:'#9aa0a6' }}>\u2022</span>
          <span style={{ fontSize:10, color:'#9aa0a6', fontWeight:500 }}>{item.source}</span>
          <span style={{ fontSize:10, color:'#9aa0a6', marginLeft:'auto' }}>{timeAgo(item.date)}</span>
        </div>
        <div style={{ fontSize: featured?18:15, fontWeight:600, lineHeight:1.5, color:'#202124', flex:1 }}>
          {item.title}
        </div>
        {item.description && (
          <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.5 }}>
            {item.description.substring(0, 100)}{item.description.length > 100 ? '...' : ''}
          </div>
        )}
        {onRepost && (
          <div style={{ display:'flex', gap:8, marginTop:4 }} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>onRepost(item)} style={{ fontSize:12, color:'#1a73e8', fontWeight:600, display:'flex', alignItems:'center', gap:4, padding:'4px 0' }}>
              <i className="fas fa-retweet"/> Repost to Community
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
