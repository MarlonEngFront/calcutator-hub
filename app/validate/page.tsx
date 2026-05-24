'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBiometryStore } from '@/app/stores/biometry-store'

const FIELD_META: Record<string, { label: string; unit: string; critical: boolean; range: [number, number] }> = {
  K1:        { label: 'K1',         unit: 'D',  critical: true,  range: [36, 52] },
  K2:        { label: 'K2',         unit: 'D',  critical: true,  range: [36, 52] },
  AL:        { label: 'AL',         unit: 'mm', critical: true,  range: [18, 34] },
  ACD:       { label: 'ACD',        unit: 'mm', critical: true,  range: [1.5, 5] },
  WTW:       { label: 'WTW',        unit: 'mm', critical: false, range: [10, 14] },
  LT:        { label: 'LT',         unit: 'mm', critical: false, range: [2, 7] },
  CCT:       { label: 'CCT',        unit: 'µm', critical: false, range: [400, 700] },
  K1Axis:    { label: 'Eixo K1',    unit: '°',  critical: false, range: [0, 180] },
  K2Axis:    { label: 'Eixo K2',    unit: '°',  critical: false, range: [0, 180] },
  Cyl:       { label: 'Cil. Corneal',unit: 'D', critical: false, range: [0, 10] },
  refTarget: { label: 'Alvo refr.', unit: 'D',  critical: false, range: [-3, 1] },
}

function isOutOfRange(field: string, value: number) {
  const meta = FIELD_META[field]
  if (!meta) return false
  return value < meta.range[0] || value > meta.range[1]
}

interface EyeCardProps {
  eye: 'OD' | 'OE'
  title: string
  fields: Record<string, number>
  onFieldChange: (field: string, value: number) => void
}

function EyeCard({ eye, title, fields, onFieldChange }: EyeCardProps) {
  // Só mostra campos que existem no FIELD_META (ignora campos internos sem metadata)
  const criticalFields = Object.entries(fields).filter(([k]) => FIELD_META[k]?.critical)
  const otherFields = Object.entries(fields).filter(([k]) => FIELD_META[k] && !FIELD_META[k].critical)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 ${eye === 'OD' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">{title}</h3>
            <p className="text-blue-100 text-sm">{eye === 'OD' ? 'Olho Direito' : 'Olho Esquerdo'}</p>
          </div>
          <div className="text-3xl opacity-80">{eye === 'OD' ? '👁️' : '👁️'}</div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {/* Critical fields */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campos críticos para cálculo</p>
          {criticalFields.map(([key, value]) => {
            const meta = FIELD_META[key]
            const outOfRange = isOutOfRange(key, value)
            return (
              <div key={key} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${outOfRange ? 'border-red-200 bg-red-50' : 'border-blue-100 bg-blue-50'}`}>
                <div className="w-12">
                  <span className="text-sm font-bold text-gray-700">{meta?.label ?? key}</span>
                  <span className="block text-xs text-gray-400">{meta?.unit}</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={value ?? ''}
                  onChange={(e) => onFieldChange(key, parseFloat(e.currentTarget.value) || 0)}
                  className={`flex-1 text-right font-mono font-semibold text-gray-900 bg-transparent border-0 outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded-lg focus:px-2 transition-all text-base ${outOfRange ? 'text-red-600' : ''}`}
                />
                {outOfRange && <span className="text-red-400 text-xs">⚠️</span>}
              </div>
            )
          })}
        </div>

        {/* Other fields */}
        {otherFields.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dados adicionais</p>
            {otherFields.map(([key, value]) => {
              const meta = FIELD_META[key]
              return (
                <div key={key} className="flex items-center gap-3 rounded-xl px-4 py-2.5 border border-slate-100 bg-slate-50">
                  <div className="w-20">
                    <span className="text-sm font-medium text-gray-600">{meta?.label ?? key}</span>
                    <span className="block text-xs text-gray-400">{meta?.unit}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={value ?? ''}
                    onChange={(e) => onFieldChange(key, parseFloat(e.currentTarget.value) || 0)}
                    className="flex-1 text-right font-mono text-gray-700 bg-transparent border-0 outline-none focus:bg-white focus:border focus:border-slate-300 focus:rounded-lg focus:px-2 transition-all"
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ValidatePage() {
  const router = useRouter()
  const { biometry, meta, clearBiometry, updateODField, updateOEField } = useBiometryStore()
  const isManualEntry = meta?.examType === 'manual'
  const [isConfirming, setIsConfirming] = useState(false)

  if (!biometry || !meta) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhuma biometria carregada</h2>
        <p className="text-gray-500 mb-6">Envie um arquivo de exame para continuar.</p>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          Ir para upload
        </button>
      </div>
    )
  }

  const fileSizeKB = meta.fileSize ? (meta.fileSize / 1024).toFixed(1) : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* File info card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-xl flex items-center justify-center text-2xl">
              📄
            </div>
            <div>
              <p className="font-semibold text-gray-900">{meta.filename}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                {fileSizeKB && <span>{fileSizeKB} KB</span>}
                {meta.fileType && <><span>·</span><span className="uppercase">{meta.fileType.split('/')[1]}</span></>}
                {meta.equipment && <><span>·</span><span>{meta.equipment}</span></>}
                {meta.examType && meta.examType !== 'standard' && (
                  <><span>·</span><span className="capitalize text-blue-600 font-medium">{meta.examType}</span></>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isManualEntry ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">
                ✏️ Entrada manual
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
                <span>✓</span> Extraído automaticamente
              </div>
            )}
            <button
              onClick={() => { clearBiometry(); router.push('/') }}
              className="text-sm text-gray-500 hover:text-gray-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Trocar
            </button>
          </div>
        </div>
      </div>

      {/* Patient name (if detected) */}
      {meta.patientName && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-slate-400">👤</span>
          <span className="text-sm text-slate-700">
            <span className="font-medium">Paciente:</span> {meta.patientName}
          </span>
        </div>
      )}

      {/* Manual entry warning */}
      {isManualEntry && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-lg mt-0.5">✏️</span>
          <div className="text-sm">
            <span className="font-semibold text-amber-800">Insira os dados manualmente.</span>
            <span className="text-amber-700"> Imagens (JPG/PNG) não suportam extração automática de texto. Preencha os campos abaixo com os valores do laudo.</span>
          </div>
        </div>
      )}

      {/* Info strip */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-start gap-3">
        <span className="text-blue-500 text-lg mt-0.5">💡</span>
        <div className="text-sm">
          <span className="font-semibold text-blue-800">Verifique os campos críticos:</span>
          <span className="text-blue-700"> K1, K2, AL e ACD determinam a potência do LIO. Corrija qualquer valor fora do esperado antes de calcular.</span>
        </div>
      </div>

      {/* Eye cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EyeCard
          eye="OD"
          title="OD — Olho Direito"
          fields={biometry.OD}
          onFieldChange={(field, value) => updateODField(field as keyof typeof biometry.OD, value)}
        />
        <EyeCard
          eye="OE"
          title="OE — Olho Esquerdo"
          fields={biometry.OE}
          onFieldChange={(field, value) => updateOEField(field as keyof typeof biometry.OE, value)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => { clearBiometry(); router.push('/') }}
          className="px-5 py-3 border border-slate-200 text-gray-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
        >
          ← Voltar
        </button>
        <button
          onClick={async () => {
            setIsConfirming(true)
            await new Promise((r) => setTimeout(r, 400))
            router.push('/calculators')
          }}
          disabled={isConfirming}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isConfirming ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Confirmando...
            </>
          ) : (
            <>Confirmar e selecionar calculadoras →</>
          )}
        </button>
      </div>
    </div>
  )
}
