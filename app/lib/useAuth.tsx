'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, type User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getFirebaseAuth, getDb, googleProvider } from './firebase-client'

export interface UserProfile {
  email: string | null
  displayName: string | null
  photoURL: string | null
  role: 'admin' | 'member'
  approved: boolean
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// Super-admin de bootstrap: ja entra como admin+aprovado no 1o login.
const SUPER_ADMIN_EMAIL = 'marlon.andrade@voiston.com'

function isSuperAdmin(user: User): boolean {
  return !!user.emailVerified && (user.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL
}

function isVoistonVerified(user: User): boolean {
  return !!user.emailVerified && (user.email ?? '').toLowerCase().endsWith('@voiston.com')
}

/** Uma unica subscription de onAuthStateChanged pro app inteiro (evita flash de loading em cada rota). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = getFirebaseAuth()
  const db = getDb()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) {
        setProfile(null)
        setLoading(false)
        return
      }
      try {
        const ref = doc(db, 'users', u.uid)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          // 1o login: cria o doc. Super-admin entra como admin+aprovado.
          // @voiston.com verificado entra aprovado como member. Conta externa entra pendente.
          const role = isSuperAdmin(u) ? 'admin' : 'member'
          const approved = isSuperAdmin(u) ? true : isVoistonVerified(u)
          await setDoc(ref, {
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            role,
            approved,
            createdAt: serverTimestamp(),
          })
          setProfile({ email: u.email, displayName: u.displayName, photoURL: u.photoURL, role, approved })
        } else {
          const d = snap.data()
          setProfile({
            email: d.email ?? u.email,
            displayName: d.displayName ?? u.displayName,
            photoURL: d.photoURL ?? u.photoURL,
            role: d.role === 'admin' ? 'admin' : 'member',
            approved: !!d.approved,
          })
        }
      } catch (e) {
        console.error('[auth] erro ao carregar perfil:', e)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [auth, db])

  const signIn = useCallback(async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error('signIn failed:', err)
      const code = (err as { code?: string })?.code
      setError(code ? `Falha no login (${code})` : 'Falha no login, tenta de novo')
    }
  }, [auth])

  const signOutUser = useCallback(() => fbSignOut(auth), [auth])

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signIn, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
