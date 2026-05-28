/**
 * voiston-client.ts — autenticação e chamadas Voiston client-side
 * Padrão idêntico ao jjvisionpro/app/lib/server/voiston-api.ts
 * mas rodando no browser (usa NEXT_PUBLIC_* env vars).
 */
import { Md5 } from 'ts-md5'

const API_URL        = (process.env.NEXT_PUBLIC_VOISTON_API_URL ?? 'https://api.voiston.ai/').replace(/\/$/, '')
const EMAIL          = process.env.NEXT_PUBLIC_JJ_OWNER_EMAIL ?? ''
const SECRET         = process.env.NEXT_PUBLIC_JJ_SECRET ?? ''
const DATA_PARTNER_ID = parseInt(process.env.NEXT_PUBLIC_JJ_DATA_PARTNER_ID ?? '1786356', 10) || 1786356

// Token cache in memory (+ localStorage for persistence across reloads)
let cachedToken: string | null = null
let cachedOwnerId: number = 1

function loadStoredToken(): void {
  if (cachedToken) return
  try {
    const t = localStorage.getItem('voiston_hub_token')
    const o = localStorage.getItem('voiston_hub_owner_id')
    if (t) { cachedToken = t; cachedOwnerId = o ? parseInt(o, 10) : 1 }
  } catch { /* noop */ }
}

function saveToken(token: string, ownerId: number): void {
  cachedToken = token
  cachedOwnerId = ownerId
  try {
    localStorage.setItem('voiston_hub_token', token)
    localStorage.setItem('voiston_hub_owner_id', String(ownerId))
  } catch { /* noop */ }
}

export function clearVoistonToken(): void {
  cachedToken = null
  try {
    localStorage.removeItem('voiston_hub_token')
    localStorage.removeItem('voiston_hub_owner_id')
  } catch { /* noop */ }
}

async function login(): Promise<{ token: string; ownerId: number }> {
  // MD5 hash idêntico ao jjvisionpro: `voiston.ai.{email}|{SECRET}`
  const hashString = `voiston.ai.${EMAIL}|${SECRET}`
  const passwordHash = Md5.hashStr(hashString)

  const res = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: passwordHash }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Voiston login falhou (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  if (!data?.Token?.AccessToken) throw new Error('Login: AccessToken ausente na resposta')

  return { token: data.Token.AccessToken, ownerId: data.Owner?.ID ?? 1 }
}

async function getAuth(): Promise<{ token: string; ownerId: number }> {
  loadStoredToken()
  if (cachedToken) return { token: cachedToken, ownerId: cachedOwnerId }
  const { token, ownerId } = await login()
  saveToken(token, ownerId)
  return { token, ownerId }
}

// ── HTTP helper ────────────────────────────────────────────────────────────────

async function vFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const { token } = await getAuth()
  const url = `${API_URL}/${path}`

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  })

  if (res.status === 401 && retry) {
    // Token expirado — limpa e tenta novamente
    cachedToken = null
    clearVoistonToken()
    return vFetch<T>(path, init, false)
  }

  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = text }

  if (!res.ok) {
    throw new Error(
      `Voiston ${res.status} ${path}: ${
        typeof data === 'string' ? data : JSON.stringify(data).slice(0, 200)
      }`,
    )
  }
  return data as T
}

// ── Upload flow ────────────────────────────────────────────────────────────────

export interface SignedUploadResponse {
  ExamFileId: number
  ExamId: number
  SignedUrl: string
  Headers: Record<string, string>
}

export async function clientRequestUpload(
  filename: string,
  contentType: string,
  patientId?: number,
): Promise<SignedUploadResponse> {
  const { ownerId } = await getAuth()
  return vFetch<SignedUploadResponse>('api/Exam/newUploadRequest', {
    method: 'POST',
    body: JSON.stringify({
      Exam: {
        Owner: { ID: ownerId },
        Patient: { ID: patientId ?? 999 },
        Status: 0,
      },
      FileName: filename,
      ContentType: contentType,
    }),
  })
}

export async function clientConfirmUpload(
  examFileId: number,
  examId: number,
  fileSize: number,
): Promise<void> {
  await vFetch('api/ExamFile/ConfirmUpload', {
    method: 'POST',
    body: JSON.stringify({ ExamFileId: examFileId, ExamId: examId, FileSize: fileSize }),
  })
}

export async function clientGetExamStatus(examId: number): Promise<{ Status?: number }> {
  return vFetch<{ Status?: number }>(`api/Exam/${examId}`)
}

export async function clientGetExamRelateds(examId: number): Promise<unknown> {
  return vFetch(`api/Exam/${examId}/Relateds`)
}

export async function clientGetPatient(patientId: number): Promise<unknown> {
  return vFetch(`api/Patient/${patientId}`)
}

export async function clientCreatePatient(): Promise<{ ID: number }> {
  const { ownerId } = await getAuth()
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const name = `paciente hub ${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}`
  return vFetch<{ ID: number }>('api/Patient/New', {
    method: 'POST',
    body: JSON.stringify({
      Name: name,
      Owner: { ID: ownerId },
      DataPartner: { ID: DATA_PARTNER_ID },
    }),
  })
}
