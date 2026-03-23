import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA4zw5cZqxLwzkTy2e5NiHz-tGKqk1KGdI",
  authDomain: "newstally-df03c.firebaseapp.com",
  projectId: "newstally-df03c",
  storageBucket: "newstally-df03c.appspot.com",
  messagingSenderId: "506893212961",
  appId: "1:506893212961:web:63882290195da992207260"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
