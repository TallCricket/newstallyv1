import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

function StaticLayout({ title, children }) {
  const navigate = useNavigate()
  return (
    <>
      <header className="header">
        <div className="logo" onClick={()=>navigate('/')}>
          <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" alt="Socialgati"/>
          <span className="logo-text">NewsTally</span>
        </div>
      </header>
      <div className="main-wrapper" style={{ padding:'20px 16px 80px' }}>
        <h1 style={{ fontSize:24, fontWeight:700, color:'#202124', marginBottom:20 }}>{title}</h1>
        {children}
      </div>
      <BottomNav/>
    </>
  )
}

const prose = { fontSize:15, lineHeight:1.8, color:'#444', marginBottom:16 }
const h2 = { fontSize:18, fontWeight:700, color:'#202124', marginBottom:10, marginTop:24 }

export function About() {
  return (
    <StaticLayout title="About NewsTally">
      <p style={prose}>NewsTally is India's fastest growing news and community platform. We bring you the latest breaking news alongside a vibrant community \u2014 Socialgati \u2014 where you can share opinions, give Gati to posts, repost headlines, and connect with millions of Indians.</p>
      <h2 style={h2}>Our Mission</h2>
      <p style={prose}>To make news accessible, engaging, and community-driven for every Indian. We believe news is better when it's discussed, shared, and given context by real people.</p>
      <h2 style={h2}>Contact Us</h2>
      <p style={prose}>\u1f4e7 newstallyofficial@gmail.com</p>
      <p style={prose}>\u1f310 newstally.online | socialgati.online</p>
      <div style={{ display:'flex', gap:16, marginTop:20 }}>
        {[['fab fa-instagram','https://instagram.com/newstallyofficial'],['fab fa-youtube','https://youtube.com/@newstallyofficial'],['fab fa-x-twitter','https://twitter.com/newstallyofficial']].map(([icon,url])=>(
          <a key={url} href={url} target="_blank" rel="noopener" style={{ width:44, height:44, background:'#f1f3f4', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#202124' }}>
            <i className={icon}/>
          </a>
        ))}
      </div>
    </StaticLayout>
  )
}

export function Privacy() {
  return (
    <StaticLayout title="Privacy Policy">
      <p style={{ ...prose, color:'#9aa0a6', fontSize:13 }}>Last updated: March 2025</p>
      <p style={prose}>NewsTally ("we", "our", "us") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.</p>
      <h2 style={h2}>Data We Collect</h2>
      <p style={prose}>\u2022 Account info (name, email, profile photo) when you sign up via Google or email.<br/>\u2022 Posts, comments, and interactions you make on Socialgati.<br/>\u2022 Basic usage analytics to improve the app.</p>
      <h2 style={h2}>How We Use It</h2>
      <p style={prose}>\u2022 To provide and improve NewsTally services.<br/>\u2022 To show you relevant notifications.<br/>\u2022 We never sell your data to third parties.</p>
      <h2 style={h2}>Your Rights</h2>
      <p style={prose}>You can request deletion of your account and data by emailing newstallyofficial@gmail.com.</p>
      <h2 style={h2}>Contact</h2>
      <p style={prose}>newstallyofficial@gmail.com</p>
    </StaticLayout>
  )
}

export function Terms() {
  return (
    <StaticLayout title="Terms of Service">
      <p style={{ ...prose, color:'#9aa0a6', fontSize:13 }}>Last updated: March 2025</p>
      <p style={prose}>By using NewsTally, you agree to these terms. Please read them carefully.</p>
      <h2 style={h2}>Acceptable Use</h2>
      <p style={prose}>\u2022 Do not post illegal, abusive, or spam content.<br/>\u2022 Do not impersonate others.<br/>\u2022 Respect other community members.</p>
      <h2 style={h2}>Content</h2>
      <p style={prose}>News content is sourced from DD News (Public Broadcaster) and is provided for informational purposes. Community posts are the responsibility of their authors.</p>
      <h2 style={h2}>Termination</h2>
      <p style={prose}>We reserve the right to suspend accounts that violate these terms.</p>
      <h2 style={h2}>Contact</h2>
      <p style={prose}>newstallyofficial@gmail.com</p>
    </StaticLayout>
  )
}

export function Contact() {
  return (
    <StaticLayout title="Contact Us">
      <p style={prose}>We'd love to hear from you! Reach out through any of the channels below.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:8 }}>
        {[
          { icon:'fas fa-envelope', label:'Email', value:'newstallyofficial@gmail.com', href:'mailto:newstallyofficial@gmail.com' },
          { icon:'fab fa-instagram', label:'Instagram', value:'@newstallyofficial', href:'https://instagram.com/newstallyofficial' },
          { icon:'fab fa-youtube', label:'YouTube', value:'@newstallyofficial', href:'https://youtube.com/@newstallyofficial' },
        ].map(c => (
          <a key={c.label} href={c.href} target="_blank" rel="noopener"
            style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'#f8f9fa', borderRadius:12, color:'#202124', textDecoration:'none' }}>
            <div style={{ width:44, height:44, background:'#1a73e8', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:18, flexShrink:0 }}>
              <i className={c.icon}/>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>{c.label}</div>
              <div style={{ fontSize:13, color:'#606060' }}>{c.value}</div>
            </div>
            <i className="fas fa-arrow-right" style={{ marginLeft:'auto', color:'#c0c0c0' }}/>
          </a>
        ))}
      </div>
    </StaticLayout>
  )
}

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100dvh', padding:20, textAlign:'center' }}>
      <div style={{ fontSize:80, marginBottom:16 }}>404</div>
      <h1 style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>Page not found</h1>
      <p style={{ color:'#606060', marginBottom:24 }}>The page you're looking for doesn't exist.</p>
      <button onClick={()=>navigate('/')} style={{ padding:'12px 28px', background:'#1a73e8', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:15, cursor:'pointer' }}>
        Go Home
      </button>
    </div>
  )
}
