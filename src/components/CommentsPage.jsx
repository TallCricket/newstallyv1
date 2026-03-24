import { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, increment, getDoc, orderBy, query } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { timeAgo, showToast, sendNotification } from '../utils'

export default function CommentsPage({ postId, onClose, onOpenProfile }) {
  const { user, userData } = useAuth()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    if (!postId) return
    // Load post
    getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', postId)).then(s => s.exists() && setPost(s.data()))
    // Listen to comments
    const unsub = onSnapshot(
      query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', postId, 'comments'), orderBy('timestamp', 'asc')),
      snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [postId])

  const submit = async () => {
    if (!user) return showToast('Sign in to comment')
    const t = text.trim()
    if (!t) return
    setText('')
    setSending(true)
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', postId, 'comments'), {
        text: t, userId: user.uid,
        username: userData?.username || user.displayName || 'User',
        userAvatar: user.photoURL || '',
        timestamp: serverTimestamp()
      })
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', postId), { commentsCount: increment(1) }).catch(()=>{})
      if (post?.userId && post.userId !== user.uid) {
        sendNotification(post.userId, {
          type: 'comment', fromUid: user.uid,
          fromName: userData?.displayName || user.displayName || 'Someone',
          fromAvatar: user.photoURL || '',
          message: `ne comment kiya: "${t.substring(0,50)}"`,
          postId, postSnippet: (post?.headline||'').substring(0,60)
        })
      }
    } catch(e) { showToast('Failed'); setText(t) }
    finally { setSending(false) }
  }

  const av = u => u || `https://ui-avatars.com/api/?name=U&background=efefef`

  return (
    <div className={`page-layer ${postId ? 'open' : ''}`} style={{ display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid #f0f0f0', flexShrink:0, position:'sticky', top:0, background:'#fff', zIndex:10 }}>
        <button className="page-back-btn" onClick={onClose}><i className="fas fa-times"/></button>
        <span style={{ fontWeight:700, fontSize:16 }}>Comments</span>
      </div>

      {/* Post preview */}
      {post && (
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0', fontSize:14, color:'#202124', lineHeight:1.5 }}>
          <strong>@{post.username}</strong> {post.headline}
        </div>
      )}

      {/* Comments */}
      <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {comments.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#9aa0a6' }}>
            <i className="far fa-comment" style={{ fontSize:32, marginBottom:8, display:'block', opacity:.4 }}/>
            <p>No comments yet. Be first!</p>
          </div>
        ) : comments.map(c => (
          <div key={c.id} className="comment-item" style={{ padding:'12px 16px' }}>
            <img src={av(c.userAvatar)} className="comment-av" alt="" onClick={() => { onOpenProfile(c.userId); onClose() }}
              onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=U&background=efefef`}}/>
            <div className="comment-body">
              <span className="comment-username">{c.username}</span>
              <p className="comment-text">{c.text}</p>
              <span className="comment-time">{timeAgo(c.timestamp?.toDate?.() || c.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding:'10px 16px', borderTop:'1px solid #f0f0f0', display:'flex', gap:10, alignItems:'center', flexShrink:0, background:'#fff' }}>
        <img src={av(user?.photoURL)} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} alt=""
          onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=U&background=efefef`}}/>
        <input ref={inputRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}
          placeholder={user ? 'Add a comment...' : 'Sign in to comment'}
          style={{ flex:1, padding:'10px 14px', background:'#f1f3f4', border:'none', borderRadius:99, fontSize:14, outline:'none' }}/>
        <button onClick={submit} disabled={!text.trim()||sending} style={{ color: text.trim() ? '#1a73e8' : '#c7c7c7', fontWeight:700, fontSize:14 }}>
          {sending ? <i className="fas fa-spinner fa-spin"/> : <i className="fas fa-paper-plane"/>}
        </button>
      </div>
    </div>
  )
}
