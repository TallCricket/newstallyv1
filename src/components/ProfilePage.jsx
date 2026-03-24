import { useState, useEffect } from 'react'
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { timeAgo, formatCount, showToast, sendNotification } from '../utils'
import PostCard from './PostCard'

export default function ProfilePage({ uid, onClose, onOpenComments, onOpenProfile, onAuthRequired }) {
  const { user, userData } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('posts')
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const isOwn = user && user.uid === uid

  useEffect(() => {
    if (!uid) return
    setLoading(true)
    setProfile(null); setPosts([])
    Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDocs(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'), where('userId','==',uid), orderBy('timestamp','desc'), limit(20)))
    ]).then(([uSnap, pSnap]) => {
      if (uSnap.exists()) {
        const d = uSnap.data()
        setProfile(d)
        setFollowing(user ? (d.followers||[]).includes(user.uid) : false)
      }
      setPosts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    }).catch(console.error).finally(() => setLoading(false))
  }, [uid])

  const handleFollow = async () => {
    if (!user) return onAuthRequired()
    const targetRef = doc(db, 'users', uid)
    const myRef = doc(db, 'users', user.uid)
    const mySnap = await getDoc(myRef)
    const myData = mySnap?.data() || {}
    const myName = myData.displayName || userData?.displayName || user.displayName || 'Someone'

    if (following) {
      await updateDoc(targetRef, { followers: arrayRemove(user.uid), followersCount: increment(-1) }).catch(()=>{})
      await updateDoc(myRef, { following: arrayRemove(uid), followingCount: increment(-1) }).catch(()=>{})
      setFollowing(false)
      setProfile(p => p ? { ...p, followersCount: Math.max(0, (p.followersCount||0)-1) } : p)
    } else {
      await updateDoc(targetRef, { followers: arrayUnion(user.uid), followersCount: increment(1) }).catch(()=>{})
      await updateDoc(myRef, { following: arrayUnion(uid), followingCount: increment(1) }).catch(()=>{})
      setFollowing(true)
      setProfile(p => p ? { ...p, followersCount: (p.followersCount||0)+1 } : p)
      sendNotification(uid, { type:'follow', fromUid:user.uid, fromName:myName, fromAvatar:user.photoURL||'', message:'ne aapko follow kiya 🎉', postId:'' })
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    showToast('Logged out')
    onClose()
  }

  const av = profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.displayName||'U').substring(0,2))}&background=9334e6&color=fff&bold=true`

  if (!uid) return null

  return (
    <div className={`page-layer ${uid ? 'open' : ''}`} style={{ background:'#fff' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', position:'sticky', top:0, background:'#fff', zIndex:10, borderBottom:'1px solid #f0f0f0' }}>
        <button className="page-back-btn" onClick={onClose}><i className="fas fa-arrow-left"/></button>
        <span style={{ fontWeight:700, fontSize:16 }}>{profile?.username ? '@'+profile.username : 'Profile'}</span>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center' }}><i className="fas fa-spinner fa-spin" style={{ fontSize:24, color:'#9aa0a6' }}/></div>
      ) : !profile ? (
        <div style={{ padding:40, textAlign:'center', color:'#9aa0a6' }}>User not found</div>
      ) : (
        <div>
          {/* Cover */}
          <div className="profile-cover"/>
          {/* Avatar + actions */}
          <div style={{ padding:'0 16px 16px' }}>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:12 }}>
              <img src={av} className="profile-av" alt="" onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}}/>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                {isOwn ? (
                  <button onClick={handleLogout} style={{ padding:'8px 18px', borderRadius:99, border:'1px solid #e0e0e0', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    <i className="fas fa-sign-out-alt" style={{ marginRight:6 }}/>Logout
                  </button>
                ) : (
                  <button className={`btn-follow ${following?'following':''}`} onClick={handleFollow}>
                    {following ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontWeight:700, fontSize:18, color:'#0f0f0f' }}>{profile.displayName||'User'}</div>
            <div style={{ fontSize:13, color:'#606060', marginBottom:8 }}>@{profile.username||'user'}</div>
            {profile.bio && <div style={{ fontSize:14, color:'#202124', marginBottom:10, lineHeight:1.5 }}>{profile.bio}</div>}
            {/* Stats */}
            <div style={{ display:'flex', gap:24, marginTop:12 }}>
              <div className="profile-stat"><span className="num">{formatCount(posts.length)}</span><span className="lbl">Posts</span></div>
              <div className="profile-stat"><span className="num">{formatCount(profile.followersCount||0)}</span><span className="lbl">Followers</span></div>
              <div className="profile-stat"><span className="num">{formatCount(profile.followingCount||0)}</span><span className="lbl">Following</span></div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid #f0f0f0' }}>
            {['posts'].map(t => (
              <button key={t} className={`profile-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)} style={{ textTransform:'capitalize' }}>{t}</button>
            ))}
          </div>

          {/* Posts */}
          <div style={{ padding:'12px 16px' }}>
            {posts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#9aa0a6' }}>
                <i className="fas fa-bolt" style={{ fontSize:32, marginBottom:8, display:'block', opacity:.4 }}/>
                <p>No posts yet</p>
              </div>
            ) : posts.map(p => (
              <PostCard key={p.id} post={p} id={p.id} onOpenComments={onOpenComments} onOpenProfile={onOpenProfile} onAuthRequired={onAuthRequired}/>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
