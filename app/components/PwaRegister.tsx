'use client'

import { useEffect } from 'react'

/** Registra o service worker do app shell (instalação como PWA + cache offline). */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[pwa] falha ao registrar service worker:', err)
    })
  }, [])

  return null
}
