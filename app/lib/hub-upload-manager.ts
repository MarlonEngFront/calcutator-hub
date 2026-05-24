/**
 * HubUploadManager — orquestra upload de exame via rotas server-side do hub
 * O browser NÃO acessa a Voiston API diretamente — sem auth necessária.
 *
 * Fluxo:
 *   POST /api/exam/init    → obtém signed URL (server cria paciente + request)
 *   PUT  {signed URL}      → browser envia arquivo direto ao storage
 *   POST /api/exam/confirm → confirma recebimento
 *   GET  /api/exam/status  → polling até processamento concluir
 *   GET  /api/exam/parse   → busca relateds e parseia biometria
 */

import type { ParsedExamSession } from './exam-relateds-parser'

export type UploadStepId =
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
  { id: 'init',       label: 'Configurando sessão' },
  { id: 'upload',     label: 'Enviando arquivo'    },
  { id: 'confirm',    label: 'Confirmando recebimento' },
  { id: 'processing', label: 'Processando biometria' },
  { id: 'parsing',    label: 'Extraindo medidas'   },
]

const POLL_START_MS   = 3_000
const POLL_MAX_MS     = 5 * 60_000
const POLL_MAX_DELAY  = 15_000

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
      // 1. Init — server cria paciente e obtém signed URL
      this.set('init', { status: 'loading', progress: 40 })
      const initRes = await fetch('/api/exam/init', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename:    this.file.name,
          contentType: this.file.type || 'application/octet-stream',
        }),
      })
      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}))
        throw new Error(err.error ?? `Init falhou (${initRes.status})`)
      }
      const { signedUrl, signedHeaders, examId, examFileId } = await initRes.json()
      this.state.examId = examId
      this.set('init', { status: 'success', progress: 100 })
      if (signal.aborted) return

      // 2. Upload direto ao storage (PUT para signed URL)
      this.set('upload', { status: 'loading', progress: 10 })
      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        body: this.file,
        signal,
        headers: { ...signedHeaders, 'Content-Type': this.file.type || 'application/octet-stream' },
      })
      if (!putRes.ok) throw new Error(`Upload ao storage falhou: ${putRes.statusText}`)
      this.set('upload', { status: 'success', progress: 100 })
      if (signal.aborted) return

      // 3. Confirmar upload
      this.set('confirm', { status: 'loading', progress: 50 })
      const confirmRes = await fetch('/api/exam/confirm', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, examFileId, fileSize: this.file.size }),
      })
      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}))
        throw new Error(err.error ?? 'Confirmação falhou')
      }
      this.set('confirm', { status: 'success', progress: 100 })
      if (signal.aborted) return

      // 4. Polling de status (browser chama nossa rota, que chama Voiston server-side)
      this.set('processing', { status: 'loading', progress: 5, message: 'Aguardando processamento...' })
      await this.poll(examId, signal)
      this.set('processing', { status: 'success', progress: 100 })
      if (signal.aborted) return

      // 5. Parse — server busca relateds e normaliza
      this.set('parsing', { status: 'loading', progress: 40, message: 'Buscando medidas biométricas...' })
      const parseRes = await fetch(`/api/exam/parse?examId=${examId}`, { signal })
      if (!parseRes.ok) {
        const err = await parseRes.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao parsear biometria')
      }
      const session: ParsedExamSession = await parseRes.json()
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
          const res  = await fetch(`/api/exam/status?examId=${examId}`, { signal })
          const data = await res.json()

          if (!res.ok) throw new Error(data.error ?? `Status HTTP ${res.status}`)

          const pct = Math.min(10 + Math.floor((count / 20) * 80), 90)
          this.set('processing', {
            status: 'loading',
            progress: pct,
            message: count > 5 ? 'Consolidando medidas...' : 'Processando OCR...',
          })

          if (data.done)          { resolve(); return }
          if (data.unrecognized)  { reject(new Error('Biometria não reconhecida. Verifique se o arquivo é um exame suportado.')); return }
          if (data.error)         { reject(new Error('Erro durante processamento do arquivo')); return }

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
