import { useState, useEffect, useRef } from 'react'
import {
  doc, onSnapshot, collection, query, where, orderBy, limit,
  getDocs, updateDoc, setDoc
} from 'firebase/firestore'
import { signOut, updateProfile } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, auth, storage, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { formatCount, showToast, timeAgo } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useNavigate } from 'react-router-dom'
import CommentsPage from '../components/CommentsPage'

const SETTINGS_LINKS = [
  { icon:'fas fa-info-circle',    label:'About NewsTally',  url:'/about',   color:'#1a73e8' },
  { icon:'fas fa-shield-alt',     label:'Privacy Policy',   url:'/privacy', color:'#34a853' },
  { icon:'fas fa-file-alt',       label:'Terms of Service', url:'/terms',   color:'#ff6d00' },
  { icon:'fas fa-envelope',       label:'Contact Us',       url:'/contact', color:'#9334e6' },
]

// ── Post mini card in profile ──────────────────────────────────────
function ProfilePostCard({ post, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const isRepost = post.type === 'repost'
  return (
    <div onClick={() => onClick(post.id)}
      style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:14, overflow:'hidden', cursor:'pointer',
        transition:'box-shadow .15s' }}
      onMouseOver={e => e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.08)'}
      onMouseOut={e => e.currentTarget.style.boxShadow='none'}>

      {/* Image if any */}
      {(post.image || (isRepost && post.image)) && !imgErr && (
        <img src={post.image} alt="" style={{ width:'100%', height:130, objectFit:'cover', display:'block' }}
          onError={() => setImgErr(true)}/>
      )}

      <div style={{ padding:'10px 12px' }}>
        {/* Type badge */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
          {isRepost ? (
            <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', color:'#34a853', background:'#e6f4ea', padding:'2px 7px', borderRadius:4 }}>
              ↺ Repost
            </span>
          ) : (
            <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', color:'#1a73e8', background:'#e8f0fe', padding:'2px 7px', borderRadius:4 }}>
              💬 Post
            </span>
          )}
          {post.newsCategory && (
            <span style={{ fontSize:9, fontWeight:700, color:'#9334e6', background:'#f3e8ff', padding:'2px 7px', borderRadius:4, textTransform:'uppercase' }}>
              {post.newsCategory}
            </span>
          )}
        </div>

        {/* Headline */}
        <p style={{ fontSize:13, fontWeight:600, color:'#202124', lineHeight:1.45, margin:'0 0 8px',
          display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {post.headline || post.title || ''}
        </p>

        {/* Footer */}
        <div style={{ display:'flex', gap:12, alignItems:'center', paddingTop:6, borderTop:'1px solid #f5f5f5' }}>
          <span style={{ fontSize:11, color:'#9aa0a6' }}>{timeAgo(post.timestamp?.toDate?.() || post.timestamp)}</span>
          <span style={{ fontSize:11, color:'#9aa0a6', display:'flex', alignItems:'center', gap:3 }}>
            <i className="far fa-heart" style={{ fontSize:10 }}/> {(post.likes || []).length}
          </span>
          <span style={{ fontSize:11, color:'#9aa0a6', display:'flex', alignItems:'center', gap:3 }}>
            <i className="far fa-comment" style={{ fontSize:10 }}/> {post.commentsCount || 0}
          </span>
          {isRepost && (post.repostCount > 0) && (
            <span style={{ fontSize:11, color:'#34a853', display:'flex', alignItems:'center', gap:3 }}>
              <i className="fas fa-retweet" style={{ fontSize:10 }}/> {post.repostCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN PROFILE PAGE
// ══════════════════════════════════════════════════════════
export default function Profile() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  // ── State ──
  const [profile, setProfile]   = useState(null)
  const [posts, setPosts]       = useState([])
  const [tab, setTab]           = useState('posts')
  const [loading, setLoading]   = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [openCommentPost, setOpenCommentPost] = useState(null)

  // Edit state
  const [editMode, setEditMode]         = useState(false)
  const [editName, setEditName]         = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio]           = useState('')
  const [editPhone, setEditPhone]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [usernameError, setUsernameError]   = useState('')
  const fileInputRef = useRef(null)

  const uid = user?.uid

  // ══════════════════════════════════════════════════════
  // 1️⃣ REALTIME — User doc (followers, following, profile)
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    if (!uid) { setLoading(false); return }
    setLoading(true)

    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      if (snap.exists()) {
        const d = snap.data()
        setProfile(d)
        // Only update edit fields if not currently editing
        setEditName(prev => prev || d.displayName || d.name || '')
        setEditUsername(prev => prev || d.username || '')
        setEditBio(prev => prev !== undefined ? prev : (d.bio || ''))
        setEditPhone(prev => prev !== undefined ? prev : (d.phone || ''))
      } else {
        // Create doc for new user
        const defaultData = {
          displayName: user.displayName || 'User',
          email: user.email || '',
          photoURL: user.photoURL || '',
          username: (user.email || 'user').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') + Math.floor(Math.random() * 99),
          bio: '', phone: '',
          followersCount: 0, followingCount: 0,
          createdAt: new Date().toISOString()
        }
        setDoc(doc(db, 'users', uid), defaultData, { merge: true })
        setProfile(defaultData)
      }
      setLoading(false)
    }, err => { console.error(err); setLoading(false) })

    return () => unsub()
  }, [uid]) // eslint-disable-line

  // ══════════════════════════════════════════════════════
  // 5️⃣ REALTIME — Posts (both text posts AND reposts)
  // ══════════════════════════════════════════════════════
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
      // Include ALL post types: text, repost, poll
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setPostsLoading(false)
    }, err => { console.error(err); setPostsLoading(false) })

    return () => unsub()
  }, [uid])

  // ══════════════════════════════════════════════════════
  // 2️⃣ USERNAME UNIQUENESS CHECK
  // ══════════════════════════════════════════════════════
  const checkUsernameUnique = async (username) => {
    if (!username || username.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      return false
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameError('Only lowercase letters, numbers and _ allowed')
      return false
    }
    // If same as current username, it's fine
    if (username === profile?.username) { setUsernameError(''); return true }

    try {
      const snap = await getDocs(query(
        collection(db, 'users'),
        where('username', '==', username),
        limit(2)
      ))
      const others = snap.docs.filter(d => d.id !== uid)
      if (others.length > 0) {
        setUsernameError('This username is already taken')
        return false
      }
      setUsernameError('')
      return true
    } catch(e) {
      setUsernameError('')
      return true // allow on error (network)
    }
  }

  // ── Save profile ──
  const handleSaveProfile = async () => {
    if (!user || !editName.trim()) return showToast('Name cannot be empty')
    const uname = editUsername.trim().toLowerCase()
    const isUnique = await checkUsernameUnique(uname)
    if (!isUnique) return

    setSaving(true)
    try {
      const updates = {
        displayName: editName.trim(),
        username: uname,
        bio: editBio.trim(),
        phone: editPhone.trim(),
        updatedAt: new Date().toISOString()
      }
      await updateDoc(doc(db, 'users', uid), updates)
      await updateProfile(user, { displayName: editName.trim() }).catch(() => {})
      setEditMode(false)
      setUsernameError('')
      showToast('Profile updated ✅')
    } catch(e) { showToast('Failed to update profile') }
    finally { setSaving(false) }
  }

  // ── Upload photo ──
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB'); return }
    setUploadingPhoto(true)
    try {
      const storageRef = ref(storage, `avatars/${uid}/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await updateProfile(user, { photoURL: url })
      await updateDoc(doc(db, 'users', uid), { photoURL: url })
      showToast('Photo updated ✅')
    } catch(e) { showToast('Photo upload failed') }
    finally { setUploadingPhoto(false) }
  }

  const handleLogout = async () => {
    if (!window.confirm('Sign out?')) return
    await signOut(auth)
    showToast('Signed out')
    navigate('/')
  }

  // ── Reset edit fields on open ──
  const openEdit = () => {
    setEditName(profile?.displayName || '')
    setEditUsername(profile?.username || '')
    setEditBio(profile?.bio || '')
    setEditPhone(profile?.phone || '')
    setUsernameError('')
    setEditMode(true)
  }

  const av = profile?.photoURL || user?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.displayName || 'U').substring(0, 2))}&background=9334e6&color=fff&bold=true&size=128`

  const coverGrads = [
    'linear-gradient(135deg,#1a73e8,#9334e6)',
    'linear-gradient(135deg,#e53935,#ff6d00)',
    'linear-gradient(135deg,#34a853,#0077b6)',
    'linear-gradient(135deg,#9334e6,#e53935)',
    'linear-gradient(135deg,#0077b6,#34a853)'
  ]
  const coverGrad = coverGrads[(uid?.charCodeAt(0) || 0) % coverGrads.length]

  const joinDate = profile?.createdAt
    ? new Date(typeof profile.createdAt === 'string' ? profile.createdAt : profile.createdAt?.toDate?.() || Date.now())
        .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="Socialgati"/>
          <div>
            <span style={{ fontSize:18, fontWeight:800, color:'#9334e6', display:'block', lineHeight:1.1 }}>My Profile</span>
            <span style={{ fontSize:10, color:'#9aa0a6' }}>Socialgati</span>
          </div>
        </div>
        {user && (
          <button onClick={handleLogout} className="icon-btn" title="Sign out">
            <i className="fas fa-sign-out-alt"/>
          </button>
        )}
      </header>

      <div className="main-wrapper" style={{ paddingBottom:80 }}>

        {/* Not logged in */}
        {!user ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ width:80, height:80, borderRadius:'50%', background:'#f1f3f4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <i className="fas fa-user" style={{ fontSize:32, color:'#9aa0a6' }}/>
            </div>
            <p style={{ fontSize:18, fontWeight:700, color:'#202124', marginBottom:8 }}>Sign in to view your profile</p>
            <p style={{ fontSize:14, color:'#9aa0a6', marginBottom:24 }}>Join Socialgati to post, follow and connect</p>
            <button onClick={() => setShowAuth(true)}
              style={{ padding:'12px 32px', background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none', borderRadius:99, fontSize:15, fontWeight:700, cursor:'pointer' }}>
              Sign In
            </button>
          </div>
        ) : loading ? (
          <div style={{ padding:40, textAlign:'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize:28, color:'#9aa0a6' }}/>
          </div>
        ) : (
          <div>
            {/* Cover */}
            <div style={{ height:110, background:coverGrad }}/>

            {/* Avatar + actions */}
            <div style={{ padding:'0 16px 16px', position:'relative' }}>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14 }}>

                {/* Avatar */}
                <div style={{ position:'relative', marginTop:-44 }}>
                  <img src={av} style={{ width:84, height:84, borderRadius:'50%', border:'3px solid #fff', objectFit:'cover', background:'#f0f0f0' }} alt=""
                    onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}/>
                  {editMode && (
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                      style={{ position:'absolute', bottom:2, right:2, width:26, height:26, borderRadius:'50%',
                        background:'#1a73e8', border:'2px solid #fff', color:'#fff',
                        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:11 }}>
                      {uploadingPhoto ? <i className="fas fa-spinner fa-spin"/> : <i className="fas fa-camera"/>}
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoChange}/>
                </div>

                {/* Edit / Save */}
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                  {editMode ? (
                    <>
                      <button onClick={() => { setEditMode(false); setUsernameError('') }}
                        style={{ padding:'7px 16px', borderRadius:99, border:'1px solid #e0e0e0', fontSize:13, fontWeight:600, cursor:'pointer', background:'#fff' }}>
                        Cancel
                      </button>
                      <button onClick={handleSaveProfile} disabled={saving}
                        style={{ padding:'7px 20px', borderRadius:99, background:'#1a73e8', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                        {saving ? <i className="fas fa-spinner fa-spin"/> : <><i className="fas fa-check"/> Save</>}
                      </button>
                    </>
                  ) : (
                    <button onClick={openEdit}
                      style={{ padding:'7px 20px', borderRadius:99, border:'1.5px solid #e0e0e0', fontSize:13, fontWeight:700, cursor:'pointer', background:'#fff', color:'#202124', display:'flex', alignItems:'center', gap:6 }}>
                      <i className="fas fa-pen" style={{ fontSize:11 }}/> Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Profile info / Edit fields */}
              {editMode ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#9aa0a6', textTransform:'uppercase', letterSpacing:'.04em', display:'block', marginBottom:4 }}>Display Name *</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name"
                      style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #1a73e8', borderRadius:10, fontSize:15, outline:'none', fontFamily:'inherit', background:'#f8f9fa', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#9aa0a6', textTransform:'uppercase', letterSpacing:'.04em', display:'block', marginBottom:4 }}>
                      Username {usernameError && <span style={{ color:'#ea4335', fontWeight:600, textTransform:'none', fontSize:11, marginLeft:6 }}>{usernameError}</span>}
                    </label>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9aa0a6', fontSize:14 }}>@</span>
                      <input
                        value={editUsername}
                        onChange={e => { setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setUsernameError('') }}
                        onBlur={() => editUsername && checkUsernameUnique(editUsername)}
                        placeholder="unique_username"
                        style={{ width:'100%', padding:'10px 14px 10px 28px', border:`1.5px solid ${usernameError ? '#ea4335' : '#e0e0e0'}`, borderRadius:10, fontSize:14, outline:'none', fontFamily:'inherit', background:'#f8f9fa', boxSizing:'border-box' }}/>
                    </div>
                    <p style={{ fontSize:11, color:'#9aa0a6', marginTop:4 }}>Lowercase letters, numbers, underscore only</p>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#9aa0a6', textTransform:'uppercase', letterSpacing:'.04em', display:'block', marginBottom:4 }}>Bio</label>
                    <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell people about yourself..." rows={3}
                      style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e0e0e0', borderRadius:10, fontSize:14, outline:'none', resize:'none', fontFamily:'inherit', background:'#f8f9fa', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#9aa0a6', textTransform:'uppercase', letterSpacing:'.04em', display:'block', marginBottom:4 }}>Phone (optional)</label>
                    <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" type="tel"
                      style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e0e0e0', borderRadius:10, fontSize:14, outline:'none', fontFamily:'inherit', background:'#f8f9fa', boxSizing:'border-box' }}/>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#0f0f0f', lineHeight:1.2 }}>
                    {profile?.displayName || user?.displayName || 'User'}
                  </div>
                  <div style={{ fontSize:13, color:'#9aa0a6', marginBottom:6, marginTop:2 }}>
                    @{profile?.username || 'user'}
                  </div>
                  {profile?.bio && (
                    <div style={{ fontSize:14, color:'#202124', lineHeight:1.55, marginBottom:10 }}>{profile.bio}</div>
                  )}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:4 }}>
                    {user?.email && (
                      <span style={{ fontSize:12, color:'#5f6368', display:'flex', alignItems:'center', gap:5 }}>
                        <i className="fas fa-envelope" style={{ color:'#9aa0a6', fontSize:11 }}/> {user.email}
                      </span>
                    )}
                    {profile?.phone && (
                      <span style={{ fontSize:12, color:'#5f6368', display:'flex', alignItems:'center', gap:5 }}>
                        <i className="fas fa-phone" style={{ color:'#9aa0a6', fontSize:11 }}/> {profile.phone}
                      </span>
                    )}
                    {joinDate && (
                      <span style={{ fontSize:12, color:'#5f6368', display:'flex', alignItems:'center', gap:5 }}>
                        <i className="fas fa-calendar-alt" style={{ color:'#9aa0a6', fontSize:11 }}/> Joined {joinDate}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 1️⃣ REALTIME Stats */}
              <div style={{ display:'flex', gap:0, marginTop:16, background:'#f8f9fa', borderRadius:12, overflow:'hidden', border:'1px solid #f0f0f0' }}>
                {[
                  { label:'Posts', val: posts.length },
                  { label:'Followers', val: profile?.followersCount || 0 },
                  { label:'Following', val: profile?.followingCount || 0 },
                ].map((s, i) => (
                  <div key={s.label} style={{ flex:1, textAlign:'center', padding:'12px 0', borderRight: i < 2 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ fontSize:20, fontWeight:800, color:'#0f0f0f' }}>{formatCount(s.val)}</div>
                    <div style={{ fontSize:11, color:'#9aa0a6', fontWeight:600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid #f0f0f0', background:'#fff', position:'sticky', top:56, zIndex:10 }}>
              {[
                { id:'posts',    label:'Posts',    icon:'fas fa-th-large' },
                { id:'saved',    label:'Saved',    icon:'fas fa-bookmark' },
                { id:'settings', label:'Settings', icon:'fas fa-cog' }
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ flex:1, padding:'11px 0', fontSize:12, fontWeight:700,
                    color: tab === t.id ? '#0f0f0f' : '#9aa0a6',
                    borderBottom: tab === t.id ? '2.5px solid #0f0f0f' : '2.5px solid transparent',
                    background:'none', border:'none',
                    borderBottom: tab === t.id ? '2.5px solid #0f0f0f' : '2.5px solid transparent',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <i className={t.icon} style={{ fontSize:13 }}/> {t.label}
                  {t.id === 'posts' && posts.length > 0 && (
                    <span style={{ background:'#f1f3f4', color:'#5f6368', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99 }}>
                      {posts.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── POSTS TAB ── */}
            {tab === 'posts' && (
              postsLoading ? (
                <div style={{ padding:40, textAlign:'center' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize:22, color:'#9aa0a6' }}/>
                </div>
              ) : posts.length === 0 ? (
                <div style={{ textAlign:'center', padding:'60px 20px', color:'#9aa0a6' }}>
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
                  {posts.map(p => (
                    <ProfilePostCard key={p.id} post={p} onClick={id => setOpenCommentPost(id)}/>
                  ))}
                </div>
              )
            )}

            {/* ── SAVED TAB ── */}
            {tab === 'saved' && (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'#9aa0a6' }}>
                <i className="far fa-bookmark" style={{ fontSize:36, marginBottom:12, display:'block', opacity:.4 }}/>
                <p style={{ fontWeight:600, marginBottom:6 }}>Saved Articles</p>
                <p style={{ fontSize:13 }}>Articles you bookmark in NewsTally appear here</p>
                <button onClick={() => navigate('/news')}
                  style={{ marginTop:16, padding:'10px 24px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:99, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  Browse News
                </button>
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {tab === 'settings' && (
              <div style={{ padding:'16px' }}>
                {/* Account info */}
                <div style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:14, marginBottom:16, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid #f5f5f5', background:'#f8f9fa' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#9aa0a6', textTransform:'uppercase', letterSpacing:'.05em' }}>Account</span>
                  </div>
                  {[
                    { icon:'fas fa-user-circle', label:'Name', val: profile?.displayName || user?.displayName || 'User' },
                    { icon:'fas fa-at', label:'Username', val: `@${profile?.username || 'user'}` },
                    { icon:'fas fa-envelope', label:'Email', val: user?.email || '—' },
                    { icon:'fas fa-user-friends', label:'Followers', val: formatCount(profile?.followersCount || 0) },
                    { icon:'fas fa-user-plus', label:'Following', val: formatCount(profile?.followingCount || 0) },
                    { icon:'fas fa-phone', label:'Phone', val: profile?.phone || 'Not set' },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom: i < arr.length-1 ? '1px solid #fafafa' : 'none' }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:'#f1f3f4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className={row.icon} style={{ fontSize:15, color:'#5f6368' }}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, color:'#9aa0a6', fontWeight:600 }}>{row.label}</div>
                        <div style={{ fontSize:13, color:'#202124', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.val}</div>
                      </div>
                      {row.label === 'Name' && (
                        <button onClick={() => { setTab('posts'); openEdit() }}
                          style={{ fontSize:11, color:'#1a73e8', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>
                          Edit
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pages links */}
                <div style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:14, marginBottom:16, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid #f5f5f5', background:'#f8f9fa' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#9aa0a6', textTransform:'uppercase', letterSpacing:'.05em' }}>Information</span>
                  </div>
                  {SETTINGS_LINKS.map((link, i) => (
                    <div key={link.url} onClick={() => navigate(link.url)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: i < SETTINGS_LINKS.length-1 ? '1px solid #fafafa' : 'none', cursor:'pointer' }}
                      onMouseOver={e => e.currentTarget.style.background='#f8f9fa'}
                      onMouseOut={e => e.currentTarget.style.background='transparent'}>
                      <div style={{ width:36, height:36, borderRadius:10, background:`${link.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className={link.icon} style={{ fontSize:16, color:link.color }}/>
                      </div>
                      <span style={{ flex:1, fontSize:14, fontWeight:600, color:'#202124' }}>{link.label}</span>
                      <i className="fas fa-chevron-right" style={{ fontSize:12, color:'#c0c0c0' }}/>
                    </div>
                  ))}
                </div>

                {/* App info */}
                <div style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:14, marginBottom:16, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid #f5f5f5', background:'#f8f9fa' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#9aa0a6', textTransform:'uppercase', letterSpacing:'.05em' }}>App</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom:'1px solid #fafafa' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#e8f0fe', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" style={{ width:22, height:22, borderRadius:'50%' }} alt=""/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#202124' }}>NewsTally</div>
                      <div style={{ fontSize:11, color:'#9aa0a6' }}>Version 2.0 · Powered by Socialgati</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#fce4ec', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <i className="fas fa-globe" style={{ fontSize:16, color:'#e91e63' }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#202124' }}>Websites</div>
                      <div style={{ fontSize:11, color:'#9aa0a6' }}>newstally.online · socialgati.online</div>
                    </div>
                  </div>
                </div>

                {/* Sign out */}
                <button onClick={handleLogout}
                  style={{ width:'100%', padding:'14px', background:'#fff', border:'1.5px solid #fde8e8', borderRadius:14, fontSize:14, fontWeight:700, color:'#ea4335', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <i className="fas fa-sign-out-alt"/> Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CommentsPage opens when post is tapped — works for both text and repost */}
      <CommentsPage postId={openCommentPost} onClose={() => setOpenCommentPost(null)} onOpenProfile={() => {}}/>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <BottomNav/>
    </>
  )
}
