import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getDb } from './firebase-client'

export interface AdminUserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  role: 'admin' | 'member'
  approved: boolean
  createdAt?: unknown
}

/** Lista todos os usuarios (so admin consegue pela rule). */
export async function listAllUsers(): Promise<AdminUserProfile[]> {
  const snap = await getDocs(collection(getDb(), 'users'))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      uid: d.id,
      email: data.email ?? null,
      displayName: data.displayName ?? null,
      photoURL: data.photoURL ?? null,
      role: data.role === 'admin' ? 'admin' : 'member',
      approved: !!data.approved,
      createdAt: data.createdAt,
    }
  })
}

/** Aprova o usuario. */
export async function approveUser(uid: string): Promise<void> {
  await updateDoc(doc(getDb(), 'users', uid), { approved: true, updatedAt: serverTimestamp() })
}

/** Revoga aprovacao do usuario. */
export async function revokeUser(uid: string): Promise<void> {
  await updateDoc(doc(getDb(), 'users', uid), { approved: false, updatedAt: serverTimestamp() })
}

/** Promove ou rebaixa o role do usuario. */
export async function setUserRole(uid: string, role: 'admin' | 'member'): Promise<void> {
  await updateDoc(doc(getDb(), 'users', uid), { role, updatedAt: serverTimestamp() })
}
