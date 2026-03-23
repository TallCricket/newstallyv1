import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

export default function NewsOpen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'news', id))
        if (snap.exists()) setItem({ id: snap.id, ...snap.data() })
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    if (id) load()
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: '#1a73e8' }} />
    </div>
  )

  if (!item) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <p style={{ marginBottom: 16, color: '#666' }}>Article not found</p>
      <button onClick={() => navigate('/news')} style={{
        padding: '10px 20px', background: '#1a73e8', color: '#fff',
        border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
      }}>← Back to News</button>
    </div>
  )

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', minHeight: '100dvh', background: '#fff' }}>
      {/* Back button */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: '50%', background: '#f1f3f4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer', fontSize: 16
        }}>
          <i className="fas fa-arrow-left" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#202124' }}>{item.source}</span>
      </div>

      {item.image && (
        <img src={item.image} alt={item.title} style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />
      )}

      <div style={{ padding: '20px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          {item.category} • {item.source}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4, color: '#202124', marginBottom: 16 }}>
          {item.title}
        </h1>
        {item.description && (
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#444', marginBottom: 24 }}>
            {item.description}
          </p>
        )}
        {item.url && item.url !== '#' && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', background: '#1a73e8', color: '#fff',
            borderRadius: 8, fontWeight: 600, fontSize: 14
          }}>
            Read Full Article <i className="fas fa-external-link-alt" />
          </a>
        )}
      </div>
    </div>
  )
}
