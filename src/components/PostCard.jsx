import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { timeAgo, showToast, sendNotification } from '../utils'
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore'
import { db, APP_ID } from '../firebase/config'
import RichText from './RichText'

// -- News Repost Embed Card -----------------------------------------
function RepostCard({ post, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--border)',
        cursor: 'pointer', marginTop: 10,
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform .15s, box-shadow .15s'
      }}
      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>

      {post.image && !imgErr ? (
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: 'var(--surface2)', overflow: 'hidden' }}>
          <img src={post.image} alt={post.headline} loading="lazy" onError={() => setImgErr(true)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top,rgba(0,0,0,.7),transparent)' }} />
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <span style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fas fa-newspaper" style={{ fontSize: 9 }} /> {post.newsSource || 'News'}
            </span>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px' }}>
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
              {post.headline}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px 14px', background: 'linear-gradient(135deg,var(--surface2),var(--surface))', minHeight: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <i className="fas fa-newspaper" style={{ fontSize: 12, color: '#1a73e8' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1a73e8' }}>{post.newsSource || 'NewsTally'}</span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.45, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {post.headline}
          </p>
        </div>
      )}

      <div style={{ padding: '10px 14px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {post.newsSource}
          </span>
          {post.newsCategory && (
            <span style={{ fontSize: 10, color: '#1a73e8', fontWeight: 700, background: 'rgba(26,115,232,.1)', padding: '2px 7px', borderRadius: 99, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.03em' }}>
              {post.newsCategory}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#1a73e8', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          Read <i className="fas fa-arrow-right" style={{ fontSize: 9 }} />
        </span>
      </div>

      {post.repostCount > 1 && (
        <div style={{ padding: '6px 14px 8px', borderTop: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex' }}>
            {(post.repostedUsers || []).slice(0, 3).map((u, i) => (
              <img key={i}
                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}&background=1a73e8&color=fff`}
                style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--surface)', marginLeft: i > 0 ? -6 : 0, objectFit: 'cover' }}
                alt="" onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff`} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
            {post.repostCount} people shared this
          </span>
        </div>
      )}
    </div>
  )
}

// -- Poll ----------------------------------------------------------
function PollContent({ post, id }) {
  const { user } = useAuth()
  const opts = post.pollOptions || []
  const total = opts.reduce((s, o) => s + (o.votes || 0), 0)
  const userVoted = opts.some(o => (o.voters || []).includes(user?.uid))

  const vote = async (i) => {
    if (!user || userVoted) return
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reposts', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const newOpts = [...snap.data().pollOptions]
    newOpts[i] = { ...newOpts[i], votes: (newOpts[i].votes || 0) + 1, voters: [...(newOpts[i].voters || []), user.uid] }
    await updateDoc(ref, { pollOptions: newOpts })
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, lineHeight: 1.5 }}>
        {post.headline || 'Vote below:'}
      </div>
      {opts.map((o, i) => {
        const pct = total ? Math.round((o.votes || 0) / total * 100) : 0
        const voted = (o.voters || []).includes(user?.uid)
        return (
          <div key={i} onClick={() => vote(i)}
            style={{ position: 'relative', border: `1.5px solid ${voted ? '#1a73e8' : 'var(--border)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, cursor: userVoted ? 'default' : 'pointer', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: userVoted ? `${pct}%` : '0%', background: 'rgba(26,115,232,.1)', transition: 'width .5s ease' }} />
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: voted ? 700 : 500, color: 'var(--ink)' }}>{o.text}</span>
              {userVoted && <span style={{ fontSize: 13, fontWeight: 700, color: '#1a73e8' }}>{pct}%</span>}
            </div>
          </div>
        )
      })}
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
        {total} vote{total !== 1 ? 's' : ''} {"\u00b7"} {userVoted ? 'Voted' : 'Tap to vote'}
      </div>
    </div>
  )
}

// -- Main PostCard -------------------------------------------------
export default function PostCard({ post, id, onOpenComments, onOpenProfile, onAuthRequired, onMention, onHashtag }) {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const isLiked = user && (post.likes || []).includes(user.uid)
  const av = post.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.username || 'U')}&background=1a73e8&color=fff`

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
        message: 'ne aapki post ko Gati diya \u2764\ufe0f',
        postId: id,
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
    <article
      style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 14px 10px', marginBottom: 8, border: '1px solid var(--border)', cursor: 'pointer' }}
      onClick={() => onOpenComments(id)}
      id={`post-${id}`}>

      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}
        onClick={e => e.stopPropagation()}>
        <img src={av}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}
          onClick={() => onOpenProfile(post.userId)}
          alt="" onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=1a73e8&color=fff`} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}
              onClick={() => post.username ? navigate(`/u/${post.username}`) : onOpenProfile(post.userId)}>
              {post.username || 'User'}
            </span>
            {post.type === 'repost' && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#34a853', background: 'rgba(52,168,83,.12)', padding: '1px 7px', borderRadius: 4 }}>{"\u21ba"} Repost</span>
            )}
            {post.type === 'poll' && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1a73e8', background: 'rgba(26,115,232,.1)', padding: '1px 7px', borderRadius: 4 }}>📊 Poll</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
            @{post.username || 'user'} {"\u00b7"} {timeAgo(post.timestamp?.toDate?.() || post.timestamp)}
          </div>
        </div>
      </div>

      {/* Content */}
      {post.type === 'poll' && <PollContent post={post} id={id} />}

      {post.type === 'repost' && (
        <RepostCard post={post} onClick={() => {
          if (post.newsId) navigate(`/news/${post.newsId}`)
          else if (post.newsUrl) window.open(post.newsUrl, '_blank', 'noopener')
        }} />
      )}

      {(post.type === 'text' || !post.type) && (
        <div onClick={e => e.stopPropagation()}>
          {post.headline && (
            <RichText text={post.headline} onMention={onMention} onHashtag={onHashtag} />
          )}
          {post.image && (
            <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', background: 'var(--surface2)' }}>
              <img src={post.image} alt="" loading="lazy"
                style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover' }}
                onError={e => e.target.parentElement.style.display = 'none'} />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border2)' }}
        onClick={e => e.stopPropagation()}>

        <button
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, fontSize: 13, color: isLiked ? '#e53935' : 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
          onMouseOut={e => e.currentTarget.style.background = 'none'}
          onClick={toggleLike}>
          <i className={isLiked ? 'fas fa-heart' : 'far fa-heart'} style={{ color: isLiked ? '#e53935' : undefined }} />
          <span>{(post.likes || []).length || 'Gati'}</span>
        </button>

        <button
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
          onMouseOut={e => e.currentTarget.style.background = 'none'}
          onClick={e => { e.stopPropagation(); onOpenComments(id) }}>
          <i className="far fa-comment" />
          <span>{post.commentsCount || 'Comment'}</span>
        </button>

        {post.type === 'repost' && post.repostCount > 0 && (
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, fontSize: 13, color: '#34a853', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            <i className="fas fa-retweet" />
            <span>{post.repostCount}</span>
          </button>
        )}

        <button
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
          onMouseOut={e => e.currentTarget.style.background = 'none'}
          onClick={sharePost}>
          <i className="fas fa-share-nodes" />
        </button>
      </div>
    </article>
  )
}
