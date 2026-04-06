import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

export default function RedditCommunity() {
  const navigate = useNavigate()

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'var(--bg)' }}>

      {/* Header */}
      <header style={{
        position:'sticky', top:0, zIndex:100,
        background:'var(--header-bg)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:12,
        padding:'0 16px', height:56, flexShrink:0
      }}>
        <button onClick={() => navigate('/')} style={{
          width:34, height:34, borderRadius:'50%',
          background:'var(--surface2)', border:'none',
          cursor:'pointer', display:'flex', alignItems:'center',
          justifyContent:'center', color:'var(--muted)', fontSize:15
        }}>
          <i className="fas fa-arrow-left"/>
        </button>

        {/* Reddit logo + title */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="#FF4500"/>
            <path d="M16.67 10a1.46 1.46 0 00-2.47-1 7.12 7.12 0 00-3.85-1.23l.65-3.07 2.13.45a1 1 0 101.07-1 1 1 0 00-.96.68l-2.38-.5a.18.18 0 00-.22.14l-.73 3.44a7.14 7.14 0 00-3.89 1.23 1.46 1.46 0 10-1.61 2.39 2.87 2.87 0 000 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 000-.44 1.46 1.46 0 00.51-1.53zM7.27 11a1 1 0 111 1 1 1 0 01-1-1zm5.58 2.71a3.58 3.58 0 01-2.85.66 3.58 3.58 0 01-2.85-.66.19.19 0 01.27-.27 3.21 3.21 0 002.58.47 3.21 3.21 0 002.58-.47.19.19 0 01.27.27zm-.13-1.71a1 1 0 111-1 1 1 0 01-1 1z" fill="#fff"/>
          </svg>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--ink)', lineHeight:1.1 }}>r/NewsTally</div>
            <div style={{ fontSize:10, color:'var(--muted)', fontWeight:500 }}>Reddit Community</div>
          </div>
        </div>

        {/* Open in Reddit button */}
        <a href="https://www.reddit.com/r/NewsTally/" target="_blank" rel="noopener noreferrer"
          style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'7px 14px', background:'#FF4500', color:'#fff',
            borderRadius:99, fontSize:12, fontWeight:700,
            textDecoration:'none', flexShrink:0
          }}>
          <i className="fas fa-arrow-up-right-from-square" style={{ fontSize:10 }}/>
          Open
        </a>
      </header>

      {/* Reddit iFrame */}
      <div style={{ flex:1, overflow:'hidden', paddingBottom:64 }}>
        <iframe
          src="https://www.redditmedia.com/r/NewsTally?ref_source=embed&ref=share&embed=true"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          style={{
            width:'100%', height:'100%',
            border:'none', display:'block',
            background:'var(--bg)'
          }}
          title="r/NewsTally Reddit Community"
          loading="lazy"
        />
      </div>

      <BottomNav/>
    </div>
  )
}
