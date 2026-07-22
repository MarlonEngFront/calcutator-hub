'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  listAllUsers,
  approveUser,
  revokeUser,
  setUserRole,
  type AdminUserProfile,
} from '@/app/lib/users-admin'
import { useAuth } from '@/app/lib/useAuth'

function formatDate(ts: unknown): string {
  if (!ts) return '—'
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    return (ts as { toDate: () => Date }).toDate().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    })
  }
  return '—'
}

function UserRow({
  user,
  isCurrentUser,
  onRefresh,
}: {
  user: AdminUserProfile
  isCurrentUser: boolean
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggleApproved() {
    setError(null)
    startTransition(async () => {
      try {
        if (user.approved) await revokeUser(user.uid)
        else await approveUser(user.uid)
        onRefresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  function toggleRole() {
    setError(null)
    startTransition(async () => {
      try {
        await setUserRole(user.uid, user.role === 'admin' ? 'member' : 'admin')
        onRefresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt=""
            width={36}
            height={36}
            className="rounded-full shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold text-sm shrink-0">
            {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 text-sm truncate">
            {user.displayName ?? '—'}
            {isCurrentUser && <span className="ml-2 text-xs text-blue-600 font-medium">você</span>}
          </div>
          <div className="text-xs text-gray-500 truncate">{user.email ?? '—'}</div>
          <div className="text-xs text-gray-400">Criado em {formatDate(user.createdAt)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <button
          onClick={toggleApproved}
          disabled={isCurrentUser || pending}
          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            user.approved
              ? 'bg-green-50 text-green-700 border-green-200 hover:border-green-300'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300'
          }`}
        >
          {user.approved ? 'Aprovado' : 'Pendente'}
        </button>
        <button
          onClick={toggleRole}
          disabled={isCurrentUser || pending}
          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            user.role === 'admin'
              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300'
              : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
          }`}
        >
          {user.role === 'admin' ? 'Admin' : 'Member'}
        </button>
      </div>
    </div>
  )
}

export default function UsersPanel() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUserProfile[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const list = await listAllUsers()
      list.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1
        if (b.role === 'admin' && a.role !== 'admin') return 1
        if (a.approved && !b.approved) return -1
        if (b.approved && !a.approved) return 1
        return (a.email ?? '').localeCompare(b.email ?? '')
      })
      setUsers(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-1">
        <h2 className="text-base font-bold text-gray-900">Usuários</h2>
        <button
          onClick={load}
          disabled={loading}
          className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Carregando…' : '↻ Atualizar'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Aprove ou revogue acesso, promova administradores.
      </p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {!loading && users && users.length === 0 && (
        <p className="text-sm text-gray-500">Nenhum usuário encontrado.</p>
      )}

      {users && users.length > 0 && (
        <div>
          {users.map((u) => (
            <UserRow key={u.uid} user={u} isCurrentUser={u.uid === currentUser?.uid} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  )
}
