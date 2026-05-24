/**
 * Voiston API — acesso SERVER-SIDE
 * Seguindo o padrão de jjvisionpro/app/lib/server/voiston-api.ts:
 *   - Autentica via email + MD5 hash (sem token manual em env)
 *   - ownerId vem da resposta do login
 *   - Patient fixo (JJ_GENERIC_PATIENT_ID) — sem criar paciente novo
 */
import crypto from 'crypto'

const API_URL = (process.env.VOISTON_API_URL ?? 'https://api.voiston.ai/').replace(/\/$/, '')

const EMAIL =
  process.env.JJ_GENERIC_USER_EMAIL ??
  process.env.NEXT_PUBLIC_JJ_OWNER_EMAIL ??
  ''

const PATIENT_ID = parseInt(process.env.JJ_GENERIC_PATIENT_ID ?? '999', 10) || 999

const MAGIC_SECRET =
  process.env.NEXT_PUBLIC_JJ_SECRET ??
  '2M8ZMVbXGPtDIEsV8wlzDmVNwy9AlIpwAlULQCdB0JVvAnT8b4mpYqUGS8niN1ju'

// ── Token cache em memória (mesma abordagem do jjvisionpro) ───────────────────

let cachedToken: string | null = null
let cachedOwnerId: number = 1

async function getVoistonAuth(): Promise<{ token: string; ownerId: number }> {
  if (cachedToken) return { token: cachedToken, ownerId: cachedOwnerId }

  // MD5 idêntico ao md5-helper.ts do jjvisionpro:  `voiston.ai.{email}|{SECRET}`
  const hashString = `voiston.ai.${EMAIL}|${MAGIC_SECRET}`
  const passwordHash = crypto.createHash('md5').update(hashString).digest('hex')

  const res = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: passwordHash }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha no login Voiston (${res.status}) para ${EMAIL}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  if (!data?.Token?.AccessToken) {
    throw new Error(`Voiston login: AccessToken ausente na resposta`)
  }

  cachedToken = data.Token.AccessToken
  cachedOwnerId = data.Owner?.ID || 1
  return { token: cachedToken!, ownerId: cachedOwnerId }
}

// Invalida cache em 401 para re-autenticar
function invalidateToken() {
  cachedToken = null
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function vFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const { token } = await getVoistonAuth()
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
    invalidateToken()
    return vFetch<T>(path, init, false)
  }

  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  if (!res.ok) {
    throw new Error(
      `Voiston ${res.status} ${path}: ${
        typeof data === 'string' ? data : JSON.stringify(data).slice(0, 200)
      }`
    )
  }
  return data as T
}

// ── Upload flow (patient fixo — sem criar paciente) ───────────────────────────

export interface SignedUploadResponse {
  ExamFileId: number
  ExamId: number
  SignedUrl: string
  Headers: Record<string, string>
}

/**
 * Solicita signed URL para upload.
 * Usa patient fixo (JJ_GENERIC_PATIENT_ID) — mesma abordagem do jjvisionpro/voiston-api.ts.
 * Hub não tem tela de cadastro de paciente.
 */
export async function requestUpload(
  filename: string,
  contentType: string
): Promise<SignedUploadResponse> {
  const { ownerId } = await getVoistonAuth()
  return vFetch('api/Exam/newUploadRequest', {
    method: 'POST',
    body: JSON.stringify({
      Exam: {
        Owner: { ID: ownerId },
        Patient: { ID: PATIENT_ID },
        Status: 0,
      },
      FileName: filename,
      ContentType: contentType,
    }),
  })
}

export async function confirmUpload(
  examFileId: number,
  examId: number,
  fileSize: number
): Promise<void> {
  await vFetch('api/ExamFile/ConfirmUpload', {
    method: 'POST',
    body: JSON.stringify({ ExamFileId: examFileId, ExamId: examId, FileSize: fileSize }),
  })
}

// ── Status polling ────────────────────────────────────────────────────────────

export interface ExamStatus {
  Status?: number
  ExamType?: { ID?: number; Name?: string }
  PatientName?: string
  PatientID?: number
  PossiblePatientDOB?: string
  Patient?: { ID?: number; Name?: string; Gender?: unknown; Birthday?: string }
}

export async function getExamStatus(examId: number): Promise<ExamStatus> {
  return vFetch(`api/Exam/${examId}`)
}

export async function getExamRelateds(examId: number): Promise<unknown> {
  return vFetch(`api/Exam/${examId}/Relateds`)
}

export async function getPatient(patientId: number): Promise<unknown> {
  return vFetch(`api/Patient/${patientId}`)
}
