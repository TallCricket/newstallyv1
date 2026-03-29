import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

const app = initializeApp({
  apiKey: 'AIzaSyA4zw5cZqxLwzkTy2e5NiHz-tGKqk1KGdI',
  authDomain: 'newstally-df03c.firebaseapp.com',
  projectId: 'newstally-df03c',
  storageBucket: 'newstally-df03c.appspot.com',
  messagingSenderId: '506893212961',
  appId: '1:506893212961:web:63882290195da992207260'
})

// {"\u2705"} App Check {"\u2014"} reCAPTCHA v3 (required for Firestore data fetch)
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LdTUJQsAAAAADKO-4cTLCOqlV7jH02fg3srsoFD'),
  isTokenAutoRefreshEnabled: true
})

export const db      = getFirestore(app)
export const auth    = getAuth(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()
export const APP_ID  = 'newstally-social'
