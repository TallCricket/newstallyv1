import { useState, useEffect } from 'react'
import {
  collection, addDoc, serverTimestamp, query,
  orderBy, limit, getDocs, deleteDoc, doc,
  setDoc, getDoc, updateDoc
} from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { db, auth } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo } from '../utils'
import { useNavigate } from 'react-router-dom'

const MANAGER_EMAIL  = 'newstallyofficial@gmail.com'
const RANKING_DOC_ID = 'category_rankings'
const CAT_OPTIONS    = ['National','World','Business','Technology','Health','Education','Sports','General','Entertainment','Cricket','Politics','Science','Environment','Culture']
const EMPTY_FORM     = { title:'', description:'', url:'', image:'', category:'National', source:'', pubDate:'', author:'' }

// ── Login screen ──────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async e => {
    e.preventDefault()
    if (email !== MANAGER_EMAIL) { setError('Access denied. Unauthorized email.'); return }
    setLoading(true); setError('')
    try { await signInWithEmailAndPassword(auth, email, password) }
    catch(err) { setError(err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' ? 'Invalid password' : 'Login failed: ' + err.message) }
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
          {[['email','Email','email',email,setEmail,'manager email'],['password','Password','password',password,setPassword,'••••••••']].map(([id,label,type,val,set,ph]) => (
            <div key={id} style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</label>
              <input type={type} value={val} onChange={e => set(e.target.value)} required placeholder={ph}
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }}
                onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
            </div>
          ))}
          {error && <div style={{ padding:'10px 14px', background:'rgba(234,67,53,.1)', border:'1px solid rgba(234,67,53,.3)', borderRadius:8, fontSize:13, color:'#ea4335', marginBottom:16 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? <><i className="fas fa-spinner fa-spin"/> Signing in...</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
export default function ManagerPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [recentNews, setRecentNews]     = useState([])
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [activeTab, setActiveTab]       = useState('add')

  // ── Category Ranking state ──────────────────────────────────────
  const [rankings, setRankings]         = useState([])        // [{cat, rank, color}]
  const [loadingRanks, setLoadingRanks] = useState(false)
  const [savingRanks, setSavingRanks]   = useState(false)
  const [dragIdx, setDragIdx]           = useState(null)

  if (!user) return <LoginScreen/>
  if (user.email !== MANAGER_EMAIL) return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg)', gap:16 }}>
      <i className="fas fa-lock" style={{ fontSize:48, color:'#ea4335' }}/>
      <h2 style={{ color:'var(--ink)', fontWeight:700 }}>Access Denied</h2>
      <button onClick={() => signOut(auth).then(() => navigate('/'))}
        style={{ padding:'10px 24px', background:'#ea4335', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>Sign Out</button>
    </div>
  )

  // ── Helpers ──
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const inputStyle = { width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }
  const labelStyle = { fontSize:12, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'.04em' }

  // ── Add news ──
  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.title.trim()) return showToast('Title is required')
    setSaving(true)
    try {
      await addDoc(collection(db, 'news'), {
        title: form.title.trim(), description: form.description.trim(),
        url: form.url.trim()||'', image: form.image.trim()||'',
        category: form.category, source: form.source.trim()||'NewsTally',
        author: form.author.trim()||'',
        pubDate: form.pubDate || new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        addedBy: user.email, manualEntry: true,
        timestamp: serverTimestamp()
      })
      showToast('✅ News added successfully!')
      setForm(EMPTY_FORM)
    } catch(e) { showToast('Failed: ' + e.message) }
    finally { setSaving(false) }
  }

  // ── Load recent ──
  const loadRecent = async () => {
    setLoadingRecent(true)
    try {
      const snap = await getDocs(query(collection(db,'news'), orderBy('fetchedAt','desc'), limit(30)))
      setRecentNews(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    } catch {
      try {
        const snap2 = await getDocs(query(collection(db,'news'), limit(30)))
        setRecentNews(snap2.docs.map(d => ({ id:d.id, ...d.data() })))
      } catch(e2) { showToast('Load failed: ' + e2.message) }
    }
    setLoadingRecent(false)
  }

  const handleDelete = async id => {
    if (!window.confirm('Delete this article?')) return
    try { await deleteDoc(doc(db,'news',id)); setRecentNews(p => p.filter(n => n.id !== id)); showToast('Deleted ✅') }
    catch(e) { showToast('Delete failed: ' + e.message) }
  }

  // ── Load rankings ──
  const loadRankings = async () => {
    setLoadingRanks(true)
    try {
      // First get all distinct categories in the news collection
      const snap = await getDocs(query(collection(db,'news'), limit(300)))
      const allCats = [...new Set(snap.docs.map(d => d.data().category).filter(Boolean))].sort()

      // Load saved rankings
      const rankSnap = await getDoc(doc(db, 'manager', RANKING_DOC_ID)).catch(() => null)
      const savedRanks = rankSnap?.exists() ? (rankSnap.data().rankings || []) : []

      // Merge: saved rankings first (in order), then any unsaved categories appended
      const rankedCats = savedRanks.map(r => r.category).filter(c => allCats.includes(c))
      const unrankedCats = allCats.filter(c => !rankedCats.includes(c))
      const merged = [
        ...rankedCats.map((cat, i) => ({ category: cat, rank: i + 1 })),
        ...unrankedCats.map((cat, i) => ({ category: cat, rank: rankedCats.length + i + 1 }))
      ]
      setRankings(merged)
    } catch(e) { showToast('Load rankings failed: ' + e.message) }
    setLoadingRanks(false)
  }

  // ── Save rankings ──
  const saveRankings = async () => {
    setSavingRanks(true)
    try {
      await setDoc(doc(db, 'manager', RANKING_DOC_ID), {
        rankings: rankings.map((r, i) => ({ category: r.category, rank: i + 1 })),
        updatedAt: serverTimestamp()
      })
      showToast('Rankings saved ✅')
    } catch(e) { showToast('Save failed: ' + e.message) }
    setSavingRanks(false)
  }

  // ── Drag-and-drop reorder ──
  const moveUp   = i => { if (i === 0) return; const r = [...rankings]; [r[i-1], r[i]] = [r[i], r[i-1]]; setRankings(r) }
  const moveDown = i => { if (i === rankings.length-1) return; const r = [...rankings]; [r[i], r[i+1]] = [r[i+1], r[i]]; setRankings(r) }
  const moveToTop = i => { const r = [...rankings]; const [item] = r.splice(i, 1); r.unshift(item); setRankings(r) }

  const CAT_COLORS = { National:'#e53935', World:'#1a73e8', Business:'#34a853', Technology:'#9334e6', Health:'#f4a261', Education:'#0077b6', Sports:'#ff6d00', General:'#546e7a', Entertainment:'#ad1457', Cricket:'#e53935', Politics:'#1a73e8', Science:'#00897b' }

  const TABS = [['add','➕ Add News'], ['recent','📋 Recent'], ['ranking','🏆 Category Ranking']]

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
      <div style={{ display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)', overflowX:'auto' }}>
        {TABS.map(([k,l]) => (
          <button key={k}
            onClick={() => { setActiveTab(k); if(k==='recent') loadRecent(); if(k==='ranking') loadRankings() }}
            style={{ padding:'12px 16px', fontSize:13, fontWeight:700, background:'none', border:'none', cursor:'pointer', color: activeTab===k ? '#1a73e8' : 'var(--muted)', borderBottom: activeTab===k ? '2.5px solid #1a73e8' : '2.5px solid transparent', whiteSpace:'nowrap', flexShrink:0 }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── ADD NEWS ── */}
      {activeTab === 'add' && (
        <div style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px 80px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 16px', marginBottom:16, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                <i className="fas fa-asterisk" style={{ color:'#ea4335', fontSize:10 }}/> Required Fields
              </div>
              {[
                { key:'title', label:'Title *', ph:'News headline', type:'text' },
                { key:'source', label:'Source *', ph:'e.g. NewsTally, DD News, ANI', type:'text' },
              ].map(({ key, label, ph, type }) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} required={label.includes('*')} placeholder={ph} style={inputStyle}
                    onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <label style={labelStyle}>Category *</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} required style={{ ...inputStyle, cursor:'pointer' }}>
                  {CAT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 16px', marginBottom:16, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>Optional Fields</div>
              {[
                { key:'url', label:'Article URL', ph:'https://example.com/article', type:'url' },
                { key:'image', label:'Image URL', ph:'https://example.com/image.jpg', type:'url' },
                { key:'author', label:'Author', ph:'Reporter name', type:'text' },
              ].map(({ key, label, ph, type }) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph} style={inputStyle}
                    onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
                  {key === 'image' && form.image && (
                    <img src={form.image} alt="" style={{ width:'100%', height:120, objectFit:'cover', borderRadius:8, marginTop:8 }} onError={e => e.target.style.display='none'}/>
                  )}
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Summary..." rows={3}
                  style={{ ...inputStyle, resize:'vertical', lineHeight:1.6 }}
                  onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={labelStyle}>Publish Date & Time</label>
                <input type="datetime-local" value={form.pubDate ? new Date(form.pubDate).toISOString().slice(0,16) : ''}
                  onChange={e => set('pubDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  style={inputStyle} onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Leave blank to use current time</p>
              </div>
            </div>

            {/* Preview */}
            {form.title && (
              <div style={{ background:'var(--surface)', borderRadius:14, padding:16, marginBottom:16, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:12, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:12 }}>Preview</div>
                {form.image && <img src={form.image} alt="" style={{ width:'100%', height:140, objectFit:'cover', borderRadius:10, marginBottom:10 }} onError={e => e.target.style.display='none'}/>}
                <div style={{ fontSize:11, fontWeight:800, color:'#1a73e8', textTransform:'uppercase', marginBottom:6 }}>{form.category} · {form.source||'NewsTally'}</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', lineHeight:1.4, marginBottom:6 }}>{form.title}</div>
                {form.description && <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>{form.description.substring(0,200)}{form.description.length>200?'...':''}</div>}
              </div>
            )}

            <button type="submit" disabled={saving || !form.title.trim()}
              style={{ width:'100%', padding:'14px', background: form.title.trim() ? 'linear-gradient(135deg,#1a73e8,#1557b0)' : 'var(--border)', color: form.title.trim() ? '#fff' : 'var(--muted)', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: form.title.trim() ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {saving ? <><i className="fas fa-spinner fa-spin"/> Adding...</> : <><i className="fas fa-plus"/> Add to NewsTally</>}
            </button>
          </form>
        </div>
      )}

      {/* ── RECENT NEWS ── */}
      {activeTab === 'recent' && (
        <div style={{ maxWidth:640, margin:'0 auto', padding:'12px 16px 80px' }}>
          {loadingRecent ? (
            <div style={{ padding:40, textAlign:'center' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:24, color:'var(--muted)' }}/></div>
          ) : recentNews.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}>
              <i className="fas fa-newspaper" style={{ fontSize:36, display:'block', marginBottom:12, opacity:.3 }}/>
              <p>No news articles found</p>
            </div>
          ) : recentNews.map(n => (
            <div key={n.id} style={{ background:'var(--surface)', borderRadius:12, padding:'12px 14px', marginBottom:10, border:'1px solid var(--border)', display:'flex', gap:12, alignItems:'flex-start' }}>
              {n.image && <img src={n.image} alt="" style={{ width:70, height:56, borderRadius:8, objectFit:'cover', flexShrink:0 }} onError={e => e.target.style.display='none'}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, fontWeight:800, color: CAT_COLORS[n.category]||'#1a73e8', textTransform:'uppercase', marginBottom:4 }}>{n.category} · {n.source}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', lineHeight:1.4, marginBottom:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{n.title}</div>
                <div style={{ fontSize:11, color:'var(--muted)', display:'flex', gap:8 }}>
                  <span>{timeAgo(n.pubDate||n.fetchedAt)}</span>
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

      {/* ── CATEGORY RANKING ── */}
      {activeTab === 'ranking' && (
        <div style={{ maxWidth:640, margin:'0 auto', padding:'16px 16px 80px' }}>
          <div style={{ background:'var(--surface)', borderRadius:14, padding:'16px', marginBottom:16, border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--ink)', marginBottom:3 }}>Category Rankings</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>Drag ↑↓ to reorder how categories appear in news</div>
              </div>
              <button onClick={saveRankings} disabled={savingRanks || rankings.length === 0}
                style={{ padding:'9px 18px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                {savingRanks ? <><i className="fas fa-spinner fa-spin"/> Saving...</> : <><i className="fas fa-save"/> Save Order</>}
              </button>
            </div>

            {loadingRanks ? (
              <div style={{ padding:30, textAlign:'center' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:22, color:'var(--muted)' }}/></div>
            ) : rankings.length === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 20px', color:'var(--muted)' }}>
                <i className="fas fa-layer-group" style={{ fontSize:32, marginBottom:10, display:'block', opacity:.3 }}/>
                <p>No categories found in database yet</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {rankings.map((item, i) => {
                  const ac = CAT_COLORS[item.category] || '#546e7a'
                  return (
                    <div key={item.category}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)', transition:'opacity .2s', cursor:'default' }}>
                      {/* Rank number */}
                      <div style={{ width:28, height:28, borderRadius:8, background:ac, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>
                        {i + 1}
                      </div>

                      {/* Category name */}
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{item.category}</span>
                      </div>

                      {/* Controls */}
                      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                        <button onClick={() => moveToTop(i)} disabled={i === 0}
                          title="Move to top"
                          style={{ width:28, height:28, borderRadius:6, background: i===0 ? 'var(--border)' : 'rgba(26,115,232,.12)', border:'none', color: i===0 ? 'var(--muted)' : '#1a73e8', cursor: i===0 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
                          <i className="fas fa-angles-up"/>
                        </button>
                        <button onClick={() => moveUp(i)} disabled={i === 0}
                          title="Move up"
                          style={{ width:28, height:28, borderRadius:6, background: i===0 ? 'var(--border)' : 'rgba(26,115,232,.12)', border:'none', color: i===0 ? 'var(--muted)' : '#1a73e8', cursor: i===0 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
                          <i className="fas fa-chevron-up"/>
                        </button>
                        <button onClick={() => moveDown(i)} disabled={i === rankings.length - 1}
                          title="Move down"
                          style={{ width:28, height:28, borderRadius:6, background: i===rankings.length-1 ? 'var(--border)' : 'rgba(26,115,232,.12)', border:'none', color: i===rankings.length-1 ? 'var(--muted)' : '#1a73e8', cursor: i===rankings.length-1 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
                          <i className="fas fa-chevron-down"/>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {rankings.length > 0 && (
            <div style={{ background:'rgba(26,115,232,.06)', borderRadius:12, padding:'12px 14px', border:'1px solid rgba(26,115,232,.15)' }}>
              <p style={{ fontSize:12, color:'#1a73e8', fontWeight:600, margin:0 }}>
                <i className="fas fa-info-circle" style={{ marginRight:6 }}/>
                Saved ranking is used in /news/category sidebar and determines the default display order
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
