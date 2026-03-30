import { useState, useEffect } from 'react'
import {
  doc, getDoc, collection, query, where,
  orderBy, limit, getDocs, updateDoc,
  arrayUnion, arrayRemove, increment
} from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { timeAgo, formatCount, showToast, sendNotification } from '../utils'
import PostCard from './PostCard'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage({ uid, onClose, onOpenComments, onOpenProfile, onAuthRequired }) {
  const { user, userData } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile]     = useState(null)
  const [posts, setPosts]         = useState([])
  const [following, setFollowing] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)

  const isOwn = user && user.uid === uid

  // Fetch user profile {"\u2014"} try by uid directly
  useEffect(() => {
    if (!uid) return
    setLoading(true)
    setPostsLoading(true)
    setProfile(null)
    setPosts([])

    // Load profile
    getDoc(doc(db, 'users', uid))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data()
          setProfile(d)
          setFollowing(user ? (d.followers || []).includes(user.uid) : false)
        } else {
          setProfile(null)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('ProfilePage getDoc error:', err)
        setProfile(null)
        setLoading(false)
      })

    // Load posts {"\u2014"} both text posts and reposts
    getDocs(query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts'),
      where('userId', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(30)
    ))
      .then(snap => {
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setPostsLoading(false)
      })
      .catch(err => {
        console.error('ProfilePage posts error:', err)
        setPosts([])
        setPostsLoading(false)
      })
  }, [uid, user?.uid]) // eslint-disable-line

  const handleFollow = async () => {
    if (!user) return onAuthRequired()
    const targetRef = doc(db, 'users', uid)
    const myRef     = doc(db, 'users', user.uid)

    try {
      if (following) {
        await updateDoc(targetRef, { followers: arrayRemove(user.uid), followersCount: increment(-1) })
        await updateDoc(myRef, { following: arrayRemove(uid), followingCount: increment(-1) })
        setFollowing(false)
        setProfile(p => p ? { ...p, followersCount: Math.max(0, (p.followersCount || 0) - 1) } : p)
      } else {
        await updateDoc(targetRef, { followers: arrayUnion(user.uid), followersCount: increment(1) })
        await updateDoc(myRef, { following: arrayUnion(uid), followingCount: increment(1) })
        setFollowing(true)
        setProfile(p => p ? { ...p, followersCount: (p.followersCount || 0) + 1 } : p)
        const mySnap = await getDoc(myRef).catch(() => null)
        const myName = mySnap?.data()?.displayName || userData?.displayName || user.displayName || 'Someone'
        sendNotification(uid, {
          type: 'follow', fromUid: user.uid, fromName: myName,
          fromAvatar: user.photoURL || '', message: 'ne aapko follow kiya \u{1F389}', postId: ''
        })
      }
    } catch(e) {
      console.error('Follow/unfollow error:', e)
      showToast('Action failed, try again')
    }
  }

  const av = profile?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.displayName || 'U').substring(0, 2))}&background=9334e6&color=fff&bold=true`

  if (!uid) return null

  return (
    <div className={`page-layer ${uid ? 'open' : ''}`} style={{ background: 'var(--surface)' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', position:'sticky', top:0, background:'var(--header-bg)', backdropFilter:'blur(20px)', zIndex:10, borderBottom:'1px solid var(--border)' }}>
        <button className="page-back-btn" onClick={onClose}><i className="fas fa-arrow-left"/></button>
        <span style={{ fontWeight:700, fontSize:16, color:'var(--ink)' }}>
          {loading ? 'Profile' : profile?.username ? '@' + profile.username : profile?.displayName || 'Profile'}
        </span>
        {isOwn && (
          <button onClick={() => { onClose(); navigate('/profile') }}
            style={{ marginLeft:'auto', fontSize:12, color:'#1a73e8', fontWeight:700, background:'rgba(26,115,232,.1)', border:'none', borderRadius:99, padding:'5px 12px', cursor:'pointer' }}>
            Edit Profile
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize:24, color:'var(--muted)' }}/>
        </div>
      ) : !profile ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
          <i className="fas fa-user-slash" style={{ fontSize:40, marginBottom:16, display:'block', opacity:.3 }}/>
          <p style={{ fontWeight:700, fontSize:16, color:'var(--ink)', marginBottom:8 }}>User not found</p>
          <p style={{ fontSize:13 }}>This profile may not exist or was removed</p>
        </div>
      ) : (
        <div>
          {/* Cover */}
          <div className="profile-cover"/>

          {/* Avatar + actions */}
          <div style={{ padding:'0 16px 16px', background:'var(--surface)' }}>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:12 }}>
              <img src={av} className="profile-av" alt=""
                onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=9334e6&color=fff`}/>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                {isOwn ? (
                  <button onClick={() => { onClose(); navigate('/profile') }}
                    style={{ padding:'8px 18px', borderRadius:99, border:'1px solid var(--border)', fontSize:13, fontWeight:600, cursor:'pointer', background:'var(--surface)', color:'var(--ink)' }}>
                    <i className="fas fa-pen" style={{ marginRight:6, fontSize:11 }}/>Edit
                  </button>
                ) : (
                  <button className={`btn-follow ${following ? 'following' : ''}`} onClick={handleFollow}>
                    {following ? '{"\u2713"} Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            <div style={{ fontWeight:700, fontSize:18, color:'var(--ink)' }}>{profile.displayName || 'User'}</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:8 }}>@{profile.username || 'user'}</div>
            {profile.bio && <div style={{ fontSize:14, color:'var(--ink2)', marginBottom:10, lineHeight:1.5 }}>{profile.bio}</div>}

            <div style={{ display:'flex', gap:24, marginTop:12 }}>
              <div className="profile-stat"><span className="num">{formatCount(posts.length)}</span><span className="lbl">Posts</span></div>
              <div className="profile-stat"><span className="num">{formatCount(profile.followersCount || 0)}</span><span className="lbl">Followers</span></div>
              <div className="profile-stat"><span className="num">{formatCount(profile.followingCount || 0)}</span><span className="lbl">Following</span></div>
            </div>
          </div>

          {/* Posts */}
          <div style={{ borderTop:'1px solid var(--border)' }}>
            <div style={{ padding:'10px 16px 4px', background:'var(--surface2)' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>
                Posts {!postsLoading && `(${posts.length})`}
              </span>
            </div>
            <div style={{ padding:'4px 12px' }}>
              {postsLoading ? (
                <div style={{ padding:30, textAlign:'center' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize:20, color:'var(--muted)' }}/>
                </div>
              ) : posts.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}>
                  <i className="fas fa-bolt" style={{ fontSize:32, marginBottom:8, display:'block', opacity:.3 }}/>
                  <p style={{ fontWeight:600, color:'var(--ink)', marginBottom:4 }}>No posts yet</p>
                  <p style={{ fontSize:12 }}>{isOwn ? 'Share something on Socialgati!' : 'This user has not posted yet'}</p>
                </div>
              ) : posts.map(p => (
                <PostCard
                  key={p.id} post={p} id={p.id}
                  onOpenComments={onOpenComments}
                  onOpenProfile={onOpenProfile}
                  onAuthRequired={onAuthRequired}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
