import { useAuth } from '../context/AuthContext'
import { timeAgo, processText, showToast, sendNotification } from '../utils'
import { doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'

export default function PostCard({ post, id, onOpenComments, onOpenProfile, onAuthRequired }) {
  const { user, userData } = useAuth()
  const isLiked = user && (post.likes || []).includes(user.uid)
  const av = post.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.username||'U')}&background=4285f4&color=fff`

  const toggleLike = async (e) => {
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

  const sharePost = (e) => {
    e.stopPropagation()
    const url = `${window.location.origin}/?post=${id}`
    if (navigator.share) navigator.share({ title: `Post by @${post.username}`, url })
    else { navigator.clipboard?.writeText(url); showToast('Link copied!') }
  }

  return (
    <article className="sg-post fade-up" onClick={() => onOpenComments(id)} id={`post-${id}`}>
      {/* Header */}
      <div className="sg-post-head" onClick={e=>e.stopPropagation()}>
        <img src={av} className="sg-post-av" alt="" onClick={() => onOpenProfile(post.userId)}
          onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=U&background=4285f4&color=fff`}}/>
        <div className="sg-post-meta" style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:2 }}>
            <span className="sg-post-username" onClick={()=>onOpenProfile(post.userId)}>{post.username||'User'}</span>
            {post.type === 'repost' && <span className="sg-type-badge sg-type-repost">↺ Repost</span>}
            {post.type === 'poll' && <span className="sg-type-badge sg-type-poll">📊 Poll</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span className="sg-post-handle">@{post.username||'user'}</span>
            <span className="sg-post-dot" style={{ color:'#ccc' }}>·</span>
            <span className="sg-post-time">{timeAgo(post.timestamp?.toDate?.() || post.timestamp)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <PostContent post={post} id={id} onOpenComments={onOpenComments} />

      {/* Actions */}
      <div className="sg-post-actions" onClick={e=>e.stopPropagation()}>
        <button className={`sg-action ${isLiked?'liked':''}`} onClick={toggleLike}>
          <i className={isLiked?'fas fa-heart':'far fa-heart'}/>
          <span>{(post.likes||[]).length ? (post.likes.length)+' Gati' : 'Gati'}</span>
        </button>
        <button className="sg-action" onClick={e=>{e.stopPropagation();onOpenComments(id)}}>
          <i className="far fa-comment"/>
          <span>{post.commentsCount ? post.commentsCount+' Comment' : 'Comment'}</span>
        </button>
        <button className="sg-action" onClick={sharePost}>
          <i className="fas fa-share-nodes"/>
        </button>
      </div>
    </article>
  )
}

function PostContent({ post, id, onOpenComments }) {
  if (post.type === 'poll') return <PollContent post={post} id={id}/>
  if (post.type === 'repost') return (
    <div>
      <div style={{ fontSize:13, color:'#9aa0a6', marginBottom:8 }}>
        <i className="fas fa-retweet" style={{ color:'#34a853', marginRight:4 }}/>
        Reposted from <strong>{post.newsSource||'NewsTally'}</strong>
      </div>
      <div className="sg-repost-embed" onClick={e=>{e.stopPropagation();post.newsUrl&&window.open(post.newsUrl,'_blank')}}>
        {post.image && <img src={post.image} alt="" style={{ width:'100%', height:140, objectFit:'cover' }}/>}
        <div className="sg-repost-embed-body">
          <div className="sg-repost-source">📰 {post.newsSource||'News'}</div>
          <div className="sg-repost-title">{post.headline||''}</div>
        </div>
      </div>
    </div>
  )
  return (
    <div>
      {post.headline && (
        <p className="sg-post-text" dangerouslySetInnerHTML={{ __html: processText(post.headline) }}/>
      )}
      {post.image && (
        <div className="sg-post-image">
          <img src={post.image} alt="" loading="lazy" onError={e=>e.target.parentElement.style.display='none'}/>
        </div>
      )}
    </div>
  )
}

function PollContent({ post, id }) {
  const { user } = useAuth()
  const opts = post.pollOptions || []
  const total = opts.reduce((s, o) => s + (o.votes||0), 0)
  const userVoted = opts.some(o => (o.voters||[]).includes(user?.uid))

  const vote = async (i) => {
    if (!user || userVoted) return
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const newOpts = [...snap.data().pollOptions]
    newOpts[i] = { ...newOpts[i], votes: (newOpts[i].votes||0)+1, voters: [...(newOpts[i].voters||[]), user.uid] }
    await updateDoc(ref, { pollOptions: newOpts })
  }

  return (
    <div className="sg-poll">
      <div className="sg-poll-question">{post.headline||'Vote below:'}</div>
      {opts.map((o, i) => {
        const pct = total ? Math.round((o.votes||0)/total*100) : 0
        const voted = (o.voters||[]).includes(user?.uid)
        return (
          <div key={i} className={`sg-poll-option ${voted?'voted':''}`} onClick={()=>vote(i)} style={{ position:'relative' }}>
            <div className="sg-poll-fill" style={{ width: userVoted?`${pct}%`:'0%' }}/>
            <span className="sg-poll-label">{o.text}</span>
            {userVoted && <span className="sg-poll-pct">{pct}%</span>}
          </div>
        )
      })}
      <div className="sg-poll-total">{total} vote{total!==1?'s':''} · {userVoted?'Voted':'Tap to vote'}</div>
    </div>
  )
}
