'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/lib/useAuth'
import { useAccessLog } from '@/app/lib/useAccessLog'
import LoginGate from './LoginGate'
import AwaitingApproval from './AwaitingApproval'

/**
 * Embrulha o app inteiro. Tres estados: sem login -> LoginGate; logado mas
 * pendente -> AwaitingApproval; aprovado -> libera tudo (o /admin em si e
 * gated separadamente por profile.role dentro de app/admin/page.tsx).
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, profile, loading, error, signIn, signOut } = useAuth()
  const pathname = usePathname() || '/'

  useAccessLog(user, !!profile?.approved, pathname)

  if (loading) return null
  if (!user) return <LoginGate onSignIn={signIn} error={error} />
  if (!profile?.approved) {
    return <AwaitingApproval email={profile?.email ?? user.email} onSignOut={signOut} />
  }
  return <>{children}</>
}
