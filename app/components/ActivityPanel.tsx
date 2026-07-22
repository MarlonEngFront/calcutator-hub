'use client'

import { useState } from 'react'
import {
  listAccessLogs,
  summarizeByUser,
  type UserActivitySummary,
} from '@/app/lib/access-logs-admin'

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function ActivityRow({ entry }: { entry: UserActivitySummary }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-4">
        <div className="font-semibold text-gray-900">{entry.displayName ?? '—'}</div>
        <div className="text-xs text-gray-500">{entry.email ?? '—'}</div>
      </td>
      <td className="py-3 pr-4 text-right font-medium text-gray-900">{entry.totalVisits}</td>
      <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{formatDate(entry.lastSeen)}</td>
      <td className="py-3">
        <div className="flex flex-wrap gap-1.5">
          {entry.pageCounts.map((pc) => (
            <span
              key={pc.path}
              className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
            >
              {pc.path} · {pc.count}
            </span>
          ))}
        </div>
      </td>
    </tr>
  )
}

export default function ActivityPanel() {
  const [activity, setActivity] = useState<UserActivitySummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const logs = await listAccessLogs()
      setActivity(summarizeByUser(logs))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar atividade.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-1">
        <h2 className="text-base font-bold text-gray-900">Atividade dos usuários</h2>
        <button
          onClick={load}
          disabled={loading}
          className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Carregando…' : activity ? '↻ Atualizar' : 'Carregar atividade'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Páginas acessadas e quantidade de acessos por usuário
        {activity ? ` (${activity.reduce((n, a) => n + a.totalVisits, 0)} registros)` : ''}.
      </p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {activity && activity.length === 0 && (
        <p className="text-sm text-gray-500">Nenhum acesso registrado ainda.</p>
      )}

      {activity && activity.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-slate-200">
                <th className="py-2 pr-4 font-medium">Usuário</th>
                <th className="py-2 pr-4 font-medium text-right">Acessos</th>
                <th className="py-2 pr-4 font-medium">Último acesso</th>
                <th className="py-2 font-medium">Páginas acessadas</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((entry) => (
                <ActivityRow key={entry.uid} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
