import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { showToast } from '../utils'

// ─── Step indicator ───────────────────────────────────────────────
function Steps({ current, total }) {
  return (
    <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height:3, borderRadius:99, flex:1,
          background: i < current ? '#1a73e8' : '#e0e0e0',
          transition: 'background .3s'
        }}/>
      ))}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────
function Input({ label, type='text', value, onChange, placeholder, error, autoFocus }) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <div style={{ marginBottom: error ? 4 : 16 }}>
      {label && <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#606060', marginBottom:5 }}>{label}</label>}
      <div style={{ position:'relative' }}>
        <input
          type={isPass && show ? 'text' : type}
          value={value} onChange={onChange} placeholder={placeholder}
          autoFocus={autoFocus}
          style={{ width:'100%', padding: isPass ? '13px 44px 13px 14px' : '13px 14px',
            border: error ? '1.5px solid #e53935' : '1.5px solid #e0e0e0',
            borderRadius:12, fontSize:15, outline:'none', fontFamily:'inherit',
            background:'#fafafa', transition:'border .2s', color:'#202124' }}
          onFocus={e => e.target.style.borderColor = error ? '#e53935' : '#1a73e8'}
          onBlur={e => e.target.style.borderColor = error ? '#e53935' : '#e0e0e0'}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#9aa0a6', cursor:'pointer', padding:4 }}>
            <i className={show ? 'fas fa-eye-slash' : 'fas fa-eye'} style={{ fontSize:15 }}/>
          </button>
        )}
      </div>
      {error && <p style={{ color:'#e53935', fontSize:11, marginTop:4 }}>{error}</p>}
    </div>
  )
}

// ─── Checkbox ─────────────────────────────────────────────────────
function Check({ checked, onChange, children }) {
  return (
    <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', marginBottom:12 }}>
      <div onClick={() => onChange(!checked)}
        style={{ width:20, height:20, borderRadius:6, border: checked ? 'none' : '1.5px solid #ccc',
          background: checked ? '#1a73e8' : '#fff', flexShrink:0, marginTop:1,
          display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
        {checked && <i className="fas fa-check" style={{ color:'#fff', fontSize:10 }}/>}
      </div>
      <span style={{ fontSize:13, color:'#444', lineHeight:1.5 }}>{children}</span>
    </label>
  )
}

// ─── SIGN IN ──────────────────────────────────────────────────────
function SignIn({ onSwitch, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!email.includes('@')) e.email = 'Enter a valid email'
    if (password.length < 6) e.password = 'Password must be at least 6 characters'
    setErrors(e)
    return !Object.keys(e).length
  }

  const submit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      showToast('Welcome back! 👋')
      onClose()
    } catch(e) {
      const msgs = {
        'auth/wrong-password': 'Incorrect password',
        'auth/user-not-found': 'No account found with this email',
        'auth/invalid-credential': 'Incorrect email or password',
        'auth/too-many-requests': 'Too many attempts. Try again later'
      }
      showToast(msgs[e.code] || e.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding:'0 4px' }}>
      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" style={{ width:56, height:56, borderRadius:'50%', marginBottom:12 }} alt=""/>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#0f0f0f', marginBottom:4 }}>Welcome back</h2>
        <p style={{ fontSize:14, color:'#9aa0a6' }}>Sign in to Socialgati</p>
      </div>

      <Input label="Email address" type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p=>({...p,email:''})) }}
        placeholder="you@example.com" error={errors.email} autoFocus/>
      <Input label="Password" type="password" value={password} onChange={e => { setPassword(e.target.value); setErrors(p=>({...p,password:''})) }}
        placeholder="Your password" error={errors.password}/>

      <button onClick={submit} disabled={loading}
        style={{ width:'100%', padding:14, background: loading ? '#8bb8f4' : 'linear-gradient(135deg,#1a73e8,#1557b0)',
          color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: loading?'not-allowed':'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:4 }}>
        {loading ? <><i className="fas fa-spinner fa-spin"/> Signing in...</> : 'Sign In'}
      </button>

      <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#606060' }}>
        Don't have an account?{' '}
        <span style={{ color:'#1a73e8', fontWeight:700, cursor:'pointer' }} onClick={onSwitch}>Sign up</span>
      </p>
    </div>
  )
}

// ─── SIGN UP — 3 Steps ────────────────────────────────────────────
function SignUp({ onSwitch, onClose }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name:'', username:'', email:'', password:'', confirm:'' })
  const [checks, setChecks] = useState({ terms:false, privacy:false, age:false })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const setField = (k, v) => { setForm(p => ({...p, [k]:v})); setErrors(p => ({...p, [k]:''})) }
  const setCheck = (k, v) => { setChecks(p => ({...p, [k]:v})) }

  const validateStep1 = () => {
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Enter your full name (min 2 chars)'
    if (!/^[a-z0-9_.]{3,20}$/.test(form.username.toLowerCase())) e.username = 'Username: 3-20 chars, letters/numbers/._'
    setErrors(e)
    return !Object.keys(e).length
  }

  const validateStep2 = () => {
    const e = {}
    if (!form.email.includes('@') || !form.email.includes('.')) e.email = 'Enter a valid email address'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(form.password)) e.password = 'Include at least one uppercase letter'
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match'
    setErrors(e)
    return !Object.keys(e).length
  }

  const validateStep3 = () => {
    if (!checks.terms || !checks.privacy || !checks.age) {
      showToast('Please accept all required checkboxes')
      return false
    }
    return true
  }

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(s => s + 1)
  }

  const handleCreate = async () => {
    if (!validateStep3()) return
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)
      await updateProfile(user, { displayName: form.name.trim() })
      const username = form.username.trim().toLowerCase()
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: form.name.trim(),
        email: form.email.trim(),
        photoURL: '',
        username,
        bio: '',
        createdAt: serverTimestamp(),
        followersCount: 0,
        followingCount: 0,
        followers: [],
        following: [],
      })
      showToast('Account created! Welcome to Socialgati 🎉')
      onClose()
    } catch(e) {
      const msgs = {
        'auth/email-already-in-use': 'This email is already registered. Sign in instead.',
        'auth/weak-password': 'Choose a stronger password',
        'auth/invalid-email': 'Invalid email address',
      }
      showToast(msgs[e.code] || e.message)
      if (e.code === 'auth/email-already-in-use') setStep(2)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding:'0 4px' }}>
      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <img src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png" style={{ width:48, height:48, borderRadius:'50%', marginBottom:10 }} alt=""/>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#0f0f0f', marginBottom:2 }}>Create account</h2>
        <p style={{ fontSize:13, color:'#9aa0a6' }}>Join Socialgati today</p>
      </div>

      <Steps current={step} total={3}/>

      {/* ── STEP 1: Name + Username ── */}
      {step === 1 && (
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'#1a73e8', marginBottom:16, textAlign:'center' }}>Step 1 of 3 — Your identity</p>
          <Input label="Full name" value={form.name} onChange={e => setField('name', e.target.value)}
            placeholder="Rahul Sharma" error={errors.name} autoFocus/>
          <Input label="Username" value={form.username} onChange={e => setField('username', e.target.value.toLowerCase().replace(/\s/g,''))}
            placeholder="rahulsharma99" error={errors.username}/>
          {form.username && !errors.username && /^[a-z0-9_.]{3,20}$/.test(form.username) && (
            <p style={{ fontSize:12, color:'#34a853', marginTop:-10, marginBottom:16 }}>
              <i className="fas fa-check" style={{ marginRight:5 }}/>@{form.username} looks good!
            </p>
          )}
          <button onClick={handleNext}
            style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer' }}>
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2: Email + Password ── */}
      {step === 2 && (
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'#1a73e8', marginBottom:16, textAlign:'center' }}>Step 2 of 3 — Secure your account</p>
          <Input label="Email address" type="email" value={form.email} onChange={e => setField('email', e.target.value)}
            placeholder="you@example.com" error={errors.email} autoFocus/>
          <Input label="Password" type="password" value={form.password} onChange={e => setField('password', e.target.value)}
            placeholder="Min 8 chars, 1 uppercase" error={errors.password}/>
          {/* Password strength */}
          {form.password && (
            <div style={{ marginTop:-10, marginBottom:16 }}>
              {[
                { ok: form.password.length >= 8, label:'8+ characters' },
                { ok: /[A-Z]/.test(form.password), label:'Uppercase letter' },
                { ok: /[0-9]/.test(form.password), label:'Number' },
              ].map(r => (
                <span key={r.label} style={{ fontSize:11, marginRight:10, color: r.ok ? '#34a853' : '#9aa0a6', display:'inline-flex', alignItems:'center', gap:3 }}>
                  <i className={r.ok ? 'fas fa-check-circle' : 'fas fa-circle'} style={{ fontSize:10 }}/> {r.label}
                </span>
              ))}
            </div>
          )}
          <Input label="Confirm password" type="password" value={form.confirm} onChange={e => setField('confirm', e.target.value)}
            placeholder="Re-enter password" error={errors.confirm}/>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setStep(1)}
              style={{ flex:1, padding:14, background:'#f1f3f4', color:'#606060', border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer' }}>
              ← Back
            </button>
            <button onClick={handleNext}
              style={{ flex:2, padding:14, background:'linear-gradient(135deg,#1a73e8,#1557b0)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer' }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Agreements ── */}
      {step === 3 && (
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'#1a73e8', marginBottom:16, textAlign:'center' }}>Step 3 of 3 — Almost done!</p>

          <div style={{ background:'#f0f7ff', border:'1px solid #c5d9f8', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
            <Check checked={checks.terms} onChange={v => setCheck('terms', v)}>
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener" style={{ color:'#1a73e8', fontWeight:700 }}>Terms of Service</a>
              {' '}of Socialgati
            </Check>
            <Check checked={checks.privacy} onChange={v => setCheck('privacy', v)}>
              I agree to the{' '}
              <a href="/privacy" target="_blank" rel="noopener" style={{ color:'#1a73e8', fontWeight:700 }}>Privacy Policy</a>
              {' '}and consent to data processing
            </Check>
            <Check checked={checks.age} onChange={v => setCheck('age', v)}>
              I confirm I am <strong>12 years or older</strong>. Socialgati is not intended for children under 12.
            </Check>
          </div>

          {/* Summary */}
          <div style={{ background:'#f8f9fa', borderRadius:10, padding:'12px 14px', marginBottom:20, fontSize:13, color:'#606060', lineHeight:1.7 }}>
            <p><strong>Creating account for:</strong></p>
            <p>👤 {form.name} <span style={{ color:'#9aa0a6' }}>@{form.username}</span></p>
            <p>📧 {form.email}</p>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setStep(2)}
              style={{ flex:1, padding:14, background:'#f1f3f4', color:'#606060', border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer' }}>
              ← Back
            </button>
            <button onClick={handleCreate} disabled={loading || !checks.terms || !checks.privacy || !checks.age}
              style={{ flex:2, padding:14,
                background: (checks.terms && checks.privacy && checks.age && !loading)
                  ? 'linear-gradient(135deg,#1a73e8,#1557b0)' : '#8bb8f4',
                color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700,
                cursor: (checks.terms && checks.privacy && checks.age && !loading) ? 'pointer' : 'not-allowed',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {loading ? <><i className="fas fa-spinner fa-spin"/> Creating...</> : '🎉 Create Account'}
            </button>
          </div>
        </div>
      )}

      <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#606060' }}>
        Already have an account?{' '}
        <span style={{ color:'#1a73e8', fontWeight:700, cursor:'pointer' }} onClick={onSwitch}>Sign in</span>
      </p>
    </div>
  )
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────
export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin')

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:999, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:520,
        maxHeight:'94dvh', overflowY:'auto', padding:'20px 20px 36px',
        boxShadow:'0 -8px 40px rgba(0,0,0,.18)' }}>
        {/* Handle bar */}
        <div style={{ width:40, height:4, borderRadius:99, background:'#e0e0e0', margin:'0 auto 20px' }}/>
        {/* Close */}
        <button onClick={onClose} style={{ position:'absolute', top:20, right:20, width:32, height:32, borderRadius:'50%', background:'#f1f3f4', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#606060' }}>
          <i className="fas fa-times" style={{ fontSize:14 }}/>
        </button>

        {mode === 'signin'
          ? <SignIn onSwitch={() => setMode('signup')} onClose={onClose}/>
          : <SignUp onSwitch={() => setMode('signin')} onClose={onClose}/>
        }
      </div>
    </div>
  )
}
