import { useNavigate } from 'react-router-dom'

export default function RichText({ text, onMention, onHashtag, style = {} }) {
  const navigate = useNavigate()
  if (!text) return null

  // Parse text into segments: plain | @mention | #hashtag
  const parts = []
  const regex = /(@\w+|#\w+)/g
  let last = 0, match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', val: text.slice(last, match.index) })
    parts.push({ type: match[0][0] === '@' ? 'mention' : 'hashtag', val: match[0] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ type: 'text', val: text.slice(last) })

  return (
    <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap', margin: 0, ...style }}>
      {parts.map((p, i) => {
        if (p.type === 'mention') {
          return (
            <span key={i}
              onClick={e => { e.stopPropagation(); onMention && onMention(p.val.slice(1)) }}
              style={{ color: '#9334e6', fontWeight: 700, cursor: 'pointer' }}>
              {p.val}
            </span>
          )
        }
        if (p.type === 'hashtag') {
          const tag = p.val.slice(1).toLowerCase()
          return (
            <span key={i}
              onClick={e => {
                e.stopPropagation()
                if (onHashtag) onHashtag(tag)
                else navigate(`/hashtag/${tag}`)
              }}
              style={{ color: '#1a73e8', fontWeight: 600, cursor: 'pointer' }}>
              {p.val}
            </span>
          )
        }
        return <span key={i}>{p.val}</span>
      })}
    </p>
  )
}
