import { useNavigate } from 'react-router-dom'

// RichText — renders @mentions and #hashtags as clickable links
export default function RichText({ text, onMention, onHashtag, style = {} }) {
  const navigate = useNavigate()
  if (!text) return null

  const parts = []
  const regex = /(@\w+|#\w+)/g
  let last = 0, match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type:'text', val: text.slice(last, match.index) })
    const val = match[0]
    parts.push({ type: val[0] === '@' ? 'mention' : 'hashtag', val })
    last = match.index + val.length
  }
  if (last < text.length) parts.push({ type:'text', val: text.slice(last) })

  return (
    <p style={{ fontSize:15, color:'var(--ink)', lineHeight:1.55, wordBreak:'break-word',
      whiteSpace:'pre-wrap', margin:0, ...style }}>
      {parts.map((p, i) => {
        if (p.type === 'mention') {
          return (
            <span key={i}
              onClick={e => { e.stopPropagation(); onMention && onMention(p.val.slice(1)) }}
              style={{ color:'#9334e6', fontWeight:700, cursor:'pointer' }}>
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
              style={{ color:'var(--blue)', fontWeight:600, cursor:'pointer' }}>
              {p.val}
            </span>
          )
        }
        return <span key={i}>{p.val}</span>
      })}
    </p>
  )
}
