import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, serverTimestamp, query,
  orderBy, limit, getDocs, deleteDoc, doc,
  updateDoc, setDoc, getDoc, writeBatch, where
} from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { db, auth } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo } from '../utils'
import { useNavigate } from 'react-router-dom'

// {"\u2705"} Only this email can access manager
const MANAGER_EMAIL = 'newstallyofficial@gmail.com'

const CAT_OPTIONS = ['National','World','Business','Technology','Health','Education','Sports','General','Entertainment']

const EMPTY_FORM = {
  title: '', description: '', url: '', image: '',
  category: 'National', source: '', pubDate: '', author: ''
}

function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async e => {
    e.preventDefault()
    if (email !== MANAGER_EMAIL) { setError('Access denied. Unauthorized email.'); return }
    setLoading(true); setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch(err) {
      setError(err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Invalid password' : 'Login failed: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:20 }}>
      <div style={{ width:'100%', maxWidth:380, background:'var(--surface)', borderRadius:20, padding:32, border:'1px solid var(--border)', boxShadow:'var(--shadow-lg)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" style={{ width:56, height:56, borderRadius:'50%', marginBottom:12 }} alt=""/>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>NewsTally Manager</h1>
          <p style={{ fontSize:13, color:'var(--muted)' }}>Authorised access only</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="manager email"
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor='#1a73e8'}
              onBlur={e => e.target.style.borderColor='var(--border)'}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor='#1a73e8'}
              onBlur={e => e.target.style.borderColor='var(--border)'}/>
          </div>
          {error && (
            <div style={{ padding:'10px 14px', background:'rgba(234,67,53,.1)', border:'1px solid rgba(234,67,53,.3)', borderRadius:8, fontSize:13, color:'#ea4335', marginBottom:16 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? <><i className="fas fa-spinner fa-spin"/> Signing in...</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ManagerPage() {
  const { user }    = useAuth()
  const navigate    = useNavigate()

  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [recentNews, setRecentNews]   = useState([])
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [activeTab, setActiveTab]     = useState('add')  // 'add' | 'recent' | 'ranking'

  // -- Ranking state --
  const [rankCat, setRankCat]             = useState('National')
  const [rankItems, setRankItems]         = useState([])
  const [rankLoading, setRankLoading]     = useState(false)
  const [rankSaving, setRankSaving]       = useState(false)
  const [catOrder, setCatOrder]           = useState([...CAT_OPTIONS])
  const [catOrderSaving, setCatOrderSaving] = useState(false)

  // -- ALL HOOKS MUST BE BEFORE EARLY RETURNS --
  // Load saved category order from Firestore on mount
  useEffect(() => {
    if (!user || user.email !== MANAGER_EMAIL) return
    getDoc(doc(db, 'config', 'rankings')).then(snap => {
      if (snap.exists() && Array.isArray(snap.data().categoryOrder))
        setCatOrder(snap.data().categoryOrder)
    }).catch(() => {})
  }, [user])

  // -- Block non-manager users (after all hooks) --
  if (!user) return <LoginScreen />
  if (user.email !== MANAGER_EMAIL) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:16 }}>
        <i className="fas fa-lock" style={{ fontSize:48, color:'#ea4335' }}/>
        <h2 style={{ color:'var(--ink)', fontWeight:700 }}>Access Denied</h2>
        <p style={{ color:'var(--muted)', fontSize:14 }}>You are not authorised to access this page.</p>
        <button onClick={() => signOut(auth).then(() => navigate('/'))}
          style={{ padding:'10px 24px', background:'#ea4335', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>
          Sign Out & Go Home
        </button>
      </div>
    )
  }

  // -- Helpers --
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.title.trim()) return showToast('Title is required')
    if (!form.category) return showToast('Category is required')
    setSaving(true)
    try {
      await addDoc(collection(db, 'news'), {
        title:       form.title.trim(),
        description: form.description.trim(),
        url:         form.url.trim() || '',
        image:       form.image.trim() || '',
        category:    form.category,
        source:      form.source.trim() || 'NewsTally',
        author:      form.author.trim() || '',
        pubDate:     form.pubDate || new Date().toISOString(),
        fetchedAt:   new Date().toISOString(),
        addedBy:     user.email,
        manualEntry: true,
        timestamp:   serverTimestamp()
      })
      showToast('{"\u2705"} News added successfully!')
      setForm(EMPTY_FORM)
    } catch(e) { console.error(e); showToast('Failed to add news: ' + e.message) }
    finally { setSaving(false) }
  }

  const loadRecent = async () => {
    setLoadingRecent(true)
    try {
      const snap = await getDocs(query(collection(db,'news'), orderBy('fetchedAt','desc'), limit(20)))
      setRecentNews(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    } catch {
      try {
        const snap = await getDocs(query(collection(db,'news'), limit(20)))
        setRecentNews(snap.docs.map(d => ({ id:d.id, ...d.data() })))
      } catch(e2) { showToast('Could not load: ' + e2.message) }
    }
    setLoadingRecent(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this news article? This cannot be undone.')) return
    try {
      await deleteDoc(doc(db, 'news', id))
      setRecentNews(prev => prev.filter(n => n.id !== id))
      showToast('Deleted {"\u2705"}')
    } catch(e) { showToast('Delete failed: ' + e.message) }
  }

  // -- Ranking helpers --
  const loadRankItems = async (cat) => {
    setRankLoading(true)
    try {
      let snap
      try {
        snap = await getDocs(query(
          collection(db, 'news'),
          where('category', '==', cat),
          orderBy('rank', 'asc'),
          limit(50)
        ))
      } catch {
        snap = await getDocs(query(
          collection(db, 'news'),
          where('category', '==', cat),
          limit(50)
        ))
      }
      const items = snap.docs.map((d, i) => ({ id: d.id, ...d.data(), rank: d.data().rank ?? (i + 1) }))
      items.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
      setRankItems(items)
    } catch(e) { showToast('Load failed: ' + e.message) }
    setRankLoading(false)
  }

  const moveItem = (idx, dir) => {
    const arr = [...rankItems]
    const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setRankItems(arr)
  }

  const saveRankings = async () => {
    if (!rankItems.length) return
    setRankSaving(true)
    try {
      const batch = writeBatch(db)
      rankItems.forEach((item, i) => batch.update(doc(db, 'news', item.id), { rank: i + 1 }))
      await batch.commit()
      showToast('{"\u2705"} Rankings saved!')
    } catch(e) { showToast('Save failed: ' + e.message) }
    setRankSaving(false)
  }

  const moveCat = (idx, dir) => {
    const arr = [...catOrder]
    const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setCatOrder(arr)
  }

  const saveCatOrder = async () => {
    setCatOrderSaving(true)
    try {
      await setDoc(doc(db, 'config', 'rankings'), { categoryOrder: catOrder }, { merge: true })
      showToast('{"\u2705"} Category order saved!')
    } catch(e) { showToast('Save failed: ' + e.message) }
    setCatOrderSaving(false)
  }

  const inputStyle = {
    width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)',
    borderRadius:10, fontSize:14, outline:'none',
    background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box'
  }
  const labelStyle = { fontSize:12, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'.04em' }
  const fieldStyle = { marginBottom:16 }

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)' }}>
      {/* Header */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, backdropFilter:'blur(20px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => navigate('/')} style={{ width:34, height:34, borderRadius:'50%', background:'var(--surface2)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink)', fontSize:14 }}>
            <i className="fas fa-arrow-left"/>
          </button>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--ink)' }}>News Manager</div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>{user.email}</div>
          </div>
        </div>
        <button onClick={() => signOut(auth).then(() => navigate('/'))}
          style={{ padding:'7px 14px', background:'rgba(234,67,53,.1)', border:'1px solid rgba(234,67,53,.25)', borderRadius:8, fontSize:12, fontWeight:700, color:'#ea4335', cursor:'pointer' }}>
          <i className="fas fa-sign-out-alt" style={{ marginRight:5 }}/>Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        {[['add','\u2795 Add'], ['recent','\u1f4cb Recent'], ['ranking','\u1f3c6 Ranking']].map(([k,l]) => (
          <button key={k} onClick={() => {
            setActiveTab(k)
            if (k === 'recent') loadRecent()
            if (k === 'ranking') loadRankItems(rankCat)
          }}
            style={{ flex:1, padding:'12px', fontSize:13, fontWeight:700, background:'none', border:'none', cursor:'pointer',
              color: activeTab===k ? '#1a73e8' : 'var(--muted)',
              borderBottom: activeTab===k ? '2.5px solid #1a73e8' : '2.5px solid transparent' }}>
            {l}
          </button>
        ))}
      </div>

      {/* -- ADD NEWS TAB -- */}
      {activeTab === 'add' && (
        <div style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px 80px' }}>
          <form onSubmit={handleSubmit}>

            <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 16px', marginBottom:16, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                <i className="fas fa-asterisk" style={{ color:'#ea4335', fontSize:10 }}/> Required Fields
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Title *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} required
                  placeholder="News headline" style={inputStyle}/>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Category *</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} required
                  style={{ ...inputStyle, cursor:'pointer' }}>
                  {CAT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Source *</label>
                <input value={form.source} onChange={e => set('source', e.target.value)}
                  placeholder="e.g. NewsTally, DD News, ANI" style={inputStyle}/>
              </div>
            </div>

            <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 16px', marginBottom:16, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>
                Optional Fields
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Description / Summary</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Short summary of the news..." rows={4}
                  style={{ ...inputStyle, resize:'vertical', lineHeight:1.6 }}/>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Article URL</label>
                <input type="url" value={form.url} onChange={e => set('url', e.target.value)}
                  placeholder="https://example.com/article" style={inputStyle}/>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Image URL</label>
                <input type="url" value={form.image} onChange={e => set('image', e.target.value)}
                  placeholder="https://example.com/image.jpg" style={inputStyle}/>
                {form.image && (
                  <img src={form.image} alt="preview" style={{ width:'100%', height:140, objectFit:'cover', borderRadius:8, marginTop:8 }}
                    onError={e => e.target.style.display='none'}/>
                )}
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Publish Date & Time</label>
                <input type="datetime-local" value={form.pubDate ? new Date(form.pubDate).toISOString().slice(0,16) : ''}
                  onChange={e => set('pubDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  style={inputStyle}/>
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Leave blank to use current time</p>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Author</label>
                <input value={form.author} onChange={e => set('author', e.target.value)}
                  placeholder="Reporter / Author name" style={inputStyle}/>
              </div>
            </div>

            {form.title && (
              <div style={{ background:'var(--surface)', borderRadius:14, padding:'16px', marginBottom:16, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:12, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:12 }}>Preview</div>
                {form.image && <img src={form.image} alt="" style={{ width:'100%', height:160, objectFit:'cover', borderRadius:10, marginBottom:10 }} onError={e => e.target.style.display='none'}/>}
                <div style={{ fontSize:11, fontWeight:800, color:'#1a73e8', textTransform:'uppercase', marginBottom:6 }}>{form.category} {"\u00b7"} {form.source || 'NewsTally'}</div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', lineHeight:1.4, marginBottom:6 }}>{form.title}</div>
                {form.description && <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>{form.description.substring(0,200)}{form.description.length > 200 ? '...' : ''}</div>}
              </div>
            )}

            <button type="submit" disabled={saving || !form.title.trim()}
              style={{ width:'100%', padding:'14px', background: form.title.trim() ? 'linear-gradient(135deg,#1a73e8,#1557b0)' : 'var(--border)', color: form.title.trim() ? '#fff' : 'var(--muted)', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: form.title.trim() ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {saving ? <><i className="fas fa-spinner fa-spin"/> Adding...</> : <><i className="fas fa-plus"/> Add to NewsTally</>}
            </button>
          </form>
        </div>
      )}

      {/* -- RECENT NEWS TAB -- */}
      {activeTab === 'recent' && (
        <div style={{ maxWidth:640, margin:'0 auto', padding:'12px 16px 80px' }}>
          {loadingRecent ? (
            <div style={{ padding:40, textAlign:'center' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:24, color:'var(--muted)' }}/></div>
          ) : recentNews.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}>
              <i className="fas fa-newspaper" style={{ fontSize:36, display:'block', marginBottom:12, opacity:.3 }}/>
              <p>No news articles found</p>
              <button onClick={loadRecent} style={{ marginTop:12, padding:'8px 20px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>
                Load Articles
              </button>
            </div>
          ) : recentNews.map((n) => (
            <div key={n.id} style={{ background:'var(--surface)', borderRadius:12, padding:'14px', marginBottom:10, border:'1px solid var(--border)', display:'flex', gap:12, alignItems:'flex-start' }}>
              {n.image && <img src={n.image} alt="" style={{ width:70, height:56, borderRadius:8, objectFit:'cover', flexShrink:0 }} onError={e => e.target.style.display='none'}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, fontWeight:800, color:'#1a73e8', textTransform:'uppercase', marginBottom:4 }}>{n.category} {"\u00b7"} {n.source}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', lineHeight:1.4, marginBottom:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{n.title}</div>
                <div style={{ fontSize:11, color:'var(--muted)', display:'flex', gap:8, alignItems:'center' }}>
                  <span>{timeAgo(n.pubDate || n.fetchedAt)}</span>
                  {n.manualEntry && <span style={{ background:'rgba(26,115,232,.1)', color:'#1a73e8', padding:'1px 6px', borderRadius:4, fontWeight:700 }}>Manual</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(n.id)}
                style={{ width:32, height:32, borderRadius:8, background:'rgba(234,67,53,.1)', border:'1px solid rgba(234,67,53,.2)', color:'#ea4335', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13 }}>
                <i className="fas fa-trash"/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* -- RANKING TAB -- */}
      {activeTab === 'ranking' && (
        <div style={{ maxWidth:640, margin:'0 auto', padding:'16px 16px 80px' }}>

          {/* Category Order */}
          <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', marginBottom:20, overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:'var(--ink)' }}>\u1f4c2 Category Order</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Controls the order of category tabs in NewsTally</div>
              </div>
              <button onClick={saveCatOrder} disabled={catOrderSaving}
                style={{ padding:'7px 16px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                {catOrderSaving ? <><i className="fas fa-spinner fa-spin"/> Saving{"\u2026"}</> : <><i className="fas fa-save"/> Save</>}
              </button>
            </div>
            <div style={{ padding:'6px 0' }}>
              {catOrder.map((cat, idx) => (
                <div key={cat} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom: idx < catOrder.length-1 ? '1px solid var(--border2)' : 'none' }}>
                  <span style={{ width:24, height:24, borderRadius:'50%', background:'rgba(26,115,232,.1)', color:'#1a73e8', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {idx + 1}
                  </span>
                  <span style={{ flex:1, fontSize:14, fontWeight:600, color:'var(--ink)' }}>{cat}</span>
                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={() => moveCat(idx, -1)} disabled={idx === 0}
                      style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', color: idx===0 ? 'var(--border)' : '#1a73e8', cursor: idx===0 ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
                      <i className="fas fa-chevron-up"/>
                    </button>
                    <button onClick={() => moveCat(idx, 1)} disabled={idx === catOrder.length-1}
                      style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', color: idx===catOrder.length-1 ? 'var(--border)' : '#1a73e8', cursor: idx===catOrder.length-1 ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
                      <i className="fas fa-chevron-down"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Article Ranking */}
          <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface2)' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--ink)', marginBottom:10 }}>\u1f4f0 Article Ranking by Category</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <select value={rankCat} onChange={e => { setRankCat(e.target.value); loadRankItems(e.target.value) }}
                  style={{ flex:1, minWidth:120, padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, fontWeight:600, background:'var(--surface)', color:'var(--ink)', cursor:'pointer', outline:'none' }}>
                  {CAT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => loadRankItems(rankCat)}
                  style={{ padding:'8px 14px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface2)', color:'var(--muted)', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                  <i className="fas fa-sync-alt"/> Refresh
                </button>
                <button onClick={saveRankings} disabled={rankSaving || rankItems.length === 0}
                  style={{ padding:'8px 16px', background: rankItems.length ? '#34a853' : 'var(--border)', color: rankItems.length ? '#fff' : 'var(--muted)', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor: rankItems.length ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:6 }}>
                  {rankSaving ? <><i className="fas fa-spinner fa-spin"/> Saving{"\u2026"}</> : <><i className="fas fa-save"/> Save Rankings</>}
                </button>
              </div>
            </div>

            {rankLoading ? (
              <div style={{ padding:40, textAlign:'center' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:22, color:'var(--muted)' }}/></div>
            ) : rankItems.length === 0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--muted)' }}>
                <i className="fas fa-list-ol" style={{ fontSize:32, marginBottom:10, display:'block', opacity:.3 }}/>
                <p style={{ fontWeight:600 }}>No articles in {rankCat}</p>
                <p style={{ fontSize:12, marginTop:4 }}>Add news to this category first, then refresh</p>
              </div>
            ) : (
              <div>
                <div style={{ padding:'8px 16px 6px', fontSize:11, color:'var(--muted)', fontWeight:600 }}>
                  {rankItems.length} articles {"\u00b7"} {"\u2191"}{"\u2193"} to reorder {"\u00b7"} #1 appears first in feed
                </div>
                {rankItems.map((item, idx) => (
                  <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px',
                    borderTop:'1px solid var(--border2)',
                    background: idx < 3 ? 'rgba(52,168,83,.03)' : 'transparent' }}>
                    <div style={{ width:26, textAlign:'center', flexShrink:0 }}>
                      <span style={{ fontSize:13, fontWeight:800, color: idx < 3 ? '#34a853' : 'var(--muted)' }}>#{idx+1}</span>
                    </div>
                    {item.image ? (
                      <img src={item.image} alt="" style={{ width:48, height:36, borderRadius:6, objectFit:'cover', flexShrink:0 }}
                        onError={e => e.target.style.display='none'}/>
                    ) : (
                      <div style={{ width:48, height:36, borderRadius:6, background:'var(--surface2)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <i className="fas fa-newspaper" style={{ fontSize:14, color:'var(--muted)' }}/>
                      </div>
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', lineHeight:1.4,
                        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{item.source || ''} {"\u00b7"} {timeAgo(item.pubDate || item.fetchedAt)}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3, flexShrink:0 }}>
                      <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                        style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)',
                          color: idx===0 ? 'var(--border)' : '#1a73e8', cursor: idx===0 ? 'default' : 'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
                        <i className="fas fa-chevron-up"/>
                      </button>
                      <button onClick={() => moveItem(idx, 1)} disabled={idx === rankItems.length-1}
                        style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)',
                          color: idx===rankItems.length-1 ? 'var(--border)' : '#1a73e8', cursor: idx===rankItems.length-1 ? 'default' : 'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
                        <i className="fas fa-chevron-down"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
