'use client'

import type { HubUploadState } from '@/app/lib/hub-upload-manager'

interface Props {
  state: HubUploadState
  filename: string
  onCancel: () => void
}

const STEP_ICONS: Record<string, string> = {
  patient:    '👤',
  request:    '🔗',
  upload:     '📤',
  confirm:    '✅',
  processing: '🔬',
  parsing:    '📊',
}

export function UploadProgressModal({ state, filename, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              {state.hasError ? '❌' : state.isComplete ? '✅' : '⏳'}
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Processando exame</h3>
              <p className="text-blue-100 text-xs mt-0.5 truncate max-w-xs">{filename}</p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="mt-4 h-2 bg-blue-500/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${state.overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-blue-200 mt-1">
            <span>{state.isComplete ? 'Concluído!' : state.hasError ? 'Erro' : 'Processando...'}</span>
            <span>{state.overallProgress}%</span>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-4 space-y-2">
          {state.steps.map((step) => (
            <div key={step.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              step.status === 'loading'  ? 'bg-blue-50 border border-blue-200' :
              step.status === 'success'  ? 'bg-green-50 border border-green-100' :
              step.status === 'error'    ? 'bg-red-50 border border-red-200' :
              'border border-transparent'
            }`}>
              <div className="text-lg leading-none w-6 text-center">
                {step.status === 'loading' ? (
                  <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : step.status === 'success' ? '✓' :
                  step.status === 'error'   ? '✗' :
                  STEP_ICONS[step.id] ?? '○'}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${
                  step.status === 'loading' ? 'text-blue-800' :
                  step.status === 'success' ? 'text-green-700' :
                  step.status === 'error'   ? 'text-red-700'   :
                  'text-gray-400'
                }`}>{step.label}</span>
                {step.message && step.status === 'loading' && (
                  <p className="text-xs text-blue-500 mt-0.5">{step.message}</p>
                )}
                {step.message && step.status === 'error' && (
                  <p className="text-xs text-red-500 mt-0.5">{step.message}</p>
                )}
              </div>
              {step.status === 'loading' && (
                <div className="w-16 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Error message */}
        {state.hasError && state.errorMessage && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <strong>Erro:</strong> {state.errorMessage}
          </div>
        )}

        {/* Auth hint */}
        {state.hasError && state.errorMessage?.includes('401') && (
          <div className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            <strong>Autenticação necessária.</strong> Faça login no JJVision Pro primeiro — o token de acesso é compartilhado automaticamente.
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-5">
          {state.hasError ? (
            <button
              onClick={onCancel}
              className="w-full py-3 border border-slate-200 text-gray-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              Fechar e tentar novamente
            </button>
          ) : !state.isComplete ? (
            <button
              onClick={onCancel}
              className="w-full py-3 border border-slate-200 text-gray-500 rounded-xl text-sm hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
