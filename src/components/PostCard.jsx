import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { timeAgo, processText, showToast, sendNotification } from '../utils'
import { doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'

// ── Repost card — high quality full image ──────────────────────────
function RepostCard({ post, onClick }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <div onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        borderRadius: 14, overflow: 'hidden', border: '1px solid #e8eaed',
        cursor: 'pointer', marginTop: 10, background: '#fff',
        boxShadow: '0 2px 10px rgba(0,0,0,.08)', transition: 'transform .15s, box-shadow .15s'
      }}
      onMouseOver={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.12)' }}
      onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,.08)' }}>

      {/* Full image — 16:9, fully visible, no crop cut */}
      {post.image && !imgErr ? (
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#f1f3f4', overflow: 'hidden' }}>
          <img
            src={post.image} alt={post.headline}
            loading="lazy"
            onError={() => setImgErr(true)}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              objectFit: 'cover', display: 'block'
            }}
          />
          {/* Gradient bottom overlay */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%',
            background:'linear-gradient(to top,rgba(0,0,0,.55) 0%,transparent 100%)' }}/>
          {/* Source badge on image */}
          <div style={{ position:'absolute', top:10, left:10 }}>
            <span style={{ background:'rgba(0,0,0,.6)', backdropFilter:'blur(6px)',
              color:'#fff', fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99,
              display:'flex', alignItems:'center', gap:5 }}>
              <i className="fas fa-newspaper" style={{ fontSize:9 }}/>
              {post.newsSource || 'News'}
            </span>
          </div>
          {/* Title on image */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 14px' }}>
            <p style={{ color:'#fff', fontSize:14, fontWeight:700, lineHeight:1.4, margin:0,
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
              textShadow:'0 1px 4px rgba(0,0,0,.5)' }}>
              {post.headline}
            </p>
          </div>
        </div>
      ) : (
        // No image fallback — gradient card
        <div style={{ padding:'16px 14px', background:'linear-gradient(135deg,#e8f0fe,#f0f7ff)', minHeight:90 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
            <i className="fas fa-newspaper" style={{ fontSize:12, color:'#1a73e8' }}/>
            <span style={{ fontSize:11, fontWeight:700, color:'#1a73e8' }}>{post.newsSource || 'NewsTally'}</span>
          </div>
          <p style={{ fontSize:14, fontWeight:700, color:'#202124', lineHeight:1.45, margin:0,
            display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {post.headline}
          </p>
        </div>
      )}

      {/* Card footer */}
      <div style={{ padding:'10px 14px', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
          <span style={{ fontSize:11, fontWeight:600, color:'#5f6368', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {post.newsSource}
          </span>
          {post.newsCategory && (
            <span style={{ fontSize:10, color:'#1a73e8', fontWeight:700, background:'#e8f0fe',
              padding:'2px 7px', borderRadius:99, flexShrink:0, textTransform:'uppercase', letterSpacing:'.03em' }}>
              {post.newsCategory}
            </span>
          )}
        </div>
        <span style={{ fontSize:11, color:'#1a73e8', fontWeight:700, flexShrink:0, display:'flex', alignItems:'center', gap:4 }}>
          Read <i className="fas fa-arrow-right" style={{ fontSize:9 }}/>
        </span>
      </div>

      {/* Repost count bar */}
      {post.repostCount > 1 && (
        <div style={{ padding:'6px 14px 8px', borderTop:'1px solid #f1f3f4', display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ display:'flex' }}>
            {(post.repostedUsers || []).slice(0, 3).map((u, i) => (
              <img key={i} src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username||'U')}&background=1a73e8&color=fff`}
                style={{ width:18, height:18, borderRadius:'50%', border:'2px solid #fff', marginLeft: i>0 ? -6 : 0, objectFit:'cover' }} alt=""
                onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff`}/>
            ))}
          </div>
          <span style={{ fontSize:11, color:'#5f6368', fontWeight:600 }}>
            {post.repostCount} {post.repostCount === 1 ? 'person' : 'people'} shared this
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main PostCard ──────────────────────────────────────────────────
export default function PostCard({ post, id, onOpenComments, onOpenProfile, onAuthRequired }) {
  const { user, userData } = useAuth()
  const isLiked = user && (post.likes || []).includes(user.uid)
  const av = post.userAvatar
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.username||'U')}&background=1a73e8&color=fff`

  const toggleLike = async e => {
    e.stopPropagation()
    if (!user) return onAuthRequired()
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', id)
    await updateDoc(ref, { likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) })
    if (!isLiked && post.userId && post.userId !== user.uid) {
      sendNotification(post.userId, {
        type: 'like', fromUid: user.uid,
        fromName: userData?.displayName || user.displayName || 'Someone',
        fromAvatar: user.photoURL || '',
        message: 'ne aapki post ko Gati diya ❤️', postId: id,
        postSnippet: (post.headline || '').substring(0, 60)
      })
    }
  }

  const sharePost = e => {
    e.stopPropagation()
    const url = `${window.location.origin}/?post=${id}`
    if (navigator.share) navigator.share({ title: `Post by @${post.username}`, url })
    else { navigator.clipboard?.writeText(url); showToast('Link copied!') }
  }

  return (
    <article style={{ background:'#fff', borderRadius:12, padding:'14px 14px 10px',
      marginBottom:8, border:'1px solid #f0f0f0', cursor:'pointer' }}
      onClick={() => onOpenComments(id)} id={`post-${id}`}>

      {/* Header */}
      <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }} onClick={e => e.stopPropagation()}>
        <img src={av} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', flexShrink:0, cursor:'pointer' }}
          onClick={() => onOpenProfile(post.userId)} alt=""
          onError={e => e.target.src=`https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff`}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:14, fontWeight:700, color:'#202124', cursor:'pointer' }}
              onClick={() => onOpenProfile(post.userId)}>{post.username || 'User'}</span>
            {post.type === 'repost' && (
              <span style={{ fontSize:10, fontWeight:700, color:'#34a853', background:'#e6f4ea', padding:'1px 7px', borderRadius:4 }}>
                ↺ Repost
              </span>
            )}
            {post.type === 'poll' && (
              <span style={{ fontSize:10, fontWeight:700, color:'#1a73e8', background:'#e8f0fe', padding:'1px 7px', borderRadius:4 }}>
                📊 Poll
              </span>
            )}
          </div>
          <div style={{ fontSize:12, color:'#9aa0a6', marginTop:1 }}>
            @{post.username || 'user'} · {timeAgo(post.timestamp?.toDate?.() || post.timestamp)}
          </div>
        </div>
      </div>

      {/* Content */}
      <PostContent post={post} id={id}
        onOpenNews={() => post.newsUrl && window.open(post.newsUrl, '_blank', 'noopener')}/>

      {/* Actions */}
      <div style={{ display:'flex', alignItems:'center', gap:2, marginTop:10, paddingTop:8, borderTop:'1px solid #f5f5f5' }}
        onClick={e => e.stopPropagation()}>
        <button style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, fontSize:13,
          color: isLiked ? '#e53935' : '#5f6368', background:'none', border:'none', cursor:'pointer', fontWeight:500, transition:'all .15s' }}
          onMouseOver={e => e.currentTarget.style.background='#f8f9fa'}
          onMouseOut={e => e.currentTarget.style.background='none'}
          onClick={toggleLike}>
          <i className={isLiked ? 'fas fa-heart' : 'far fa-heart'} style={{ color: isLiked ? '#e53935' : undefined }}/>
          <span>{(post.likes||[]).length || 'Gati'}</span>
        </button>
        <button style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, fontSize:13,
          color:'#5f6368', background:'none', border:'none', cursor:'pointer', fontWeight:500, transition:'all .15s' }}
          onMouseOver={e => e.currentTarget.style.background='#f8f9fa'}
          onMouseOut={e => e.currentTarget.style.background='none'}
          onClick={e => { e.stopPropagation(); onOpenComments(id) }}>
          <i className="far fa-comment"/>
          <span>{post.commentsCount || 'Comment'}</span>
        </button>
        {post.type === 'repost' && post.repostCount > 0 && (
          <button style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, fontSize:13,
            color:'#34a853', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}
            onClick={e => { e.stopPropagation(); onOpenComments(id) }}>
            <i className="fas fa-retweet"/>
            <span>{post.repostCount}</span>
          </button>
        )}
        <button style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, fontSize:13,
          color:'#5f6368', background:'none', border:'none', cursor:'pointer', marginLeft:'auto', transition:'all .15s' }}
          onMouseOver={e => e.currentTarget.style.background='#f8f9fa'}
          onMouseOut={e => e.currentTarget.style.background='none'}
          onClick={sharePost}>
          <i className="fas fa-share-nodes"/>
        </button>
      </div>
    </article>
  )
}

// ── Content switcher ───────────────────────────────────────────────
function PostContent({ post, id, onOpenNews }) {
  if (post.type === 'poll') return <PollContent post={post} id={id}/>
  if (post.type === 'repost') return <RepostCard post={post} onClick={onOpenNews}/>
  return (
    <div>
      {post.headline && (
        <p style={{ fontSize:15, color:'#202124', lineHeight:1.55, wordBreak:'break-word', whiteSpace:'pre-wrap', margin:0 }}
          dangerouslySetInnerHTML={{ __html: processText(post.headline) }}/>
      )}
      {post.image && (
        <div style={{ marginTop:10, borderRadius:12, overflow:'hidden', background:'#f1f3f4' }}>
          <img src={post.image} alt="" loading="lazy"
            style={{ width:'100%', display:'block', maxHeight:400, objectFit:'cover' }}
            onError={e => e.target.parentElement.style.display='none'}/>
        </div>
      )}
    </div>
  )
}

// ── Poll ───────────────────────────────────────────────────────────
function PollContent({ post, id }) {
  const { user } = useAuth()
  const opts = post.pollOptions || []
  const total = opts.reduce((s, o) => s + (o.votes||0), 0)
  const userVoted = opts.some(o => (o.voters||[]).includes(user?.uid))

  const vote = async i => {
    if (!user || userVoted) return
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const newOpts = [...snap.data().pollOptions]
    newOpts[i] = { ...newOpts[i], votes: (newOpts[i].votes||0)+1, voters: [...(newOpts[i].voters||[]), user.uid] }
    await updateDoc(ref, { pollOptions: newOpts })
  }

  return (
    <div>
      <div style={{ fontSize:15, fontWeight:700, color:'#202124', marginBottom:12, lineHeight:1.5 }}>
        {post.headline || 'Vote below:'}
      </div>
      {opts.map((o, i) => {
        const pct = total ? Math.round((o.votes||0)/total*100) : 0
        const voted = (o.voters||[]).includes(user?.uid)
        return (
          <div key={i} onClick={() => vote(i)}
            style={{ position:'relative', border: voted ? '1.5px solid #1a73e8' : '1.5px solid #e0e0e0',
              borderRadius:10, padding:'10px 14px', marginBottom:8, cursor: userVoted ? 'default' : 'pointer', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width: userVoted ? `${pct}%` : '0%',
              background:'rgba(26,115,232,.1)', transition:'width .5s ease' }}/>
            <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight: voted ? 700 : 500, color:'#202124' }}>{o.text}</span>
              {userVoted && <span style={{ fontSize:13, fontWeight:700, color:'#1a73e8' }}>{pct}%</span>}
            </div>
          </div>
        )
      })}
      <div style={{ fontSize:12, color:'#9aa0a6', marginTop:4 }}>
        {total} vote{total!==1?'s':''} · {userVoted ? 'Voted' : 'Tap to vote'}
      </div>
    </div>
  )
}
