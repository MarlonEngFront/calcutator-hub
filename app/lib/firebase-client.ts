import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

// Config publica do projeto voiston-hub (mesma usada pelo Firebase Analytics em app/lib/analytics.ts).
const firebaseConfig = {
  apiKey: 'AIzaSyB3qd8BEK2ADv9nAYBdHjawUPtIUiBRA3k',
  authDomain: 'voiston-hub.firebaseapp.com',
  projectId: 'voiston-hub',
  storageBucket: 'voiston-hub.firebasestorage.app',
  messagingSenderId: '600416473513',
  appId: '1:600416473513:web:88bbbfc7604efb3ea134b8',
  measurementId: 'G-1XY194ST2V',
}

let app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return app
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp())
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp())
}

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ hd: 'voiston.com' })

export const ALLOWED_DOMAIN = 'voiston.com'
