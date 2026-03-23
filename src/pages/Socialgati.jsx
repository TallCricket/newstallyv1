import Header from '../components/Header'
import BottomNav from '../components/BottomNav'

export default function Socialgati() {
  return (
    <>
      <Header title="Socialgati" />
      <div className="main-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 56px)' }}>
        <div style={{ textAlign: 'center', padding: 32, color: '#9aa0a6' }}>
          <i className="fas fa-bolt" style={{ fontSize: 48, color: '#9334e6', marginBottom: 16, display: 'block' }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: '#202124', marginBottom: 8 }}>Socialgati</p>
          <p style={{ fontSize: 14 }}>Community feed coming soon!</p>
        </div>
      </div>
      <BottomNav />
    </>
  )
}
