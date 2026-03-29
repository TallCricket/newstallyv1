/**
 * UserProfilePage {"\u2014"} /u/:username  (Instagram-style public profile link)
 * Fetches user by username from Firestore, renders ProfilePage overlay.
 */
import { useState, useEffect } from 'react'
import { collection, query, where, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useParams, useNavigate } from 'react-router-dom'
import ProfilePage from '../components/ProfilePage'
import CommentsPage from '../components/CommentsPage'
import AuthModal from '../components/AuthModal'
import BottomNav from '../components/BottomNav'

export default function UserProfilePage() {
  const { username } = useParams()   // e.g. "@shivank" or "shivank"
  const navigate = useNavigate()

  const [uid, setUid]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [openCommentPost, setOpenCommentPost] = useState(null)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (!username) return
    const uname = username.startsWith('@') ? username.slice(1) : username
    setLoading(true)
    getDocs(query(
      collection(db, 'users'),
      where('username', '==', uname.toLowerCase()),
      limit(1)
    )).then(snap => {
      if (!snap.empty) {
        setUid(snap.docs[0].id)
      } else {
        setNotFound(true)
      }
      setLoading(false)
    }).catch(() => { setNotFound(true); setLoading(false) })
  }, [username])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:42, height:42, border:'3px solid var(--border)', borderTopColor:'#9334e6', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 14px' }}/>
        <p style={{ color:'var(--muted)', fontSize:13 }}>Loading profile...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', background:'var(--bg)', gap:16, padding:20, textAlign:'center' }}>
      <i className="fas fa-user-slash" style={{ fontSize:56, color:'var(--border)' }}/>
      <h2 style={{ fontSize:22, fontWeight:700, color:'var(--ink)' }}>@{username} not found</h2>
      <p style={{ fontSize:14, color:'var(--muted)' }}>This profile may not exist or was removed</p>
      <button onClick={() => navigate('/')}
        style={{ padding:'11px 28px', background:'#9334e6', color:'#fff', border:'none', borderRadius:99, fontWeight:700, fontSize:14, cursor:'pointer' }}>
        Go Home
      </button>
      <BottomNav/>
    </div>
  )

  return (
    <>
      <BottomNav/>
      {/* ProfilePage renders as full-page overlay since uid is set */}
      {uid && (
        <ProfilePage
          uid={uid}
          onClose={() => navigate(-1)}
          onOpenComments={id => setOpenCommentPost(id)}
          onOpenProfile={newUid => navigate(`/u/${newUid}`)} // won't be username but works via uid
          onAuthRequired={() => setShowAuth(true)}
        />
      )}
      <CommentsPage postId={openCommentPost} onClose={() => setOpenCommentPost(null)} onOpenProfile={() => {}}/>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
    </>
  )
}
