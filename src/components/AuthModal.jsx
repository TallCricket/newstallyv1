import { useState } from 'react'
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase/config'
import { showToast } from '../utils'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogle = async () => {
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      onClose()
    } catch(e) { showToast(e.message) }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!email || !password) return showToast('Fill all fields')
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        if (!name) return showToast('Enter your name')
        const { user } = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(user, { displayName: name })
        const username = name.toLowerCase().replace(/\s+/g,'').substring(0,15) + Math.floor(Math.random()*999)
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid, displayName: name, email,
          photoURL: '', username,
          createdAt: serverTimestamp(),
          followersCount: 0, followingCount: 0,
        })
      }
      showToast(mode === 'signin' ? 'Welcome back! 👋' : 'Account created! 🎉')
      onClose()
    } catch(e) {
      const msgs = { 'auth/wrong-password': 'Wrong password', 'auth/user-not-found': 'Account not found', 'auth/email-already-in-use': 'Email already registered', 'auth/weak-password': 'Password too weak (min 6 chars)' }
      showToast(msgs[e.code] || e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
          <button className="icon-btn" onClick={onClose}><i className="fas fa-times"/></button>
        </div>

        {/* Google */}
        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={20} alt="" />
          Continue with Google
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'12px 0', color:'#9aa0a6', fontSize:13 }}>
          <div style={{ flex:1, height:1, background:'#e0e0e0' }}/> or <div style={{ flex:1, height:1, background:'#e0e0e0' }}/>
        </div>

        {mode === 'signup' && (
          <input className="auth-input" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} style={{ marginBottom:10 }}/>
        )}
        <input className="auth-input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{ marginBottom:10 }}/>
        <input className="auth-input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={{ marginBottom:16 }} onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? <i className="fas fa-spinner fa-spin"/> : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>

        <p style={{ textAlign:'center', marginTop:14, fontSize:13, color:'#606060' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <span style={{ color:'#1a73e8', fontWeight:700, cursor:'pointer' }} onClick={() => setMode(mode==='signin'?'signup':'signin')}>
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  )
}
