'use client'

import { useAuth } from '@/app/lib/useAuth'
import UsersPanel from '@/app/components/UsersPanel'
import ActivityPanel from '@/app/components/ActivityPanel'

export default function AdminPage() {
  const { profile } = useAuth()

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-16 text-sm text-gray-500">
        Acesso restrito ao administrador.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Painel de administração</h1>
        <p className="text-sm text-gray-500">Usuários e atividade de acesso ao Voiston Calculator Hub.</p>
      </div>
      <UsersPanel />
      <ActivityPanel />
    </div>
  )
}
