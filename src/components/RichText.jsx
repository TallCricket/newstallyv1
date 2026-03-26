// RichText.jsx — Renders post text with clickable @mentions and #hashtags
export default function RichText({ text, onMention, onHashtag, style = {} }) {
  if (!text) return null

  // Parse text into segments: plain | mention | hashtag
  const parts = []
  const regex = /(@\w+|#\w+)/g
  let last = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', val: text.slice(last, match.index) })
    const val = match[0]
    if (val.startsWith('@')) parts.push({ type: 'mention', val })
    else parts.push({ type: 'hashtag', val })
    last = match.index + val.length
  }
  if (last < text.length) parts.push({ type: 'text', val: text.slice(last) })

  return (
    <p style={{ fontSize: 15, color: '#202124', lineHeight: 1.55, wordBreak: 'break-word',
      whiteSpace: 'pre-wrap', margin: 0, ...style }}>
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
          return (
            <span key={i}
              onClick={e => { e.stopPropagation(); onHashtag && onHashtag(p.val.slice(1)) }}
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
