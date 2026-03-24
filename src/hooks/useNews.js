import { useState, useCallback } from 'react'
import { collection, getDocs, query, limit } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useNews() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const normalize = (d) => {
    const n = d.data ? d.data() : d
    return {
      id: d.id || n.id || String(Math.random()),
      title: n.title || n.headline || '',
      description: n.description || '',
      image: n.image && n.image.startsWith('http') ? n.image : '',
      category: n.category || 'General',
      source: n.source || 'DD News',
      date: n.pubDate || n.fetchedAt || n.savedAt || n.date || '',
      url: n.url || '#',
    }
  }

  const fetchNews = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const snap = await getDocs(query(collection(db, 'news'), limit(200)))
      if (snap.empty) { setError('No news available yet.'); setLoading(false); return }
      const items = snap.docs.map(normalize).filter(n => n.title)
        .sort((a, b) => new Date(b.date||0) - new Date(a.date||0))
      setNews(items)
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { news, loading, error, fetchNews }
}
