import Header from '../components/Header'
import BottomNav from '../components/BottomNav'

export default function Shorts() {
  return (
    <>
      <Header title="Shorts" />
      <div className="main-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 56px)' }}>
        <div style={{ textAlign: 'center', padding: 32, color: '#9aa0a6' }}>
          <i className="fas fa-circle-play" style={{ fontSize: 48, color: '#e53935', marginBottom: 16, display: 'block' }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: '#202124', marginBottom: 8 }}>NewsTally Shorts</p>
          <p style={{ fontSize: 14 }}>Shorts coming soon!</p>
        </div>
      </div>
      <BottomNav />
    </>
  )
}
