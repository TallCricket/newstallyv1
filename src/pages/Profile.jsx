import { useState, useEffect, useRef } from 'react'
import {
  doc, getDoc, onSnapshot, collection, query, where, orderBy, limit,
  getDocs, updateDoc, setDoc, writeBatch
} from 'firebase/firestore'
import { signOut, updateProfile } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, auth, storage, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { formatCount, showToast, timeAgo } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useNavigate } from 'react-router-dom'
import CommentsPage from '../components/CommentsPage'
import ProfilePage from '../components/ProfilePage'


// ── Followers/Following Modal ──────────────────────────────────────
function FollowListModal({ title, uids, onClose, onOpenProfile }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uids || uids.length === 0) { setLoading(false); return }
    Promise.all(
      uids.slice(0, 50).map(uid =>
        getDoc(doc(db, 'users', uid)).then(s => s.exists() ? { id:s.id, ...s.data() } : null).catch(() => null)
      )
    ).then(results => {
      setUsers(results.filter(Boolean))
      setLoading(false)
    })
  }, [uids])

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:600, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:480, background:'var(--surface)', borderRadius:'20px 20px 0 0', maxHeight:'70dvh', display:'flex', flexDirection:'column', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ width:40, height:4, background:'var(--border)', borderRadius:99, position:'absolute', left:'50%', top:8, transform:'translateX(-50%)' }}/>
          <span style={{ fontWeight:700, fontSize:16, color:'var(--ink)' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--muted)' }}>
            <i className="fas fa-times"/>
          </button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          {loading ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize:22, color:'var(--muted)' }}/>
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--muted)' }}>
              <i className="fas fa-users" style={{ fontSize:36, marginBottom:12, display:'block', opacity:.3 }}/>
              <p style={{ fontWeight:600, color:'var(--ink)' }}>No {title.toLowerCase()} yet</p>
            </div>
          ) : users.map(u => (
            <div key={u.id} onClick={() => { onOpenProfile(u.id); onClose() }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border2)', cursor:'pointer', transition:'background .15s' }}
              onMouseOver={e => e.currentTarget.style.background='var(--surface2)'}
              onMouseOut={e => e.currentTarget.style.background='transparent'}>
              <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent((u.displayName||'U').substring(0,2))}&background=9334e6&color=fff`}
                style={{ width:46, height:46, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} alt=""
                onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{u.displayName || 'User'}</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>@{u.username || 'user'}</div>
              </div>
              <i className="fas fa-chevron-right" style={{ color:'var(--muted)', fontSize:12 }}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const SETTINGS_LINKS = [
  { icon:'fas fa-info-circle',    label:'About NewsTally',  url:'/about',   color:'#1a73e8' },
  { icon:'fas fa-shield-alt',     label:'Privacy Policy',   url:'/privacy', color:'#34a853' },
  { icon:'fas fa-file-alt',       label:'Terms of Service', url:'/terms',   color:'#ff6d00' },
  { icon:'fas fa-envelope',       label:'Contact Us',       url:'/contact', color:'#9334e6' },
]

// ── Profile Post Card ──
function ProfilePostCard({ post, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const isRepost = post.type === 'repost'
  return (
    <div onClick={() => onClick(post.id)}
      style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14,
        overflow:'hidden', cursor:'pointer', transition:'box-shadow .15s' }}
      onMouseOver={e => e.currentTarget.style.boxShadow='var(--shadow-md)'}
      onMouseOut={e => e.currentTarget.style.boxShadow='none'}>
      {(post.image) && !imgErr && (
        <img src={post.image} alt="" style={{ width:'100%', height:110, objectFit:'cover', display:'block' }}
          onError={() => setImgErr(true)}/>
      )}
      <div style={{ padding:'10px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
          {isRepost
            ? <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', color:'#34a853', background:'#e6f4ea', padding:'2px 7px', borderRadius:4 }}>↺ Repost</span>
            : <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', color:'#1a73e8', background:'#e8f0fe', padding:'2px 7px', borderRadius:4 }}>💬 Post</span>
          }
          {post.newsCategory && (
            <span style={{ fontSize:9, fontWeight:700, color:'#9334e6', background:'#f3e8ff', padding:'2px 7px', borderRadius:4 }}>{post.newsCategory}</span>
          )}
        </div>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--ink)', lineHeight:1.45, margin:'0 0 8px',
          display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {post.headline || post.title || ''}
        </p>
        <div style={{ display:'flex', gap:12, paddingTop:6, borderTop:'1px solid var(--border2)' }}>
          <span style={{ fontSize:11, color:'var(--muted)' }}>{timeAgo(post.timestamp?.toDate?.() || post.timestamp)}</span>
          <span style={{ fontSize:11, color:'var(--muted)', display:'flex', alignItems:'center', gap:3 }}>
            <i className="far fa-heart" style={{ fontSize:10 }}/> {(post.likes||[]).length}
          </span>
          <span style={{ fontSize:11, color:'var(--muted)', display:'flex', alignItems:'center', gap:3 }}>
            <i className="far fa-comment" style={{ fontSize:10 }}/> {post.commentsCount || 0}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Saved Article Card ──
function SavedCard({ item, onOpen }) {
  const [imgErr, setImgErr] = useState(false)
  const CAT_COLORS = { National:'#e53935', World:'#1a73e8', Business:'#34a853', Technology:'#9334e6', Health:'#f4a261', Education:'#0077b6', Sports:'#ff6d00', General:'#546e7a' }
  const accent = CAT_COLORS[item.category] || '#1a73e8'
  return (
    <div onClick={() => onOpen(item.id)}
      style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border2)', cursor:'pointer' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
          <span style={{ fontSize:9, fontWeight:800, color:accent, textTransform:'uppercase', letterSpacing:'.06em' }}>{item.category}</span>
        </div>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--ink)', lineHeight:1.4, marginBottom:4,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {item.title}
        </p>
        {item.source && <p style={{ fontSize:11, color:'var(--muted)' }}>{item.source}</p>}
      </div>
      {item.image && !imgErr && (
        <img src={item.image} alt="" loading="lazy" onError={() => setImgErr(true)}
          style={{ width:70, height:56, borderRadius:8, objectFit:'cover', flexShrink:0 }}/>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
export default function Profile() {
  const { user } = useAuth()
  const { dark, toggle: toggleDark } = useTheme()
  const navigate = useNavigate()

  const [profile, setProfile]       = useState(null)
  const [posts, setPosts]           = useState([])
  const [savedArticles, setSavedArticles] = useState([])
  const [tab, setTab]               = useState('posts')
  const [loading, setLoading]       = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [showAuth, setShowAuth]     = useState(false)
  const [openCommentPost, setOpenCommentPost] = useState(null)
  const [followList, setFollowList] = useState(null)  // { title, uids }
  const [openProfileSlide, setOpenProfileSlide] = useState(null)

  const [editMode, setEditMode]         = useState(false)
  const [editName, setEditName]         = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio]           = useState('')
  const [editPhone, setEditPhone]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [propagating, setPropagating]   = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [usernameError, setUsernameError]   = useState('')
  const fileInputRef = useRef(null)
  const uid = user?.uid

  // 1️⃣ Realtime profile listener
  useEffect(() => {
    if (!uid) { setLoading(false); return }
    setLoading(true)
    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      if (snap.exists()) {
        const d = snap.data()
        setProfile(d)
      } else {
        const defaultData = {
          displayName: user.displayName || 'User', email: user.email || '',
          photoURL: user.photoURL || '',
          username: (user.email || 'user').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'') + Math.floor(Math.random()*99),
          bio:'', phone:'', followersCount:0, followingCount:0, createdAt: new Date().toISOString()
        }
        setDoc(doc(db,'users',uid), defaultData, { merge:true })
        setProfile(defaultData)
      }
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [uid]) // eslint-disable-line

  // 5️⃣ Realtime posts listener (text + repost)
  useEffect(() => {
    if (!uid) return
    setPostsLoading(true)
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
      where('userId', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    )
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id:d.id, ...d.data() })))
      setPostsLoading(false)
    }, () => setPostsLoading(false))
    return () => unsub()
  }, [uid])

  // 2️⃣ Load saved articles from localStorage + Firestore
  useEffect(() => {
    if (tab !== 'saved') return
    try {
      const savedIds = JSON.parse(localStorage.getItem('nt_saved_news') || '[]')
      if (!savedIds.length) { setSavedArticles([]); return }
      // Fetch all saved articles from Firestore
      const fetches = savedIds.slice(0, 20).map(id =>
        import('firebase/firestore').then(({ getDoc, doc: docFn }) =>
          getDoc(docFn(db, 'news', id)).then(s => s.exists() ? { id:s.id, ...s.data() } : null)
        )
      )
      Promise.all(fetches).then(results => {
        setSavedArticles(results.filter(Boolean))
      }).catch(() => setSavedArticles([]))
    } catch { setSavedArticles([]) }
  }, [tab])

  // 2️⃣ Username uniqueness check
  const checkUsernameUnique = async (username) => {
    if (!username || username.length < 3) { setUsernameError('Min 3 characters'); return false }
    if (!/^[a-z0-9_]+$/.test(username)) { setUsernameError('Only a-z, 0-9, _ allowed'); return false }
    if (username === profile?.username) { setUsernameError(''); return true }
    try {
      const snap = await getDocs(query(collection(db,'users'), where('username','==',username), limit(2)))
      const others = snap.docs.filter(d => d.id !== uid)
      if (others.length > 0) { setUsernameError('Username already taken'); return false }
      setUsernameError(''); return true
    } catch { setUsernameError(''); return true }
  }

  // 1️⃣ Save profile + propagate username to all posts
  const handleSaveProfile = async () => {
    if (!user || !editName.trim()) return showToast('Name cannot be empty')
    const uname = editUsername.trim().toLowerCase()
    const isUnique = await checkUsernameUnique(uname)
    if (!isUnique) return

    setSaving(true)
    try {
      const updates = {
        displayName: editName.trim(), username: uname,
        bio: editBio.trim(), phone: editPhone.trim(),
        updatedAt: new Date().toISOString()
      }
      await updateDoc(doc(db, 'users', uid), updates)
      await updateProfile(user, { displayName: editName.trim() }).catch(() => {})

      // 1️⃣ Propagate new username to ALL user's posts (batch write)
      if (uname !== profile?.username) {
        setPropagating(true)
        try {
          const postsSnap = await getDocs(query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
            where('userId', '==', uid),
            limit(500)
          ))
          const BATCH_SIZE = 499
          let batch = writeBatch(db)
          let count = 0
          for (const docSnap of postsSnap.docs) {
            batch.update(docSnap.ref, { username: uname })
            count++
            if (count % BATCH_SIZE === 0) {
              await batch.commit()
              batch = writeBatch(db)
            }
          }
          if (count % BATCH_SIZE !== 0) await batch.commit()
          showToast(`Profile updated — username changed everywhere ✅`)
        } catch(e) {
          showToast('Profile saved, posts may take time to update')
        }
        setPropagating(false)
      } else {
        showToast('Profile updated ✅')
      }

      setEditMode(false); setUsernameError('')
    } catch(e) { showToast('Failed to update') }
    finally { setSaving(false) }
  }

  // Photo upload
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB'); return }
    setUploadingPhoto(true)
    try {
      const storageRef = ref(storage, `avatars/${uid}/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await updateProfile(user, { photoURL: url })
      await updateDoc(doc(db, 'users', uid), { photoURL: url })
      showToast('Photo updated ✅')
    } catch { showToast('Photo upload failed') }
    finally { setUploadingPhoto(false) }
  }

  const handleLogout = async () => {
    if (!window.confirm('Sign out?')) return
    await signOut(auth); showToast('Signed out'); navigate('/')
  }

  const openEdit = () => {
    setEditName(profile?.displayName || ''); setEditUsername(profile?.username || '')
    setEditBio(profile?.bio || ''); setEditPhone(profile?.phone || '')
    setUsernameError(''); setEditMode(true)
  }

  const av = profile?.photoURL || user?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.displayName||'U').substring(0,2))}&background=9334e6&color=fff&bold=true&size=128`
  const coverGrads = ['linear-gradient(135deg,#1a73e8,#9334e6)','linear-gradient(135deg,#e53935,#ff6d00)','linear-gradient(135deg,#34a853,#0077b6)','linear-gradient(135deg,#9334e6,#e53935)','linear-gradient(135deg,#0077b6,#34a853)']
  const coverGrad = coverGrads[(uid?.charCodeAt(0)||0) % coverGrads.length]
  const joinDate = profile?.createdAt ? new Date(typeof profile.createdAt==='string' ? profile.createdAt : profile.createdAt?.toDate?.() || Date.now()).toLocaleDateString('en-IN',{month:'long',year:'numeric'}) : null

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="Socialgati"/>
          <div>
            <span style={{ fontSize:18, fontWeight:800, color:'#9334e6', display:'block', lineHeight:1.1 }}>My Profile</span>
            <span style={{ fontSize:10, color:'var(--muted)' }}>Socialgati</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {/* Dark mode toggle in header for quick access */}
          <button className="icon-btn" onClick={toggleDark} title={dark ? 'Light mode' : 'Dark mode'}>
            <i className={dark ? 'fas fa-sun' : 'fas fa-moon'}/>
          </button>
          {user && <button onClick={handleLogout} className="icon-btn"><i className="fas fa-sign-out-alt"/></button>}
        </div>
      </header>

      <div className="main-wrapper" style={{ paddingBottom:80, background:'var(--bg)' }}>
        {!user ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <i className="fas fa-user" style={{ fontSize:32, color:'var(--muted)' }}/>
            </div>
            <p style={{ fontSize:18, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>Sign in to view your profile</p>
            <p style={{ fontSize:14, color:'var(--muted)', marginBottom:24 }}>Join Socialgati to post, follow and connect</p>
            <button onClick={() => setShowAuth(true)}
              style={{ padding:'12px 32px', background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none', borderRadius:99, fontSize:15, fontWeight:700, cursor:'pointer' }}>
              Sign In
            </button>
          </div>
        ) : loading ? (
          <div style={{ padding:40, textAlign:'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize:28, color:'var(--muted)' }}/>
          </div>
        ) : (
          <div>
            <div style={{ height:110, background:coverGrad }}/>
            <div style={{ padding:'0 16px 16px', background:'var(--surface)' }}>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ position:'relative', marginTop:-44 }}>
                  <img src={av} style={{ width:84, height:84, borderRadius:'50%', border:'3px solid var(--surface)', objectFit:'cover', background:'var(--surface2)' }} alt=""
                    onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}/>
                  {editMode && (
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                      style={{ position:'absolute', bottom:2, right:2, width:26, height:26, borderRadius:'50%', background:'#1a73e8', border:'2px solid var(--surface)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:11 }}>
                      {uploadingPhoto ? <i className="fas fa-spinner fa-spin"/> : <i className="fas fa-camera"/>}
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoChange}/>
                </div>
                <div style={{ display:'flex', gap:8, marginBottom:4 }}>
                  {editMode ? (
                    <>
                      <button onClick={() => { setEditMode(false); setUsernameError('') }}
                        style={{ padding:'7px 16px', borderRadius:99, border:'1px solid var(--border)', fontSize:13, fontWeight:600, cursor:'pointer', background:'var(--surface)', color:'var(--ink)' }}>
                        Cancel
                      </button>
                      <button onClick={handleSaveProfile} disabled={saving || propagating}
                        style={{ padding:'7px 20px', borderRadius:99, background:'#1a73e8', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                        {(saving || propagating) ? <i className="fas fa-spinner fa-spin"/> : <><i className="fas fa-check"/> Save</>}
                      </button>
                    </>
                  ) : (
                    <button onClick={openEdit}
                      style={{ padding:'7px 20px', borderRadius:99, border:'1.5px solid var(--border)', fontSize:13, fontWeight:700, cursor:'pointer', background:'var(--surface)', color:'var(--ink)', display:'flex', alignItems:'center', gap:6 }}>
                      <i className="fas fa-pen" style={{ fontSize:11 }}/> Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {editMode ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.04em', display:'block', marginBottom:4 }}>Display Name *</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name"
                      style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #1a73e8', borderRadius:10, fontSize:15, outline:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.04em', display:'block', marginBottom:4 }}>
                      Username
                      {usernameError && <span style={{ color:'#ea4335', fontWeight:600, fontSize:11, marginLeft:8, textTransform:'none' }}>{usernameError}</span>}
                    </label>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', fontSize:14 }}>@</span>
                      <input value={editUsername}
                        onChange={e => { setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')); setUsernameError('') }}
                        onBlur={() => editUsername && checkUsernameUnique(editUsername)}
                        placeholder="unique_username"
                        style={{ width:'100%', padding:'10px 14px 10px 28px', border:`1.5px solid ${usernameError ? '#ea4335' : 'var(--border)'}`, borderRadius:10, fontSize:14, outline:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }}/>
                    </div>
                    <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>⚡ Changing username will update it on all your posts</p>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.04em', display:'block', marginBottom:4 }}>Bio</label>
                    <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell people about yourself..." rows={3}
                      style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none', resize:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.04em', display:'block', marginBottom:4 }}>Phone (optional)</label>
                    <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" type="tel"
                      style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none', background:'var(--surface2)', color:'var(--ink)', boxSizing:'border-box' }}/>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:22, fontWeight:800, color:'var(--ink)' }}>{profile?.displayName || user?.displayName || 'User'}</div>
                  <div style={{ fontSize:13, color:'var(--muted)', marginBottom:6, marginTop:2 }}>@{profile?.username || 'user'}</div>
                  {profile?.bio && <div style={{ fontSize:14, color:'var(--ink2)', lineHeight:1.55, marginBottom:8 }}>{profile.bio}</div>}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:4 }}>
                    {user?.email && <span style={{ fontSize:12, color:'var(--muted)', display:'flex', alignItems:'center', gap:5 }}><i className="fas fa-envelope" style={{ fontSize:11 }}/> {user.email}</span>}
                    {profile?.phone && <span style={{ fontSize:12, color:'var(--muted)', display:'flex', alignItems:'center', gap:5 }}><i className="fas fa-phone" style={{ fontSize:11 }}/> {profile.phone}</span>}
                    {joinDate && <span style={{ fontSize:12, color:'var(--muted)', display:'flex', alignItems:'center', gap:5 }}><i className="fas fa-calendar-alt" style={{ fontSize:11 }}/> Joined {joinDate}</span>}
                  </div>
                </div>
              )}

              {/* Stats — realtime via onSnapshot */}
              <div style={{ display:'flex', marginTop:16, background:'var(--surface2)', borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
                {[{ label:'Posts', val: posts.length, onClick: null },
                  { label:'Followers', val: profile?.followersCount||0, onClick: () => setFollowList({ title:'Followers', uids: profile?.followers||[] }) },
                  { label:'Following', val: profile?.followingCount||0, onClick: () => setFollowList({ title:'Following', uids: profile?.following||[] }) }
                ].map((s,i) => (
                  <div key={s.label}
                    onClick={s.onClick || undefined}
                    style={{ flex:1, textAlign:'center', padding:'12px 0', borderRight: i<2 ? '1px solid var(--border)' : 'none', cursor: s.onClick ? 'pointer' : 'default' }}
                    onMouseOver={e => s.onClick && (e.currentTarget.style.background='var(--surface2)')}
                    onMouseOut={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ fontSize:20, fontWeight:800, color:'var(--ink)' }}>{formatCount(s.val)}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--surface)', position:'sticky', top:56, zIndex:10 }}>
              {[{ id:'posts', label:'Posts', icon:'fas fa-th-large' },{ id:'saved', label:'Saved', icon:'fas fa-bookmark' },{ id:'settings', label:'Settings', icon:'fas fa-cog' }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ flex:1, padding:'11px 0', fontSize:12, fontWeight:700,
                    color: tab===t.id ? 'var(--ink)' : 'var(--muted)',
                    borderBottom: tab===t.id ? '2.5px solid var(--ink)' : '2.5px solid transparent',
                    background:'none', border:'none',
                    borderBottom: tab===t.id ? '2.5px solid var(--ink)' : '2.5px solid transparent',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <i className={t.icon} style={{ fontSize:13 }}/> {t.label}
                  {t.id==='posts' && posts.length>0 && <span style={{ background:'var(--surface2)', color:'var(--muted)', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99 }}>{posts.length}</span>}
                </button>
              ))}
            </div>

            {/* Posts */}
            {tab==='posts' && (
              postsLoading ? (
                <div style={{ padding:40, textAlign:'center' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:22, color:'var(--muted)' }}/></div>
              ) : posts.length===0 ? (
                <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
                  <i className="fas fa-bolt" style={{ fontSize:36, color:'#9334e6', marginBottom:12, display:'block', opacity:.4 }}/>
                  <p style={{ fontWeight:600, marginBottom:6 }}>No posts yet</p>
                  <p style={{ fontSize:13 }}>Share your first thought on Socialgati!</p>
                  <button onClick={() => navigate('/')}
                    style={{ marginTop:16, padding:'10px 24px', background:'#9334e6', color:'#fff', border:'none', borderRadius:99, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    Go to Socialgati
                  </button>
                </div>
              ) : (
                <div style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {posts.map(p => <ProfilePostCard key={p.id} post={p} onClick={id => setOpenCommentPost(id)}/>)}
                </div>
              )
            )}

            {/* 2️⃣ Saved articles from localStorage → Firestore */}
            {tab==='saved' && (
              savedArticles.length===0 ? (
                <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
                  <i className="far fa-bookmark" style={{ fontSize:36, marginBottom:12, display:'block', opacity:.4 }}/>
                  <p style={{ fontWeight:600, marginBottom:6 }}>No saved articles</p>
                  <p style={{ fontSize:13 }}>Bookmark articles in NewsTally — they'll appear here</p>
                  <button onClick={() => navigate('/news')}
                    style={{ marginTop:16, padding:'10px 24px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:99, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    Browse News
                  </button>
                </div>
              ) : (
                <div style={{ padding:'4px 16px' }}>
                  <p style={{ fontSize:12, color:'var(--muted)', padding:'10px 0', fontWeight:500 }}>
                    {savedArticles.length} saved article{savedArticles.length!==1?'s':''}
                  </p>
                  {savedArticles.map(item => (
                    <SavedCard key={item.id} item={item} onOpen={id => navigate(`/news/${id}`)}/>
                  ))}
                </div>
              )
            )}

            {/* Settings */}
            {tab==='settings' && (
              <div style={{ padding:'16px' }}>
                {/* Account */}
                <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, marginBottom:16, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Account</span>
                  </div>
                  {[{ icon:'fas fa-user-circle', label:'Name', val: profile?.displayName||'User' },{ icon:'fas fa-at', label:'Username', val: `@${profile?.username||'user'}` },{ icon:'fas fa-envelope', label:'Email', val: user?.email||'—' },{ icon:'fas fa-user-friends', label:'Followers', val: formatCount(profile?.followersCount||0) },{ icon:'fas fa-user-plus', label:'Following', val: formatCount(profile?.followingCount||0) },{ icon:'fas fa-phone', label:'Phone', val: profile?.phone||'Not set' }].map((row,i,arr) => (
                    <div key={row.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom: i<arr.length-1 ? '1px solid var(--border2)' : 'none' }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className={row.icon} style={{ fontSize:15, color:'var(--muted)' }}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>{row.label}</div>
                        <div style={{ fontSize:13, color:'var(--ink)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.val}</div>
                      </div>
                      {row.label==='Name' && <button onClick={() => { setTab('posts'); openEdit() }} style={{ fontSize:11, color:'#1a73e8', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>Edit</button>}
                    </div>
                  ))}
                </div>

                {/* 4️⃣ Dark Mode Toggle */}
                <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, marginBottom:16, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Appearance</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background: dark ? '#1a1a2e' : '#f8f6f0', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <i className={dark ? 'fas fa-moon' : 'fas fa-sun'} style={{ fontSize:16, color: dark ? '#aaa0ff' : '#f5c518' }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>Dark Mode</div>
                      <div style={{ fontSize:12, color:'var(--muted)' }}>
                        {dark ? 'Currently Dark' : 'Currently Light'} · Follows device if not set
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <div onClick={toggleDark}
                      style={{ width:48, height:28, borderRadius:99, background: dark ? '#1a73e8' : 'var(--border)',
                        position:'relative', cursor:'pointer', transition:'background .25s', flexShrink:0 }}>
                      <div style={{ position:'absolute', top:3, left: dark ? 23 : 3,
                        width:22, height:22, borderRadius:'50%', background:'#fff',
                        transition:'left .25s', boxShadow:'0 1px 4px rgba(0,0,0,.3)' }}/>
                    </div>
                  </div>
                </div>

                {/* Info links */}
                <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, marginBottom:16, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Information</span>
                  </div>
                  {SETTINGS_LINKS.map((link,i) => (
                    <div key={link.url} onClick={() => navigate(link.url)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: i<SETTINGS_LINKS.length-1 ? '1px solid var(--border2)' : 'none', cursor:'pointer' }}
                      onMouseOver={e => e.currentTarget.style.background='var(--surface2)'}
                      onMouseOut={e => e.currentTarget.style.background='transparent'}>
                      <div style={{ width:36, height:36, borderRadius:10, background:`${link.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <i className={link.icon} style={{ fontSize:16, color:link.color }}/>
                      </div>
                      <span style={{ flex:1, fontSize:14, fontWeight:600, color:'var(--ink)' }}>{link.label}</span>
                      <i className="fas fa-chevron-right" style={{ fontSize:12, color:'var(--muted)' }}/>
                    </div>
                  ))}
                </div>

                {/* App */}
                <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, marginBottom:16, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>App</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom:'1px solid var(--border2)' }}>
                    <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" style={{ width:36, height:36, borderRadius:10 }} alt=""/>
                    <div><div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>NewsTally</div><div style={{ fontSize:11, color:'var(--muted)' }}>Version 2.0 · Socialgati</div></div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#fce4ec', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <i className="fas fa-globe" style={{ fontSize:16, color:'#e91e63' }}/>
                    </div>
                    <div><div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>Websites</div><div style={{ fontSize:11, color:'var(--muted)' }}>newstally.online · socialgati.online</div></div>
                  </div>
                </div>

                <button onClick={handleLogout}
                  style={{ width:'100%', padding:'14px', background:'var(--surface)', border:'1.5px solid #fde8e8', borderRadius:14, fontSize:14, fontWeight:700, color:'#ea4335', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <i className="fas fa-sign-out-alt"/> Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {followList && (
        <FollowListModal
          title={followList.title}
          uids={followList.uids}
          onClose={() => setFollowList(null)}
          onOpenProfile={uid => { setFollowList(null); setOpenProfileSlide(uid) }}
        />
      )}
      {openProfileSlide && (
        <ProfilePage uid={openProfileSlide} onClose={() => setOpenProfileSlide(null)}
          onOpenComments={id => setOpenCommentPost(id)}
          onOpenProfile={uid2 => setOpenProfileSlide(uid2)}
          onAuthRequired={() => setShowAuth(true)}/>
      )}
      <CommentsPage postId={openCommentPost} onClose={() => setOpenCommentPost(null)} onOpenProfile={uid => setOpenProfileSlide(uid)}/>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <BottomNav/>
    </>
  )
}
