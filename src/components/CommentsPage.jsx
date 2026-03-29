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
  const [tab, setTab] = useState('comments') // 'comments' | 'reposted'
  const inputRef = useRef()

  useEffect(() => {
    if (!postId) return
    setTab('comments')
    setText('')

    // Load post data
    const unsubPost = onSnapshot(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', postId),
      s => s.exists() && setPost({ id: s.id, ...s.data() })
    )

    // Listen to comments
    const unsubComments = onSnapshot(
      query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', postId, 'comments'), orderBy('timestamp', 'asc')),
      snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    )
    return () => { unsubPost(); unsubComments() }
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
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', postId), { commentsCount: increment(1) }).catch(() => {})
      if (post?.userId && post.userId !== user.uid) {
        sendNotification(post.userId, {
          type: 'comment', fromUid: user.uid,
          fromName: userData?.displayName || user.displayName || 'Someone',
          fromAvatar: user.photoURL || '',
          message: `ne comment kiya: "${t.substring(0, 50)}"`,
          postId, postSnippet: (post?.headline || '').substring(0, 60)
        })
      }
    } catch { showToast('Failed'); setText(t) }
    finally { setSending(false) }
  }

  const av = url => url || 'https://ui-avatars.com/api/?name=U&background=e8f0fe&color=1a73e8'

  const repostedUsers = post?.repostedUsers || []
  const repostCount = post?.repostCount || 0

  return (
    <div className={`page-layer ${postId ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>

      {/* \u2500\u2500 Header \u2500\u2500 */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
        borderBottom:'1px solid var(--border)', flexShrink:0, position:'sticky', top:0,
        background:'var(--surface)', zIndex:10 }}>
        <button onClick={onClose}
          style={{ width:34, height:34, borderRadius:'50%', background:'var(--surface2)', border:'none',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'var(--muted)' }}>
          <i className="fas fa-times"/>
        </button>
        <span style={{ fontWeight:700, fontSize:16, color:'var(--ink)' }}>
          {post?.type === 'repost' ? 'News' : 'Post'}
        </span>
        {post?.type === 'repost' && repostCount > 0 && (
          <span style={{ marginLeft:'auto', fontSize:12, color:'#34a853', fontWeight:700,
            background:'#e6f4ea', padding:'3px 10px', borderRadius:99, display:'flex', alignItems:'center', gap:5 }}>
            <i className="fas fa-retweet" style={{ fontSize:10 }}/> {repostCount} shared
          </span>
        )}
      </div>

      {/* \u2500\u2500 News card preview (for reposts) \u2500\u2500 */}
      {post?.type === 'repost' && post.headline && (
        <div style={{ margin:'12px 16px 0', borderRadius:14, overflow:'hidden', border:'1px solid var(--border)',
          boxShadow:'0 2px 8px rgba(0,0,0,.06)', cursor:'pointer' }}
          onClick={() => post.newsUrl && window.open(post.newsUrl, '_blank', 'noopener')}>
          {post.image && (
            <div style={{ position:'relative', width:'100%', paddingTop:'56.25%', background:'var(--surface2)', overflow:'hidden' }}>
              <img src={post.image} alt={post.headline} loading="lazy"
                style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                onError={e => e.target.style.display='none'}/>
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 60%)' }}/>
              <div style={{ position:'absolute', top:10, left:10 }}>
                <span style={{ background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)', color:'#fff', fontSize:10,
                  fontWeight:700, padding:'3px 9px', borderRadius:99 }}>
                  {post.newsSource}
                </span>
              </div>
            </div>
          )}
          <div style={{ padding:'12px 14px', background:'var(--surface)' }}>
            {post.newsCategory && (
              <span style={{ fontSize:10, fontWeight:800, color:'#1a73e8', textTransform:'uppercase',
                letterSpacing:'.05em', display:'block', marginBottom:6 }}>{post.newsCategory}</span>
            )}
            <p style={{ fontSize:15, fontWeight:700, color:'var(--ink)', lineHeight:1.4, margin:0 }}>
              {post.headline}
            </p>
            <div style={{ marginTop:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'var(--muted)' }}>{post.newsSource}</span>
              <span style={{ fontSize:12, color:'#1a73e8', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                Read full story <i className="fas fa-arrow-right" style={{ fontSize:10 }}/>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* \u2500\u2500 Tabs \u2500\u2500 */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--surface)',
        flexShrink:0, marginTop: post?.type === 'repost' ? 0 : 0 }}>
        <button onClick={() => setTab('comments')}
          style={{ flex:1, padding:'11px 0', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            color: tab==='comments' ? '#1a73e8' : 'var(--muted)',
            borderBottom: tab==='comments' ? '2px solid #1a73e8' : '2px solid transparent', transition:'all .2s' }}>
          <i className="far fa-comment" style={{ marginRight:6, fontSize:12 }}/>
          Comments {comments.length > 0 && `(${comments.length})`}
        </button>
        {post?.type === 'repost' && (
          <button onClick={() => setTab('reposted')}
            style={{ flex:1, padding:'11px 0', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
              color: tab==='reposted' ? '#34a853' : 'var(--muted)',
              borderBottom: tab==='reposted' ? '2px solid #34a853' : '2px solid transparent', transition:'all .2s' }}>
            <i className="fas fa-retweet" style={{ marginRight:6, fontSize:12 }}/>
            Reposted by {repostCount > 0 && `(${repostCount})`}
          </button>
        )}
      </div>

      {/* \u2500\u2500 Tab content \u2500\u2500 */}
      <div style={{ flex:1, overflowY:'auto' }}>

        {/* COMMENTS tab */}
        {tab === 'comments' && (
          <>
            {comments.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--muted)' }}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--surface2)',
                  display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <i className="far fa-comment" style={{ fontSize:22, opacity:.5 }}/>
                </div>
                <p style={{ fontWeight:600, marginBottom:4, color:'var(--ink)' }}>No comments yet</p>
                <p style={{ fontSize:13, color:'var(--muted)' }}>Be the first to comment!</p>
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} style={{ display:'flex', gap:10, padding:'12px 16px', borderBottom:'1px solid var(--border2)' }}>
                  <img src={av(c.userAvatar)} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0, cursor:'pointer' }}
                    alt="" onClick={() => { onOpenProfile(c.userId); onClose() }}
                    onError={e => e.target.src='https://ui-avatars.com/api/?name=U&background=e8f0fe&color=1a73e8'}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{c.username}</span>
                      <span style={{ fontSize:11, color:'var(--muted)' }}>{timeAgo(c.timestamp?.toDate?.() || c.timestamp)}</span>
                    </div>
                    <p style={{ fontSize:14, color:'var(--ink)', lineHeight:1.5, margin:0 }}>{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* REPOSTED BY tab */}
        {tab === 'reposted' && (
          <>
            {repostedUsers.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--muted)' }}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--surface2)',
                  display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <i className="fas fa-retweet" style={{ fontSize:22, opacity:.5 }}/>
                </div>
                <p style={{ fontWeight:600, marginBottom:4 }}>Not reposted yet</p>
                <p style={{ fontSize:13, color:'var(--muted)' }}>Be the first to share this news!</p>
              </div>
            ) : (
              <>
                <div style={{ padding:'10px 16px', background:'rgba(52,168,83,.08)', borderBottom:'1px solid rgba(52,168,83,.15)' }}>
                  <p style={{ fontSize:13, color:'#34a853', fontWeight:600, margin:0 }}>
                    <i className="fas fa-retweet" style={{ marginRight:6 }}/>
                    {repostCount} {repostCount === 1 ? 'person' : 'people'} shared this news on Socialgati
                  </p>
                </div>
                {repostedUsers.map((u, i) => (
                  <div key={i} style={{ display:'flex', gap:12, padding:'12px 16px', alignItems:'center',
                    borderBottom:'1px solid var(--border2)', cursor:'pointer' }}
                    onClick={() => { onOpenProfile(u.uid); onClose() }}>
                    <img src={av(u.avatar)} style={{ width:42, height:42, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}
                      alt="" onError={e => e.target.src='https://ui-avatars.com/api/?name=U&background=e8f0fe&color=1a73e8'}/>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--ink)', margin:0 }}>@{u.username}</p>
                      <p style={{ fontSize:12, color:'var(--muted)', margin:0 }}>{timeAgo(u.timestamp)}</p>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color:'var(--border)', fontSize:12 }}/>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* \u2500\u2500 Comment input \u2500\u2500 */}
      {tab === 'comments' && (
        <div style={{ padding:'10px 16px', borderTop:'1px solid #f0f0f0', display:'flex', gap:10,
          alignItems:'center', flexShrink:0, background:'var(--surface)' }}>
          <img src={av(user?.photoURL)} style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}
            alt="" onError={e => e.target.src='https://ui-avatars.com/api/?name=U&background=e8f0fe&color=1a73e8'}/>
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
            placeholder={user ? 'Add a comment...' : 'Sign in to comment'}
            disabled={!user}
            style={{ flex:1, padding:'9px 14px', background:'var(--surface2)', border:'none', borderRadius:99,
              fontSize:14, outline:'none', fontFamily:'inherit' }}/>
          <button onClick={submit} disabled={!text.trim() || sending}
            style={{ color: text.trim() ? '#1a73e8' : '#c7c7c7', background:'none', border:'none',
              cursor: text.trim() ? 'pointer' : 'default', fontSize:18, padding:4, flexShrink:0 }}>
            {sending ? <i className="fas fa-spinner fa-spin" style={{ fontSize:15 }}/> : <i className="fas fa-paper-plane"/>}
          </button>
        </div>
      )}
    </div>
  )
}
