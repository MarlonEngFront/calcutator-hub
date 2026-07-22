'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBiometryStore } from '@/app/stores/biometry-store'
import {
  getManufacturers,
  getLensesByManufacturer,
  type CalcLens,
} from '@/app/lib/calculator-lens-catalogs'
import { isToricLensCode } from '@/app/lib/astigmatism'
import ToricIndicationBanner from '@/app/components/ToricIndicationBanner'

export default function SelecaoLentesPage() {
  const router = useRouter()
  const { biometry, meta, selectedLenses, setSelectedLenses } = useBiometryStore()
  const [activeMfr, setActiveMfr] = useState<string>('')

  const manufacturers = getManufacturers()
  const lensesForMfr  = activeMfr ? getLensesByManufacturer(activeMfr) : []

  if (!biometry || !meta) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhuma biometria carregada</h2>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
        >
          Ir para upload
        </button>
      </div>
    )
  }

  const toggle = (lens: CalcLens) => {
    const idx = selectedLenses.findIndex((l) => l.code === lens.code)
    if (idx >= 0) {
      setSelectedLenses(selectedLenses.filter((_, i) => i !== idx))
    } else if (selectedLenses.length < 3) {
      setSelectedLenses([...selectedLenses, lens])
    }
  }

  const canProceed = selectedLenses.length > 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Selecionar Lentes</h1>
        <p className="text-gray-500 mt-1">
          Escolha até 3 LIOs para comparar — uma lente por fabricante ou múltiplas
        </p>
      </div>

      {/* Indicação de LIO tórica */}
      <ToricIndicationBanner od={biometry.OD} oe={biometry.OE} />

      {/* Biometry summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Biometria</p>
            <p className="font-semibold text-gray-900">{meta.filename}</p>
          </div>
          {(['K1', 'K2', 'AL', 'ACD'] as const).map((field) => (
            <div key={field} className="text-center">
              <div className="font-mono font-bold text-gray-900">{biometry.OD[field]}</div>
              <div className="text-xs text-gray-400">{field} OD</div>
            </div>
          ))}
          <button
            onClick={() => router.push('/validate')}
            className="ml-auto text-sm text-blue-600 hover:underline"
          >
            ← Editar
          </button>
        </div>
      </div>

      {/* Main lens picker card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Selected chips */}
        {selectedLenses.length > 0 && (
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {selectedLenses.length} lente{selectedLenses.length > 1 ? 's' : ''} selecionada{selectedLenses.length > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedLenses.map((lens, i) => (
                <span
                  key={lens.code}
                  className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 text-sm"
                >
                  <span className="text-blue-400 font-bold text-xs">{i + 1}</span>
                  <span className="font-semibold text-blue-800">{lens.family}</span>
                  <span className="text-blue-500 text-xs">{lens.manufacturer}</span>
                  {lens.aConstant != null && (
                    <span className="text-blue-400 font-mono text-xs">A={lens.aConstant}</span>
                  )}
                  <button
                    onClick={() => toggle(lens)}
                    className="text-blue-300 hover:text-red-500 ml-0.5 leading-none font-bold transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedLenses.length < 3 && (
                <span className="inline-flex items-center border border-dashed border-slate-300 rounded-full px-3 py-1.5 text-xs text-slate-400">
                  + até {3 - selectedLenses.length} mais
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Manufacturer pills */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Fabricante</p>
            <div className="flex flex-wrap gap-2">
              {manufacturers.map((mfr) => (
                <button
                  key={mfr}
                  onClick={() => setActiveMfr(mfr === activeMfr ? '' : mfr)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    activeMfr === mfr
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-700 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  {mfr}
                </button>
              ))}
            </div>
          </div>

          {/* IOL grid */}
          {activeMfr && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                LIO — {activeMfr}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lensesForMfr.map((lens) => {
                  const isSelected = selectedLenses.some((l) => l.code === lens.code)
                  const disabled   = !isSelected && selectedLenses.length >= 3
                  const isToric    = isToricLensCode(lens.code)
                  return (
                    <button
                      key={lens.code}
                      onClick={() => toggle(lens)}
                      disabled={disabled}
                      className={`text-left px-4 py-4 rounded-xl border text-sm transition-all ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200 shadow-sm'
                          : disabled
                          ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{lens.family}</span>
                        {isToric && (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            Tórica
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{lens.label}</div>
                      {lens.aConstant != null && (
                        <div className="text-xs font-mono text-blue-600 mt-2">A = {lens.aConstant.toFixed(1)}</div>
                      )}
                      {isSelected && (
                        <div className="text-xs text-blue-600 font-semibold mt-1.5">✓ Selecionada</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selectedLenses.length === 0 && !activeMfr && (
            <p className="text-sm text-gray-400 text-center py-6">
              Selecione um fabricante acima para ver as lentes disponíveis
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => router.push('/validate')}
          className="px-5 py-3 border border-slate-200 text-gray-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
        >
          ← Voltar
        </button>
        <button
          disabled={!canProceed}
          onClick={() => router.push('/calculators')}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {canProceed
            ? `Ir para calculadoras · ${selectedLenses.length} lente${selectedLenses.length > 1 ? 's' : ''} →`
            : 'Selecione ao menos uma lente'}
        </button>
      </div>
    </div>
  )
}
