import { collection, getDocs, query, orderBy, limit as fbLimit } from 'firebase/firestore'
import { getDb } from './firebase-client'

const MAX_LOGS = 5000

export interface AccessLogEntry {
  id: string
  uid: string
  email: string | null
  displayName: string | null
  path: string
  ts: Date | null
}

/** Le os ultimos registros de acesso (so admin consegue pela rule). */
export async function listAccessLogs(): Promise<AccessLogEntry[]> {
  const q = query(collection(getDb(), 'access_logs'), orderBy('ts', 'desc'), fbLimit(MAX_LOGS))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    const ts = data.ts && typeof data.ts.toDate === 'function' ? data.ts.toDate() : null
    return {
      id: d.id,
      uid: data.uid ?? '',
      email: data.email ?? null,
      displayName: data.displayName ?? null,
      path: data.path ?? '',
      ts,
    }
  })
}

export interface UserActivitySummary {
  uid: string
  email: string | null
  displayName: string | null
  totalVisits: number
  lastSeen: Date | null
  pageCounts: { path: string; count: number }[]
}

/** Agrupa os registros por usuario: total de acessos, ultima atividade e paginas mais visitadas. */
export function summarizeByUser(logs: AccessLogEntry[]): UserActivitySummary[] {
  const map = new Map<string, UserActivitySummary>()

  for (const log of logs) {
    if (!log.uid) continue
    let entry = map.get(log.uid)
    if (!entry) {
      entry = {
        uid: log.uid,
        email: log.email,
        displayName: log.displayName,
        totalVisits: 0,
        lastSeen: null,
        pageCounts: [],
      }
      map.set(log.uid, entry)
    }
    entry.totalVisits += 1
    if (!entry.lastSeen || (log.ts && log.ts > entry.lastSeen)) entry.lastSeen = log.ts

    const pageCount = entry.pageCounts.find((p) => p.path === log.path)
    if (pageCount) pageCount.count += 1
    else entry.pageCounts.push({ path: log.path, count: 1 })
  }

  const list = Array.from(map.values())
  for (const entry of list) entry.pageCounts.sort((a, b) => b.count - a.count)
  list.sort((a, b) => b.totalVisits - a.totalVisits)
  return list
}
