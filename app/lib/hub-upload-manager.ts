/**
 * HubUploadManager — orquestra upload de exame chamando Voiston API diretamente
 * (client-side, igual jjvisionpro). Sem server routes intermediárias.
 *
 * Fluxo:
 *   POST api.voiston.ai/api/Exam/newUploadRequest → signed URL
 *   PUT  {signed URL}                             → envia arquivo ao storage
 *   POST api.voiston.ai/api/ExamFile/ConfirmUpload
 *   GET  api.voiston.ai/api/Exam/{id}             → polling status
 *   GET  api.voiston.ai/api/Exam/{id}/Relateds    → busca medidas
 *   parse no browser (parseExamRelateds)
 */

import {
  clientRequestUpload,
  clientConfirmUpload,
  clientGetExamStatus,
  clientGetExamRelateds,
  clientGetPatient,
  clientCreatePatient,
} from './voiston-client'
import {
  parseExamRelateds,
  unwrapExamRelatedsPayload,
} from './exam-relateds-parser'
import type { ParsedExamSession } from './exam-relateds-parser'

export type UploadStepId =
  | 'patient'
  | 'init'
  | 'upload'
  | 'confirm'
  | 'processing'
  | 'parsing'

export type StepStatus = 'pending' | 'loading' | 'success' | 'error'

export interface UploadStep {
  id: UploadStepId
  label: string
  status: StepStatus
  progress: number
  message?: string
}

export interface HubUploadState {
  steps: UploadStep[]
  overallProgress: number
  isComplete: boolean
  hasError: boolean
  errorMessage?: string
  canRetry: boolean
  examId?: number
}

type ProgressFn = (state: HubUploadState) => void
type CompleteFn = (session: ParsedExamSession) => void
type ErrorFn   = (message: string) => void

const STEP_DEFS: Array<Pick<UploadStep, 'id' | 'label'>> = [
  { id: 'patient',    label: 'Preparando sessão'   },
  { id: 'init',       label: 'Configurando envio'  },
  { id: 'upload',     label: 'Enviando arquivo'    },
  { id: 'confirm',    label: 'Confirmando recebimento' },
  { id: 'processing', label: 'Processando biometria' },
  { id: 'parsing',    label: 'Extraindo medidas'   },
]

const POLL_START_MS  = 3_000
const POLL_MAX_MS    = 5 * 60_000
const POLL_MAX_DELAY = 15_000

const GENDER_MAP: Record<string, string> = {
  '0': 'Masculino', '1': 'Feminino', '100': 'Outro',
  'm': 'Masculino', 'f': 'Feminino',
  'male': 'Masculino', 'female': 'Feminino',
  'masculino': 'Masculino', 'feminino': 'Feminino',
}

export class HubUploadManager {
  private file: File
  private onProgress: ProgressFn
  private onComplete: CompleteFn
  private onError:    ErrorFn
  private abort = new AbortController()
  private state: HubUploadState

  constructor(opts: {
    file: File
    onProgress: ProgressFn
    onComplete: CompleteFn
    onError:    ErrorFn
  }) {
    this.file = opts.file
    this.onProgress = opts.onProgress
    this.onComplete = opts.onComplete
    this.onError    = opts.onError
    this.state = {
      steps: STEP_DEFS.map((s) => ({ ...s, status: 'pending', progress: 0 })),
      overallProgress: 0,
      isComplete: false,
      hasError: false,
      canRetry: true,
    }
  }

  public cancel() { this.abort.abort() }

  // ── Progress helpers ────────────────────────────────────────────────────────

  private set(id: UploadStepId, patch: Partial<UploadStep>) {
    this.state.steps = this.state.steps.map((s) =>
      s.id === id ? { ...s, ...patch } : s
    )
    const done  = this.state.steps.filter((s) => s.status === 'success').length
    const total = this.state.steps.length
    const cur   = this.state.steps.find((s) => s.id === id)
    let pct = (done / total) * 100
    if (cur?.status === 'loading') pct += (cur.progress / 100) * (100 / total)
    this.state.overallProgress = Math.min(Math.round(pct), 99)
    this.emit()
  }

  private fail(id: UploadStepId, msg: string) {
    this.set(id, { status: 'error', message: msg })
    this.state.hasError = true
    this.state.errorMessage = msg
    this.emit()
    this.onError(msg)
  }

  private emit() {
    this.onProgress({ ...this.state, steps: [...this.state.steps] })
  }

  // ── Main orchestration ──────────────────────────────────────────────────────

  public async start() {
    const { signal } = this.abort
    try {
      // 1. Cria paciente real (igual jjvisionpro) — necessário para OCR funcionar
      this.set('patient', { status: 'loading', progress: 50 })
      const patient = await clientCreatePatient()
      const realPatientId = patient.ID
      this.set('patient', { status: 'success', progress: 100 })
      if (signal.aborted) return

      // 2. Solicita signed URL com patientId real
      this.set('init', { status: 'loading', progress: 40 })
      const upload = await clientRequestUpload(
        this.file.name,
        this.file.type || 'application/octet-stream',
        realPatientId,
      )
      const { ExamId: examId, ExamFileId: examFileId, SignedUrl: signedUrl, Headers: signedHeaders } = upload
      this.state.examId = examId
      this.set('init', { status: 'success', progress: 100 })
      if (signal.aborted) return

      // 3. Upload direto ao storage (PUT signed URL)
      this.set('upload', { status: 'loading', progress: 10 })
      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        body: this.file,
        signal,
        headers: {
          ...signedHeaders,
          'Content-Type': this.file.type || 'application/octet-stream',
        },
      })
      if (!putRes.ok) throw new Error(`Upload ao storage falhou: ${putRes.statusText}`)
      this.set('upload', { status: 'success', progress: 100 })
      if (signal.aborted) return

      // 4. Confirma upload
      this.set('confirm', { status: 'loading', progress: 50 })
      await clientConfirmUpload(examFileId, examId, this.file.size)
      this.set('confirm', { status: 'success', progress: 100 })
      if (signal.aborted) return

      // 5. Polling de status
      this.set('processing', { status: 'loading', progress: 5, message: 'Aguardando processamento...' })
      await this.poll(examId, signal)
      this.set('processing', { status: 'success', progress: 100 })
      if (signal.aborted) return

      // 6. Busca relateds + parse no browser
      this.set('parsing', { status: 'loading', progress: 40, message: 'Buscando medidas biométricas...' })
      const [relateds, fullExam] = await Promise.all([
        clientGetExamRelateds(examId),
        clientGetExamStatus(examId),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const examObj = (fullExam as any)?.Exam || fullExam
      const examTypeId: number | undefined = examObj?.ExamType?.ID
      const examTypeName: string | undefined =
        typeof examObj?.ExamType?.Name === 'string' ? examObj.ExamType.Name.trim() : undefined

      const relatedsRoot = unwrapExamRelatedsPayload(relateds)
      const session = parseExamRelateds(relatedsRoot, examId, examTypeId)

      if (!session) {
        // Não substituir por normalizeEyeData({}) — isso preenche os campos com os
        // defaults hardcoded do parser (AL 23.50, K1 43.00 etc.) como se fossem dado
        // real extraído, sem nenhum aviso. Falha explícita aqui.
        throw new Error('Biometria não reconhecida. Nenhuma medida foi extraída deste exame — verifique se o arquivo é um laudo suportado.')
      }

      // Enriquece metadados do paciente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const relData = relatedsRoot as any
      let name: string | undefined = examObj?.PatientName
      let gender: unknown = undefined
      let birthDate: string | undefined = examObj?.PossiblePatientDOB

      const embeddedPatient = examObj?.Patient || relData?.Patient
      if (embeddedPatient) {
        if (!name) name = embeddedPatient.Name
        if (embeddedPatient.Gender != null) gender = embeddedPatient.Gender
        if (!birthDate) birthDate = embeddedPatient.Birthday || embeddedPatient.BirthDate
      }

      // Gender from flat Measurements array (Side 0, Type.Name = "Gender")
      if (gender == null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flatMeasurements = (relData?.Measurements ?? (relateds as any)?.Measurements) as Array<{
          Side?: number
          Type?: { Name?: string; DisplayName?: string }
          StringValue?: string
        }> | undefined
        if (Array.isArray(flatMeasurements)) {
          const gm = flatMeasurements.find((m) => {
            const n = (m.Type?.Name ?? m.Type?.DisplayName ?? '').toLowerCase().trim()
            return n === 'gender'
          })
          if (gm?.StringValue) gender = gm.StringValue
        }
      }

      // Also scan GroupedMeasurement Side 0 (non-side-specific metadata)
      if (gender == null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const grouped = relData?.GroupedMeasurement as Array<any> | undefined
        if (Array.isArray(grouped)) {
          const side0 = grouped.find((g) => g.Side === 0)
          if (side0) {
            for (const lg of side0.LabelGroups ?? []) {
              for (const tg of lg.TypeGroups ?? []) {
                const n = (tg.MeasurementType?.Name ?? tg.MeasurementType?.DisplayName ?? '').toLowerCase().trim()
                if (n === 'gender' && tg.Measurements?.[0]?.StringValue) {
                  gender = tg.Measurements[0].StringValue
                }
              }
            }
          }
        }
      }

      const resolvedPatientId = examObj?.PatientID || embeddedPatient?.ID
      if (resolvedPatientId) {
        try {
          const pData = await clientGetPatient(resolvedPatientId) as Record<string, unknown>
          const pName = pData?.Name as string | undefined
          if (pName && !pName.toLowerCase().startsWith('paciente hub')) {
            if (!name) name = pName
          }
          if (gender == null && pData?.Gender != null) gender = pData.Gender
          if (!birthDate) birthDate = pData?.Birthday as string || pData?.BirthDate as string
        } catch { /* noop */ }
      }

      if (typeof name === 'string' && name.toLowerCase().startsWith('paciente hub')) name = undefined

      let genderLabel: string | undefined
      if (gender != null && String(gender).trim()) {
        genderLabel = GENDER_MAP[String(gender).toLowerCase().trim()]
      }

      if (name || genderLabel || birthDate) {
        session.patientMetadata = { name, gender: genderLabel, birthDate }
      }
      if (examTypeName) session.examTypeName = examTypeName
      if (typeof examTypeId === 'number') session.examTypeId = examTypeId

      this.set('parsing', { status: 'success', progress: 100 })
      this.state.isComplete = true
      this.state.overallProgress = 100
      this.emit()
      this.onComplete(session)
    } catch (err) {
      if (this.abort.signal.aborted) return
      const msg = err instanceof Error ? err.message : 'Erro inesperado'
      const loading = this.state.steps.find((s) => s.status === 'loading')
      this.fail((loading?.id ?? 'init') as UploadStepId, msg)
    }
  }

  // ── Polling ─────────────────────────────────────────────────────────────────

  private poll(examId: number, signal: AbortSignal): Promise<void> {
    const start = Date.now()
    let count = 0

    return new Promise((resolve, reject) => {
      const check = async () => {
        if (signal.aborted) { resolve(); return }
        if (Date.now() - start > POLL_MAX_MS) {
          reject(new Error('Timeout: processamento demorou mais de 5 minutos'))
          return
        }
        count++
        try {
          const data = await clientGetExamStatus(examId)
          const status = data?.Status ?? 0

          const pct = Math.min(10 + Math.floor((count / 20) * 80), 90)
          this.set('processing', {
            status: 'loading',
            progress: pct,
            message: count > 5 ? 'Consolidando medidas...' : 'Processando OCR...',
          })

          // Status 99 ou 100 = concluído
          if (status === 99 || status === 100) { resolve(); return }
          // Status 11 = arquivo não reconhecido
          if (status === 11) {
            reject(new Error('Biometria não reconhecida. Verifique se o arquivo é um exame suportado.'))
            return
          }
          // Status >= 90 (exceto 99/100) = erro
          if (status >= 90) {
            reject(new Error('Erro durante processamento do arquivo'))
            return
          }

          const delay = Math.min(POLL_START_MS * Math.pow(1.4, count - 1), POLL_MAX_DELAY)
          setTimeout(check, delay)
        } catch (err) {
          if (signal.aborted) { resolve(); return }
          reject(err)
        }
      }
      setTimeout(check, POLL_START_MS)
    })
  }

  public getState(): HubUploadState {
    return { ...this.state, steps: [...this.state.steps] }
  }
}
