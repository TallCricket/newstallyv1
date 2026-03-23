import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, query, limit } from 'firebase/firestore'
import { db } from '../firebase/config'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import NewsCard from '../components/NewsCard'

const CATEGORIES = ['All', 'National', 'World', 'Business', 'Technology', 'Health', 'Education', 'Sports', 'General']

function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
      <div className="skeleton" style={{ width: '100%', height: 180 }} />
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 10, width: '40%' }} />
        <div className="skeleton" style={{ height: 16, width: '90%' }} />
        <div className="skeleton" style={{ height: 14, width: '70%' }} />
      </div>
    </div>
  )
}

export default function NewsTally() {
  const [allNews, setAllNews]       = useState([])
  const [filtered, setFiltered]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [activecat, setActiveCat]   = useState('All')
  const [search, setSearch]         = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Fetch from Firestore
  const loadNews = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'news'), limit(200)))
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(n => n.title)
        .sort((a, b) => new Date(b.pubDate || b.fetchedAt || b.savedAt || 0) - new Date(a.pubDate || a.fetchedAt || a.savedAt || 0))
      setAllNews(items)
      setFiltered(items)
    } catch (e) {
      console.error('Firestore fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadNews() }, [loadNews])

  // Filter by category + search
  useEffect(() => {
    let result = allNews
    if (activecat !== 'All') {
      result = result.filter(n => n.category === activecat)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.description?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [activecat, search, allNews])

  return (
    <>
      <Header
        title="NewsTally"
        onSearchClick={() => setShowSearch(s => !s)}
      />

      <div className="main-wrapper">

        {/* Search bar */}
        {showSearch && (
          <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: '#9aa0a6', fontSize: 14, pointerEvents: 'none'
              }} />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search news..."
                style={{
                  width: '100%', padding: '10px 12px 10px 36px',
                  background: '#f1f3f4', border: 'none', borderRadius: 10,
                  fontSize: 14, outline: 'none', color: '#202124'
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', color: '#9aa0a6', fontSize: 14
                }}>
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="cat-bar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cat-btn ${activecat === cat ? 'active' : ''}`}
              onClick={() => setActiveCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* News Grid */}
        <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {loading ? (
            // Skeleton
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            // Empty
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9aa0a6' }}>
              <i className="fas fa-newspaper" style={{ fontSize: 40, marginBottom: 12, display: 'block', opacity: 0.4 }} />
              <p style={{ fontWeight: 600, marginBottom: 6 }}>No news found</p>
              <p style={{ fontSize: 13 }}>Try a different category or search term</p>
              <button
                onClick={loadNews}
                style={{
                  marginTop: 16, padding: '10px 24px',
                  background: '#1a73e8', color: '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                ↺ Retry
              </button>
            </div>
          ) : (
            filtered.map((item, i) => (
              <NewsCard key={item.id} item={item} featured={i === 0} />
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </>
  )
}
