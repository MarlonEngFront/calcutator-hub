'use client'

import { useEffect, useRef } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { toast } from 'sonner'
import { getDb } from '@/app/lib/firebase-client'
import { useAuth } from '@/app/lib/useAuth'

const NOTIFIED_KEY = 'voiston:notified-pending-uids'

function loadNotified(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveNotified(ids: Set<string>) {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage indisponível (modo privado etc.) — ignora, só perde a dedupe.
  }
}

async function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) {
      await reg.showNotification(title, { body, icon: '/icons/icon-192.png', data: { url: '/admin' } })
      return
    }
  } catch {
    // sem service worker ativo — cai no fallback abaixo.
  }
  new Notification(title, { body, icon: '/icons/icon-192.png' })
}

/** Pede permissão de notificação a partir de um gesto real do usuário (clique no toast). */
function requestPermissionBanner() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
  toast('Ativar notificações de novos cadastros?', {
    id: 'notif-permission',
    duration: 15000,
    action: {
      label: 'Ativar',
      onClick: () => {
        Notification.requestPermission()
      },
    },
  })
}

/**
 * Escuta usuários pendentes (approved == false) em tempo real e avisa o admin
 * logado — toast in-app sempre, notificação do navegador quando permitida.
 * Só funciona com o app aberto (aba ativa ou em background), sem back-end.
 */
export default function AdminNotifications() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' && profile?.approved
  const notifiedRef = useRef<Set<string> | null>(null)
  const isFirstSnapshotRef = useRef(true)

  useEffect(() => {
    if (!isAdmin) return

    notifiedRef.current = loadNotified()
    isFirstSnapshotRef.current = true
    requestPermissionBanner()

    const q = query(collection(getDb(), 'users'), where('approved', '==', false))
    const unsub = onSnapshot(q, (snap) => {
      const notified = notifiedRef.current ?? new Set<string>()
      const pending = snap.docs.filter((d) => !notified.has(d.id))
      if (pending.length === 0) return

      const isFirst = isFirstSnapshotRef.current
      isFirstSnapshotRef.current = false

      if (isFirst && pending.length > 1) {
        toast.info(`${pending.length} cadastros aguardando aprovação`, {
          action: { label: 'Ver', onClick: () => (window.location.href = '/admin') },
        })
        notify('Voiston Hub', `${pending.length} cadastros aguardando aprovação`)
      } else {
        for (const d of pending) {
          const data = d.data()
          const label = data.displayName || data.email || 'Novo usuário'
          toast.info(`${label} pediu acesso ao Voiston Hub`, {
            action: { label: 'Ver', onClick: () => (window.location.href = '/admin') },
          })
          notify('Novo cadastro pendente', `${label} está aguardando aprovação`)
        }
      }

      for (const d of pending) notified.add(d.id)
      notifiedRef.current = notified
      saveNotified(notified)
    })

    return () => unsub()
  }, [isAdmin])

  return null
}
