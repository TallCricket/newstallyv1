import { useState, useEffect } from 'react'
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc } from 'firebase/firestore'
import { signOut, updateProfile } from 'firebase/auth'
import { db, auth, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { formatCount, showToast, timeAgo } from '../utils'
import BottomNav from '../components/BottomNav'
import AuthModal from '../components/AuthModal'
import { useNavigate, useParams } from 'react-router-dom'
import CommentsPage from '../components/CommentsPage'

export default function Profile() {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('posts')
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [openCommentPost, setOpenCommentPost] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [saving, setSaving] = useState(false)

  const uid = user?.uid

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDocs(query(collection(db,'artifacts',APP_ID,'public','data','reposts'), where('userId','==',uid), orderBy('timestamp','desc'), limit(30)))
    ]).then(([uSnap, pSnap]) => {
      if (uSnap.exists()) {
        const d = uSnap.data()
        setProfile(d)
        setEditName(d.displayName || '')
        setEditBio(d.bio || '')
      }
      setPosts(pSnap.docs.map(d => ({ id:d.id, ...d.data() })))
    }).catch(console.error).finally(() => setLoading(false))
  }, [uid])

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateDoc(doc(db,'users',uid), { displayName: editName, bio: editBio })
      await updateProfile(user, { displayName: editName }).catch(()=>{})
      setProfile(p => ({ ...p, displayName: editName, bio: editBio }))
      setEditMode(false)
      showToast('Profile updated ✅')
    } catch(e) { showToast('Failed to update') }
    finally { setSaving(false) }
  }

  const handleLogout = async () => {
    if (!window.confirm('Sign out?')) return
    await signOut(auth)
    showToast('Signed out')
    navigate('/')
  }

  const av = profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.displayName||'U').substring(0,2))}&background=9334e6&color=fff&bold=true&size=128`

  // Cover gradient colors per user
  const coverGrads = ['linear-gradient(135deg,#1a73e8,#9334e6)','linear-gradient(135deg,#e53935,#ff6d00)','linear-gradient(135deg,#34a853,#0077b6)','linear-gradient(135deg,#9334e6,#e53935)','linear-gradient(135deg,#0077b6,#34a853)']
  const coverGrad = coverGrads[(uid?.charCodeAt(0) || 0) % coverGrads.length]

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="Socialgati"/>
          <div><span style={{ fontSize:18, fontWeight:800, color:"#9334e6", display:"block", lineHeight:1.1 }}>My Profile</span><span style={{ fontSize:10, color:"#9aa0a6" }}>Socialgati</span></div>
        </div>
        {user && (
          <button onClick={handleLogout} className="icon-btn" title="Sign out">
            <i className="fas fa-sign-out-alt"/>
          </button>
        )}
      </header>

      <div className="main-wrapper" style={{ paddingBottom:80 }}>
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
          <div style={{ padding:20, textAlign:'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize:28, color:'#9aa0a6' }}/>
          </div>
        ) : (
          <div>
            {/* Cover */}
            <div style={{ height:100, background:coverGrad }}/>

            {/* Avatar row */}
            <div style={{ padding:'0 16px 16px', position:'relative' }}>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14 }}>
                <img src={av} style={{ width:80, height:80, borderRadius:'50%', border:'3px solid #fff', objectFit:'cover', marginTop:-40, background:'#f0f0f0' }} alt=""
                  onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}/>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                  {editMode ? (
                    <>
                      <button onClick={() => setEditMode(false)}
                        style={{ padding:'7px 16px', borderRadius:99, border:'1px solid #e0e0e0', fontSize:13, fontWeight:600, cursor:'pointer', background:'#fff' }}>
                        Cancel
                      </button>
                      <button onClick={handleSaveProfile} disabled={saving}
                        style={{ padding:'7px 20px', borderRadius:99, background:'#1a73e8', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                        {saving ? <i className="fas fa-spinner fa-spin"/> : 'Save'}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditMode(true)}
                      style={{ padding:'7px 20px', borderRadius:99, border:'1.5px solid #e0e0e0', fontSize:13, fontWeight:700, cursor:'pointer', background:'#fff', color:'#202124', display:'flex', alignItems:'center', gap:6 }}>
                      <i className="fas fa-pen" style={{ fontSize:11 }}/> Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {editMode ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Display name"
                    style={{ padding:'10px 14px', border:'1.5px solid #1a73e8', borderRadius:10, fontSize:15, outline:'none', fontFamily:'inherit', background:'#f8f9fa' }}/>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Bio (optional)" rows={2}
                    style={{ padding:'10px 14px', border:'1.5px solid #e0e0e0', borderRadius:10, fontSize:14, outline:'none', resize:'none', fontFamily:'inherit', background:'#f8f9fa' }}/>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:20, fontWeight:700, color:'#0f0f0f' }}>{profile?.displayName || 'User'}</div>
                  <div style={{ fontSize:13, color:'#9aa0a6', marginBottom:6 }}>@{profile?.username || 'user'}</div>
                  {profile?.bio && <div style={{ fontSize:14, color:'#202124', lineHeight:1.5, marginBottom:8 }}>{profile.bio}</div>}
                </div>
              )}

              {/* Stats */}
              <div style={{ display:'flex', gap:24, marginTop:14, paddingTop:14, borderTop:'1px solid #f0f0f0' }}>
                {[
                  { label:'Posts', val: posts.length },
                  { label:'Followers', val: profile?.followersCount || 0 },
                  { label:'Following', val: profile?.followingCount || 0 },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:20, fontWeight:700, color:'#0f0f0f' }}>{formatCount(s.val)}</div>
                    <div style={{ fontSize:12, color:'#9aa0a6' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid #f0f0f0', background:'#fff', position:'sticky', top:56, zIndex:10 }}>
              {['posts','saved'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ flex:1, padding:'12px', fontSize:13, fontWeight:600, color: tab===t ? '#0f0f0f':'#9aa0a6',
                    borderBottom: tab===t ? '2px solid #0f0f0f' : '2px solid transparent', background:'none', border:'none',
                    borderBottom: tab===t ? '2px solid #0f0f0f' : '2px solid transparent', cursor:'pointer', textTransform:'capitalize' }}>
                  {t === 'posts' ? `Posts (${posts.length})` : 'Saved'}
                </button>
              ))}
            </div>

            {/* Posts grid */}
            {tab === 'posts' && (
              posts.length === 0 ? (
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
                <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>
                  {posts.map(p => (
                    <div key={p.id} style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:12, padding:14, cursor:'pointer' }}
                      onClick={() => setOpenCommentPost(p.id)}>
                      <div style={{ fontSize:15, color:'#0f0f0f', lineHeight:1.5, marginBottom:6,
                        display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {p.headline || p.title || ''}
                      </div>
                      {p.image && (
                        <img src={p.image} alt="" style={{ width:'100%', height:140, objectFit:'cover', borderRadius:8, marginBottom:6 }}
                          onError={e => e.target.style.display='none'}/>
                      )}
                      <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                        <span style={{ fontSize:12, color:'#9aa0a6' }}>{timeAgo(p.timestamp?.toDate?.() || p.timestamp)}</span>
                        <span style={{ fontSize:12, color:'#9aa0a6', display:'flex', alignItems:'center', gap:4 }}>
                          <i className="far fa-heart"/> {(p.likes||[]).length}
                        </span>
                        <span style={{ fontSize:12, color:'#9aa0a6', display:'flex', alignItems:'center', gap:4 }}>
                          <i className="far fa-comment"/> {p.commentsCount||0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'saved' && (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'#9aa0a6' }}>
                <i className="far fa-bookmark" style={{ fontSize:36, marginBottom:12, display:'block', opacity:.4 }}/>
                <p style={{ fontWeight:600, marginBottom:6 }}>Saved articles</p>
                <p style={{ fontSize:13 }}>Articles you save in NewsTally appear here</p>
              </div>
            )}
          </div>
        )}
      </div>

      <CommentsPage postId={openCommentPost} onClose={() => setOpenCommentPost(null)} onOpenProfile={() => {}}/>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <BottomNav/>
    </>
  )
}
