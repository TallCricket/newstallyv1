import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)   return 'Just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  return Math.floor(diff / 86400) + 'd ago'
}

export default function NewsCard({ item, featured = false }) {
  const [imgError, setImgError] = useState(false)
  const navigate = useNavigate()

  const handleClick = () => {
    if (item.url && item.url !== '#') {
      window.open(item.url, '_blank', 'noopener')
    }
  }

  return (
    <div
      className="news-card fade-up"
      onClick={handleClick}
      style={{ marginBottom: featured ? 0 : undefined }}
    >
      {/* Image */}
      {item.image && !imgError && (
        <div style={{
          width: '100%',
          aspectRatio: featured ? '16/7' : '16/9',
          overflow: 'hidden',
          background: '#f0f0f0'
        }}>
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {/* Category + Source */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#1a73e8',
            textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            {item.category}
          </span>
          <span style={{ fontSize: 10, color: '#9aa0a6' }}>•</span>
          <span style={{ fontSize: 10, color: '#9aa0a6', fontWeight: 500 }}>
            {item.source}
          </span>
          <span style={{ fontSize: 10, color: '#9aa0a6', marginLeft: 'auto' }}>
            {timeAgo(item.date)}
          </span>
        </div>

        {/* Title */}
        <div style={{
          fontSize: featured ? 18 : 15,
          fontWeight: 600,
          lineHeight: 1.5,
          color: '#202124',
          flex: 1
        }}>
          {item.title}
        </div>

        {/* Description */}
        {item.description && (
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
            {item.description.substring(0, 100)}
            {item.description.length > 100 ? '...' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
