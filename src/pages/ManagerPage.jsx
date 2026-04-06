import { useState, useEffect } from 'react'
import {
  collection, addDoc, serverTimestamp, query,
  orderBy, limit, getDocs, deleteDoc, doc, updateDoc
} from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { db, auth } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { showToast, timeAgo } from '../utils'
import { useNavigate } from 'react-router-dom'

const MANAGER_EMAIL = 'newstallyofficial@gmail.com'
const AUTHOR_NAME   = 'Shivank'

// Categories for regular news + NewsTally (author articles)
const CAT_OPTIONS = [
  'NewsTally',
  'National','World','Business','Technology',
  'Health','Education','Sports','General','Entertainment','Cricket'
]

const EMPTY_FORM = {
  title:'', description:'', url:'', image:'',
  category:'NewsTally', source:'NewsTally', pubDate:'', author: AUTHOR_NAME
}

// ── Login Screen ──────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

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
      <div style={{ width:'100%', maxWidth:380, background:'var(--surface)', borderRadius:20, padding:32, border:'1px solid var(--border)', boxShadow:'0 8px 32px rgba(0,0,0,.1)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" style={{ width:56, height:56, borderRadius:'50%', marginBottom:12 }} alt=""/>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>NewsTally Manager</h1>
          <p style={{ fontSize:13, color:'var(--muted)' }}>Authorised access only</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="manager@email.com"
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
          </div>
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

// ── Main Manager Page ─────────────────────────────────────────────
export default function ManagerPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [posts, setPosts]           = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [activeTab, setActiveTab]   = useState('add')
  const [editId, setEditId]         = useState(null)

  useEffect(() => {
    if (activeTab === 'posts' && user?.email === MANAGER_EMAIL) loadPosts()
  }, [activeTab]) // eslint-disable-line

  if (!user) return <LoginScreen />
  if (user.email !== MANAGER_EMAIL) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:16 }}>
      <i className="fas fa-lock" style={{ fontSize:48, color:'#ea4335' }}/>
      <h2 style={{ color:'var(--ink)', fontWeight:700 }}>Access Denied</h2>
      <button onClick={() => signOut(auth).then(() => navigate('/'))}
        style={{ padding:'10px 24px', background:'#ea4335', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>
        Sign Out
      </button>
    </div>
  )

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  // ── Publish / Update ─────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.title.trim()) return showToast('Title is required')
    setSaving(true)
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim(),
        url:         form.url.trim()    || '',
        image:       form.image.trim()  || '',
        category:    form.category,
        source:      form.source.trim() || 'NewsTally',
        author:      form.author.trim() || AUTHOR_NAME,
        savedAt:     serverTimestamp(),
        addedBy:     user.email,
        manualEntry: true,
      }

      if (editId) {
        // Update existing
        await updateDoc(doc(db, 'author_posts', editId), payload)
        showToast('✅ Updated!')
        setEditId(null)
      } else {
        // New post
        await addDoc(collection(db, 'author_posts'), payload)
        showToast('✅ Published to NewsTally!')
      }
      setForm(EMPTY_FORM)
    } catch(err) {
      console.error(err)
      showToast('Failed: ' + err.message)
    }
    finally { setSaving(false) }
  }

  // ── Load Posts ────────────────────────────────────────────────
  const loadPosts = async () => {
    setLoadingPosts(true)
    try {
      let snap
      try {
        snap = await getDocs(query(collection(db,'author_posts'), orderBy('savedAt','desc'), limit(50)))
      } catch {
        snap = await getDocs(query(collection(db,'author_posts'), limit(50)))
      }
      setPosts(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    } catch(err) { showToast('Load failed: ' + err.message) }
    setLoadingPosts(false)
  }

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return
    try {
      await deleteDoc(doc(db, 'author_posts', id))
      setPosts(prev => prev.filter(p => p.id !== id))
      showToast('Deleted ✅')
    } catch(err) { showToast('Delete failed: ' + err.message) }
  }

  // ── Edit ──────────────────────────────────────────────────────
  const handleEdit = (post) => {
    setEditId(post.id)
    setForm({
      title:       post.title || '',
      description: post.description || '',
      url:         post.url || '',
      image:       post.image || '',
      category:    post.category || 'NewsTally',
      source:      post.source || 'NewsTally',
      pubDate:     '',
      author:      post.author || AUTHOR_NAME,
    })
    setActiveTab('add')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const inputStyle = { width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }
  const labelStyle = { fontSize:12, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'.04em' }
  const fieldStyle = { marginBottom:16 }

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => navigate('/')} style={{ width:34, height:34, borderRadius:'50%', background:'var(--surface2)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink)', fontSize:14 }}>
            <i className="fas fa-arrow-left"/>
          </button>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--ink)' }}>News Manager</div>
            <div style={{ fontSize:11, color:'#1a73e8', fontWeight:600 }}>✍️ {AUTHOR_NAME} · NewsTally</div>
          </div>
        </div>
        <button onClick={() => signOut(auth).then(() => navigate('/'))}
          style={{ padding:'7px 14px', background:'rgba(234,67,53,.1)', border:'1px solid rgba(234,67,53,.25)', borderRadius:8, fontSize:12, fontWeight:700, color:'#ea4335', cursor:'pointer' }}>
          <i className="fas fa-sign-out-alt" style={{ marginRight:5 }}/>Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        {[['add', editId ? '✏️ Edit Post' : '➕ New Post'], ['posts','📋 My Posts']].map(([k,l]) => (
          <button key={k} onClick={() => { setActiveTab(k); if(k==='add'&&editId){setEditId(null);setForm(EMPTY_FORM)} }}
            style={{ flex:1, padding:'13px', fontSize:13, fontWeight:700, background:'none', border:'none', cursor:'pointer',
              color: activeTab===k ? '#1a73e8' : 'var(--muted)',
              borderBottom: activeTab===k ? '2.5px solid #1a73e8' : '2.5px solid transparent' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── PUBLISH / EDIT TAB ── */}
      {activeTab === 'add' && (
        <div style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px 80px' }}>

          {/* Author badge */}
          <div style={{ display:'flex', alignItems:'center', gap:12, background:'linear-gradient(135deg,rgba(26,115,232,.08),rgba(147,52,230,.08))', border:'1px solid rgba(26,115,232,.2)', borderRadius:14, padding:'14px 16px', marginBottom:20 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#1a73e8,#9334e6)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ color:'#fff', fontWeight:800, fontSize:16 }}>{AUTHOR_NAME[0]}</span>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--ink)' }}>{AUTHOR_NAME}</div>
              <div style={{ fontSize:12, color:'#1a73e8', fontWeight:600 }}>Author · NewsTally</div>
            </div>
            <div style={{ marginLeft:'auto', background:'#1a73e8', color:'#fff', fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, textTransform:'uppercase', letterSpacing:'.05em' }}>
              NewsTally
            </div>
          </div>

          {editId && (
            <div style={{ background:'rgba(255,160,0,.1)', border:'1px solid rgba(255,160,0,.3)', borderRadius:10, padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <i className="fas fa-pen" style={{ color:'#f9a825' }}/>
              <span style={{ fontSize:13, color:'#f9a825', fontWeight:700 }}>Editing existing post</span>
              <button onClick={() => { setEditId(null); setForm(EMPTY_FORM) }}
                style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:13 }}>Cancel</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Required fields */}
            <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 16px', marginBottom:16, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>Required</div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Title *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} required
                  placeholder="Enter your article headline"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Category *</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} required style={{ ...inputStyle, cursor:'pointer' }}>
                  {CAT_OPTIONS.map(c => <option key={c} value={c}>{c === 'NewsTally' ? '⭐ NewsTally (Author)' : c}</option>)}
                </select>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Author</label>
                  <input value={form.author} onChange={e => set('author', e.target.value)}
                    placeholder={AUTHOR_NAME} style={inputStyle}
                    onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
                </div>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Source</label>
                  <input value={form.source} onChange={e => set('source', e.target.value)}
                    placeholder="NewsTally" style={inputStyle}
                    onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
                </div>
              </div>
            </div>

            {/* Optional fields */}
            <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 16px', marginBottom:16, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>Content</div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Description / Article Body</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Write your article content here..." rows={6}
                  style={{ ...inputStyle, resize:'vertical', lineHeight:1.7 }}
                  onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Cover Image URL</label>
                <input type="url" value={form.image} onChange={e => set('image', e.target.value)}
                  placeholder="https://example.com/image.jpg" style={inputStyle}
                  onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
                {form.image && <img src={form.image} alt="preview" style={{ width:'100%', height:160, objectFit:'cover', borderRadius:10, marginTop:8 }} onError={e => e.target.style.display='none'}/>}
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Article URL (optional)</label>
                <input type="url" value={form.url} onChange={e => set('url', e.target.value)}
                  placeholder="https://example.com/full-article" style={inputStyle}
                  onFocus={e => e.target.style.borderColor='#1a73e8'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
              </div>
            </div>

            {/* Preview */}
            {form.title && (
              <div style={{ background:'var(--surface)', borderRadius:14, padding:16, marginBottom:16, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:12 }}>Preview</div>
                {form.image && <img src={form.image} alt="" style={{ width:'100%', height:160, objectFit:'cover', borderRadius:10, marginBottom:10 }} onError={e => e.target.style.display='none'}/>}
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <span style={{ fontSize:10, fontWeight:800, color:'#9334e6', background:'rgba(147,52,230,.12)', padding:'3px 9px', borderRadius:99, textTransform:'uppercase' }}>{form.category}</span>
                  <span style={{ fontSize:11, color:'var(--muted)' }}>{form.source || 'NewsTally'}</span>
                  {form.author && <span style={{ fontSize:11, color:'#1a73e8', fontWeight:600 }}>by {form.author}</span>}
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', lineHeight:1.4, marginBottom:6 }}>{form.title}</div>
                {form.description && <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>{form.description.substring(0,200)}{form.description.length>200?'...':''}</div>}
              </div>
            )}

            <button type="submit" disabled={saving || !form.title.trim()}
              style={{ width:'100%', padding:'14px', background: form.title.trim() ? 'linear-gradient(135deg,#1a73e8,#9334e6)' : 'var(--border)', color: form.title.trim() ? '#fff' : 'var(--muted)', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: form.title.trim() ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {saving
                ? <><i className="fas fa-spinner fa-spin"/> {editId ? 'Updating...' : 'Publishing...'}</>
                : editId
                  ? <><i className="fas fa-check"/> Update Post</>
                  : <><i className="fas fa-paper-plane"/> Publish to NewsTally</>
              }
            </button>
          </form>
        </div>
      )}

      {/* ── MY POSTS TAB ── */}
      {activeTab === 'posts' && (
        <div style={{ maxWidth:640, margin:'0 auto', padding:'12px 16px 80px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:13, color:'var(--muted)', fontWeight:600 }}>{posts.length} posts published</span>
            <button onClick={loadPosts} disabled={loadingPosts}
              style={{ padding:'7px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', color:'var(--ink)', display:'flex', alignItems:'center', gap:5 }}>
              <i className={`fas fa-sync-alt${loadingPosts?' fa-spin':''}`}/> Refresh
            </button>
          </div>

          {loadingPosts ? (
            <div style={{ padding:40, textAlign:'center' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:24, color:'var(--muted)' }}/></div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
              <i className="fas fa-feather-alt" style={{ fontSize:40, display:'block', marginBottom:12, opacity:.3 }}/>
              <p style={{ fontWeight:700, color:'var(--ink)', marginBottom:6 }}>No posts yet</p>
              <p style={{ fontSize:13 }}>Your published articles will appear here</p>
            </div>
          ) : posts.map(p => (
            <div key={p.id} style={{ background:'var(--surface)', borderRadius:12, padding:14, marginBottom:10, border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                {p.image && <img src={p.image} alt="" style={{ width:72, height:56, borderRadius:8, objectFit:'cover', flexShrink:0 }} onError={e => e.target.style.display='none'}/>}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:10, fontWeight:800, color:'#9334e6', background:'rgba(147,52,230,.12)', padding:'2px 7px', borderRadius:99, textTransform:'uppercase' }}>{p.category}</span>
                    {p.author && <span style={{ fontSize:10, color:'var(--muted)', fontWeight:600 }}>by {p.author}</span>}
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', lineHeight:1.4, marginBottom:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.title}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', display:'flex', gap:8, alignItems:'center' }}>
                    <span>{p.savedAt?.toDate ? timeAgo(p.savedAt.toDate()) : 'Just now'}</span>
                    <span style={{ background:'rgba(52,168,83,.12)', color:'#34a853', padding:'1px 6px', borderRadius:4, fontWeight:700 }}>● Live</span>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:10, paddingTop:8, borderTop:'1px solid var(--border2)' }}>
                <button onClick={() => handleEdit(p)}
                  style={{ flex:1, padding:'8px', background:'rgba(26,115,232,.08)', border:'1px solid rgba(26,115,232,.2)', borderRadius:8, color:'#1a73e8', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <i className="fas fa-pen"/> Edit
                </button>
                <button onClick={() => handleDelete(p.id)}
                  style={{ flex:1, padding:'8px', background:'rgba(234,67,53,.08)', border:'1px solid rgba(234,67,53,.2)', borderRadius:8, color:'#ea4335', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <i className="fas fa-trash"/> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
