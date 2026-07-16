'use client'

import { useEffect, useRef } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { getDb } from './firebase-client'

/** Registra cada troca de rota do usuario logado (rule so permite create do proprio uid). */
export function useAccessLog(user: User | null, allowed: boolean, pathname: string) {
  const lastLogged = useRef<string | null>(null)

  useEffect(() => {
    if (!user || !allowed) return
    const key = `${user.uid}:${pathname}`
    if (lastLogged.current === key) return
    lastLogged.current = key

    addDoc(collection(getDb(), 'access_logs'), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      path: pathname,
      ts: serverTimestamp(),
    }).catch((err) => {
      console.error('[access-log] falha ao registrar acesso:', err)
    })
  }, [user, allowed, pathname])
}
