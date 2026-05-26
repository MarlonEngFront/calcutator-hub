'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBiometryStore } from '@/app/stores/biometry-store'
import { HubUploadManager } from '@/app/lib/hub-upload-manager'
import type { HubUploadState } from '@/app/lib/hub-upload-manager'
import { UploadProgressModal } from '@/app/components/UploadProgressModal'

const PROCESS_STEPS = [
  {
    icon: '📤',
    title: 'Envie o exame',
    desc: 'PDF, JPG ou PNG da biometria ocular (IOLMaster, Pentacam)',
  },
  {
    icon: '✏️',
    title: 'Valide os dados',
    desc: 'Confira K1, K2, AL e ACD extraídos automaticamente',
  },
  {
    icon: '🔬',
    title: 'Selecione a calculadora',
    desc: 'ESCRS, Barrett, Haigis e mais — compare resultados lado a lado',
  },
  {
    icon: '📊',
    title: 'Receba o resultado',
    desc: 'Potência do LIO ideal por olho com margem de segurança',
  },
]

export default function UploadPage() {
  const router = useRouter()
  const setBiometry = useBiometryStore((s) => s.setBiometry)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<HubUploadState | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [currentFile, setCurrentFile] = useState<string>('')
  const managerRef = useRef<HubUploadManager | null>(null)

  const isProcessing = showModal && !uploadState?.hasError && !uploadState?.isComplete

  const processFile = useCallback(
    async (file: File) => {
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        setError('Arquivo inválido. Use PDF, JPG ou PNG.')
        return
      }
      setError(null)
      setCurrentFile(file.name)
      managerRef.current?.cancel()

      const manager = new HubUploadManager({
        file,
        onProgress: (state) => setUploadState({ ...state }),
        onComplete: (session) => {
          setBiometry(
            {
              OD: {
                K1: session.OD.K1,
                K2: session.OD.K2,
                K1Axis: session.OD.K1Axis,
                K2Axis: session.OD.K2Axis,
                Cyl: session.OD.Cyl,
                Axis: session.OD.Axis,
                AL: session.OD.AL,
                ACD: session.OD.ACD,
                WTW: session.OD.WTW,
                LT: session.OD.LT,
                CCT: session.OD.CCT,
                refTarget: session.OD.refTarget,
              },
              OE: {
                K1: session.OE.K1,
                K2: session.OE.K2,
                K1Axis: session.OE.K1Axis,
                K2Axis: session.OE.K2Axis,
                Cyl: session.OE.Cyl,
                Axis: session.OE.Axis,
                AL: session.OE.AL,
                ACD: session.OE.ACD,
                WTW: session.OE.WTW,
                LT: session.OE.LT,
                CCT: session.OE.CCT,
                refTarget: session.OE.refTarget,
              },
            },
            {
              filename: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadedAt: new Date().toISOString(),
              equipment: session.examTypeName,
              patientName: session.patientMetadata?.name,
              gender: session.patientMetadata?.gender,
              examType: session.examTypeName,
            }
          )
          // Pequeno delay para ver "Concluído" no modal
          setTimeout(() => {
            setShowModal(false)
            setUploadState(null)
            router.push('/validate')
          }, 1200)
        },
        onError: (_msg) => {
          // Estado de erro já está no uploadState — modal mostra
        },
      })

      managerRef.current = manager
      setUploadState(manager.getState())
      setShowModal(true)
      await manager.start()
    },
    [setBiometry, router]
  )

  const handleCancel = useCallback(() => {
    managerRef.current?.cancel()
    managerRef.current = null
    setShowModal(false)
    setUploadState(null)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = Array.from(e.dataTransfer.files)[0]
      if (file) await processFile(file)
    },
    [processFile]
  )

  return (
    <>
    {/* Upload progress modal */}
    {showModal && uploadState && (
      <UploadProgressModal
        state={uploadState}
        filename={currentFile}
        onCancel={handleCancel}
      />
    )}
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Hero */}
      <div className="text-center pt-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Calcule a potência do LIO em segundos
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Envie o exame de biometria e compare múltiplas calculadoras simultaneamente
        </p>
      </div>

      {/* Upload Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative p-12 text-center transition-all cursor-pointer ${
            isDragging
              ? 'bg-blue-50 border-2 border-dashed border-blue-400'
              : 'border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <div>
                <p className="font-semibold text-gray-800">Processando exame...</p>
                <p className="text-sm text-gray-500 mt-1">Extraindo dados biométricos</p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-5xl mb-4">{isDragging ? '📂' : '📄'}</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {isDragging ? 'Solte aqui!' : 'Arraste o arquivo de biometria'}
              </h2>
              <p className="text-gray-500 mb-6">
                PDF, JPG ou PNG — IOLMaster, Pentacam, Topcon
              </p>

              {/* Format badges */}
              <div className="flex justify-center gap-2 mb-6">
                {['PDF', 'JPG', 'PNG'].map((fmt) => (
                  <span key={fmt} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
                    {fmt}
                  </span>
                ))}
              </div>

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0]
                  if (file) processFile(file)
                }}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
              >
                <span>Selecionar arquivo</span>
              </label>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Demo strip */}
        <div className="border-t border-slate-100 bg-slate-50 px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Quer testar sem arquivo?</p>
            <p className="text-xs text-gray-500">Use dados de demonstração pré-carregados</p>
          </div>
          <button
            onClick={() => {
              setBiometry(
                {
                  OD: { K1: 43.25, K2: 44.75, AL: 24.5, ACD: 3.2, WTW: 11.8, refTarget: 0 },
                  OE: { K1: 43.0, K2: 44.5, AL: 24.3, ACD: 3.15, WTW: 11.8, refTarget: 0 },
                },
                {
                  filename: 'demo-biometry.json',
                  fileSize: 0,
                  fileType: 'application/json',
                  uploadedAt: new Date().toISOString(),
                  patientName: 'João Demo',
                  examType: 'standard',
                }
              )
              router.push('/validate')
            }}
            className="flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            ⚡ Usar demo
          </button>
        </div>
      </div>

      {/* Process Steps */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Como funciona
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PROCESS_STEPS.map((step, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-2xl mb-2">{step.icon}</div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-gray-800">{step.title}</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
        <div>
          <p className="font-semibold text-amber-800">Ferramenta de apoio clínico</p>
          <p className="text-amber-700 mt-0.5">
            Os resultados são referência para profissionais de saúde. A decisão final de prescrição é sempre do médico oftalmologista responsável.
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
