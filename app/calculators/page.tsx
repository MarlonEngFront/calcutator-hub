'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBiometryStore, type ParsedBiometry, type SurgeryParams } from '@/app/stores/biometry-store'
import { IOL_CATALOG } from '@/app/lib/iol-catalog'
import {
  getManufacturers,
  getLensesByManufacturer,
  getLensesForCalculator,
  matchLensToCalc,
  type CalcLens,
} from '@/app/lib/calculator-lens-catalogs'
import {
  calculateSingle,
  calculateBundle,
  type GatewayEye,
  type GatewayLens,
} from '@/app/lib/gateway-client'
import type { IOL } from '@/app/lib/iol-catalog'


// ── Gateway helpers (client-side, same logic as former /api/calculate route) ──

function buildEye(
  eye: ParsedBiometry['OD'],
  surgery: SurgeryParams,
  eyeKey: 'OD' | 'OE',
): GatewayEye {
  const eyeSurgery = surgery[eyeKey]
  return {
    biometry: { AL: eye.AL, ACD: eye.ACD, LT: eye.LT ?? 4.5, WTW: eye.WTW, CCT: eye.CCT, method: 'custom_a' },
    keratometry: { selected: 'anterior', K1: eye.K1, K2: eye.K2, K1Axis: eye.K1Axis, K2Axis: eye.K2Axis, Cyl: eye.Cyl, Axis: eye.Axis },
    surgery: { SIA: surgery.SIA, SIAAxis: surgery.SIAAxis, refTarget: eyeSurgery.refTarget, incisionLocation: 180 },
    calculatorPreferences: { seIOLPower: eyeSurgery.seIOLPower, kIndex: '1.3375', cylinderConvention: 'plus', includePCA: true },
  }
}

function buildLens(iol: IOL): GatewayLens {
  return {
    id: iol.id,
    brand: iol.manufacturer,
    family: iol.model,
    a_constant: iol.aConstant ?? 119.0,
    toric_available: iol.type === 'toric' || iol.type === 'multifocal-toric',
    code: iol.manufacturerCode,
    classification: iol.type,
  }
}

const CALCULATORS = [
  {
    id: 'tecnis-toric',
    name: 'TECNIS Toric Calculator',
    org: 'Johnson & Johnson',
    url: 'https://www.tecnistoriccalc.com/pt/calculator/',
    description: 'Calculadora oficial para LIOs TECNIS. Cobre modelos tóricos, multifocais, EDOF e Eyhance.',
    status: 'available' as const,
    tags: ['Tórica', 'Multifocal', 'EDOF', 'Eyhance'],
    logoText: 'J&J', logoBg: 'bg-red-600', time: '~10-15s',
  },
  {
    id: 'apacrs-true-k-toric',
    name: 'True K Toric (APACRS)',
    org: 'APACRS',
    url: 'https://calc.apacrs.org/TrueKToricTK_preview/TrueKToricTK.aspx',
    description: 'Calculadora tórica pós-LASIK. Usa método True K para córneas operadas.',
    status: 'available' as const,
    tags: ['Pós-LASIK', 'Tórica', 'True K'],
    logoText: 'APC', logoBg: 'bg-teal-700', time: '~10-15s',
  },
  {
    id: 'apacrs-toric',
    name: 'Toric Calculator (APACRS)',
    org: 'APACRS',
    url: 'https://calc.apacrs.org/toric_calculator20/Toric%20Calculator.aspx',
    description: 'Barrett Toric V2.0 — calculadora tórica geral da APACRS. Multi-fabricante.',
    status: 'available' as const,
    tags: ['Tórica', 'Barrett', 'Multi-fabricante'],
    logoText: 'APC', logoBg: 'bg-teal-700', time: '~10-15s',
  },
  {
    id: 'brascrs-double-k',
    name: 'Double K (BRASCRS)',
    org: 'BRASCRS',
    url: 'https://brascrs.com.br/area-do-associado/central-de-calculadoras-brascrs/double-k',
    description: 'Método Aramberri Double-K para olhos pós-LASIK. SRK/T, Holladay 1, Hoffer Q, Haigis.',
    status: 'available' as const,
    tags: ['Pós-LASIK', 'Double K', 'SRK/T', 'Haigis'],
    logoText: 'BRS', logoBg: 'bg-green-700', time: '~2-3s',
  },
  {
    id: 'brascrs-multiformula',
    name: 'Multifórmula (BRASCRS)',
    org: 'BRASCRS',
    url: 'https://brascrs.com.br/area-do-associado/central-de-calculadoras-brascrs/multiformula-brascrs',
    description: 'SRK/T, Holladay 1, Hoffer Q e Haigis em paralelo. Modo Wang-Koch disponível.',
    status: 'available' as const,
    tags: ['SRK/T', 'Haigis', 'Holladay', 'Hoffer Q'],
    logoText: 'BRS', logoBg: 'bg-green-700', time: '~2-3s',
  },
  {
    id: 'escrs',
    name: 'ESCRS IOL Calculator',
    org: 'ESCRS',
    url: 'https://iolcalculator.escrs.org/',
    description: 'Hill-RBF, Hoffer®QST, Kane e mais — reCAPTCHA resolvido automaticamente via 2captcha.',
    status: 'available' as const,
    tags: ['Hill-RBF', 'Hoffer', 'Kane'],
    logoText: 'ESC', logoBg: 'bg-blue-700', time: '~2-3min',
  },
]

// ─── Lens Picker Panel ────────────────────────────────────────────────────────
interface LensPickerPanelProps {
  selectedLenses: CalcLens[]
  onChange: (lenses: CalcLens[]) => void
}

function LensPickerPanel({ selectedLenses, onChange }: LensPickerPanelProps) {
  const [activeMfr, setActiveMfr] = useState<string>('')
  const manufacturers = getManufacturers()
  const lensesForMfr = activeMfr ? getLensesByManufacturer(activeMfr) : []

  const toggle = (lens: CalcLens) => {
    const idx = selectedLenses.findIndex((l) => l.code === lens.code)
    if (idx >= 0) {
      onChange(selectedLenses.filter((_, i) => i !== idx))
    } else if (selectedLenses.length < 3) {
      onChange([...selectedLenses, lens])
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-gray-900">1. Lentes para calcular</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Selecione o fabricante → escolha até 3 LIOs para comparar
        </p>
      </div>

      {/* Selected lens chips */}
      {selectedLenses.length > 0 && (
        <div className="px-6 pt-4 flex flex-wrap gap-2">
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
      )}

      <div className="p-6 space-y-4">
        {/* Manufacturer pills */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fabricante</p>
          <div className="flex flex-wrap gap-2">
            {manufacturers.map((mfr) => (
              <button
                key={mfr}
                onClick={() => setActiveMfr(mfr === activeMfr ? '' : mfr)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
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

        {/* IOL grid for selected manufacturer */}
        {activeMfr && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              LIO — {activeMfr}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {lensesForMfr.map((lens) => {
                const isSelected = selectedLenses.some((l) => l.code === lens.code)
                const disabled = !isSelected && selectedLenses.length >= 3
                return (
                  <button
                    key={lens.code}
                    onClick={() => toggle(lens)}
                    disabled={disabled}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200 shadow-sm'
                        : disabled
                        ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm cursor-pointer'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 text-sm">{lens.family}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{lens.label}</div>
                    {lens.aConstant != null && (
                      <div className="text-xs font-mono text-blue-600 mt-1.5">A = {lens.aConstant.toFixed(1)}</div>
                    )}
                    {isSelected && (
                      <div className="text-xs text-blue-600 font-semibold mt-1">✓ Selecionada</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {selectedLenses.length === 0 && !activeMfr && (
          <p className="text-sm text-gray-400 text-center py-3">
            Selecione um fabricante acima para ver as lentes disponíveis
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Surgery Params Panel ─────────────────────────────────────────────────────
function SurgeryPanel() {
  const {
    surgeryParams, setSurgeryParams,
    surgicalPresets, activeSurgicalPreset,
    setSurgicalPreset, selectSurgicalPreset, deleteSurgicalPreset,
  } = useBiometryStore()
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveName, setSaveName] = useState('')

  const presetNames = Object.keys(surgicalPresets)

  const handleSave = () => {
    const name = saveName.trim()
    if (!name) return
    setSurgicalPreset(name, surgeryParams)
    setSaveName('')
    setShowSaveInput(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold text-gray-900">2. Parâmetros Cirúrgicos</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              SE LIO e alvo refrativo por olho — obrigatório para TECNIS
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={activeSurgicalPreset}
              onChange={(e) => selectSurgicalPreset(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
            >
              {presetNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowSaveInput(true)}
              className="text-sm text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
            >
              Salvar como...
            </button>
            {presetNames.length > 1 && (
              <button
                onClick={() => deleteSurgicalPreset(activeSurgicalPreset)}
                className="text-sm text-red-400 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors"
                title="Excluir padrão atual"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {showSaveInput && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
          <input
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Ex: Padrão Tórica, Padrão EDOF..."
            className="flex-1 border border-blue-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
          >
            Salvar
          </button>
          <button
            onClick={() => { setShowSaveInput(false); setSaveName('') }}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* SIA global */}
        <div className="sm:col-span-2 flex gap-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SIA (D)</label>
            <input
              type="number" step="0.01" min="0" max="3"
              value={surgeryParams.SIA}
              onChange={(e) => setSurgeryParams({ SIA: parseFloat(e.target.value) || 0 })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Eixo SIA (°)</label>
            <input
              type="number" step="1" min="0" max="180"
              value={surgeryParams.SIAAxis}
              onChange={(e) => setSurgeryParams({ SIAAxis: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* OD */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-blue-700 border-b border-blue-100 pb-1">OD — Olho Direito</div>
          <div>
            <label className="text-xs font-medium text-gray-500">SE LIO estimado (D)</label>
            <input
              type="number" step="0.5" min="0" max="50"
              value={surgeryParams.OD.seIOLPower}
              onChange={(e) => setSurgeryParams({ OD: { ...surgeryParams.OD, seIOLPower: parseFloat(e.target.value) || 0 } })}
              className="mt-1 w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Alvo refrativo (D)</label>
            <input
              type="number" step="0.25" min="-5" max="2"
              value={surgeryParams.OD.refTarget}
              onChange={(e) => setSurgeryParams({ OD: { ...surgeryParams.OD, refTarget: parseFloat(e.target.value) || 0 } })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* OE */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-indigo-700 border-b border-indigo-100 pb-1">OE — Olho Esquerdo</div>
          <div>
            <label className="text-xs font-medium text-gray-500">SE LIO estimado (D)</label>
            <input
              type="number" step="0.5" min="0" max="50"
              value={surgeryParams.OE.seIOLPower}
              onChange={(e) => setSurgeryParams({ OE: { ...surgeryParams.OE, seIOLPower: parseFloat(e.target.value) || 0 } })}
              className="mt-1 w-full border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Alvo refrativo (D)</label>
            <input
              type="number" step="0.25" min="-5" max="2"
              value={surgeryParams.OE.refTarget}
              onChange={(e) => setSurgeryParams({ OE: { ...surgeryParams.OE, refTarget: parseFloat(e.target.value) || 0 } })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CalculatorsPage() {
  const router = useRouter()
  const { biometry, meta, surgeryParams, setCalculationResults } = useBiometryStore()
  const [selectedLenses, setSelectedLenses] = useState<CalcLens[]>([])
  const [selectedCalcs, setSelectedCalcs] = useState<Set<string>>(new Set())
  const [isCalculating, setIsCalculating] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)

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

  const available = CALCULATORS.filter((c) => c.status === 'available')

  const toggle = (id: string) => {
    if (!available.find((c) => c.id === id)) return
    setSelectedCalcs((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedAvailable = [...selectedCalcs].filter((id) => available.find((c) => c.id === id))
  const selectedGateway = selectedAvailable // todas as calculadoras vão via gateway agora

  const canCalculate = selectedLenses.length > 0 && selectedGateway.length > 0

  // ── Compatibility warnings (lens not in calculator catalog) ──────────────────
  const compatibilityWarnings: Array<{ calcId: string; calcName: string; suggestions: string }> = []
  if (selectedLenses.length > 0 && selectedGateway.length > 0) {
    const primary = selectedLenses[0]
    for (const calcId of selectedGateway) {
      const matched = matchLensToCalc(calcId, primary)
      if (!matched) {
        const catalog = getLensesForCalculator(calcId)
        const suggestions = catalog.length > 0
          ? catalog.slice(0, 5).map((l) => l.family).join(', ')
          : '—'
        const calcName = CALCULATORS.find((c) => c.id === calcId)?.name ?? calcId
        compatibilityWarnings.push({ calcId, calcName, suggestions })
      }
    }
  }

  const handleCalculate = async () => {
    if (!canCalculate) return
    setIsCalculating(true)
    setCalcError(null)

    try {
      const eyes = { OD: buildEye(biometry.OD, surgeryParams, 'OD'), OE: buildEye(biometry.OE, surgeryParams, 'OE') }

      // ── Run one request per selected lens (up to 3), in parallel ──────────────
      // Use allSettled so a single lens failure doesn't discard other results
      const settled = await Promise.allSettled(
        selectedLenses.map(async (pickedLens, lensIdx) => {
          const iol =
            IOL_CATALOG.find((i) => i.manufacturerCode === pickedLens.code) ?? {
              id: pickedLens.code,
              model: pickedLens.family,
              manufacturer: pickedLens.manufacturer,
              manufacturerCode: pickedLens.code,
              type: 'toric' as const,
              aConstant: pickedLens.aConstant ?? 119.1,
            }

          // Per-calculator lens overrides (catalog-matched constants)
          const lensOverrides = Object.fromEntries(
            selectedGateway.map((calcId) => {
              const matched = matchLensToCalc(calcId, pickedLens) ?? pickedLens
              return [
                calcId,
                {
                  id: matched.code,
                  brand: matched.manufacturer,
                  family: matched.family,
                  a_constant: matched.aConstant ?? 119.1,
                  toric_available: matched.haigisA0 == null,
                  code: matched.code,
                  ...(matched.haigisA0 != null
                    ? { haigisA0: matched.haigisA0, haigisA1: matched.haigisA1, haigisA2: matched.haigisA2 }
                    : {}),
                },
              ]
            })
          )

          const requestId = `voiston-hub-${Date.now()}-${lensIdx}`
          const lens = buildLens(iol)
          const base = {
            requestId,
            source: { app: 'calculator-hub', environment: 'unknown' as const },
            patient: { isDemoData: meta.filename === 'demo-biometry.json' },
            lens,
            ...(Object.keys(lensOverrides).length > 0 ? { lensOverrides } : {}),
            eyes,
          }

          let data
          if (selectedGateway.length > 1) {
            data = await calculateBundle({ ...base, calculators: selectedGateway.map((id) => ({ id })) })
          } else {
            const single = await calculateSingle({ ...base, calculator: { id: selectedGateway[0] } })
            data = {
              bundleId: requestId,
              status: single.status,
              results: { [selectedGateway[0]]: single },
              audit: { executedAt: single.audit.executedAt, durationMs: 0, method: single.audit.method, notes: single.audit.notes },
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entries = Object.entries(data.results as Record<string, any>)
          if (entries.length === 0) {
            // Gateway returned empty results — create a failed placeholder so UI shows feedback
            return [{
              requestId,
              calculatorId: selectedGateway[0] ?? 'unknown',
              calculatorLabel: selectedGateway[0] ?? 'Calculadora',
              lensCode: pickedLens.code,
              lensFamily: pickedLens.family,
              lensAConstant: pickedLens.aConstant,
              status: 'failed' as const,
              results: [],
              audit: { executedAt: new Date().toISOString(), method: 'gateway', notes: ['Nenhum resultado retornado'] },
            }]
          }

          return entries.map(([id, r]) => ({
            requestId: r?.requestId ?? requestId,
            calculatorId: id,
            calculatorLabel: r?.calculator?.label ?? id,
            lensCode: pickedLens.code,
            lensFamily: pickedLens.family,
            lensAConstant: pickedLens.aConstant,
            status: r?.status ?? 'failed',
            results: r?.results ?? [],
            audit: r?.audit ?? { executedAt: new Date().toISOString(), method: '', notes: [] },
            ...(r?.status === 'failed' ? { error: r?.audit?.notes?.join(' ') ?? 'Falhou' } : {}),
          }))
        })
      )

      // Collect successful results + synthetic failed entries for rejected promises
      const allResults = settled.flatMap((s, i) => {
        if (s.status === 'fulfilled') return s.value
        const lens = selectedLenses[i]
        // Failed lens request — create placeholder so user sees the error in results page
        return selectedGateway.map((calcId) => ({
          requestId: `voiston-hub-err-${Date.now()}-${i}`,
          calculatorId: calcId,
          calculatorLabel: calcId,
          lensCode: lens?.code,
          lensFamily: lens?.family,
          lensAConstant: lens?.aConstant,
          status: 'failed' as const,
          results: [],
          audit: { executedAt: new Date().toISOString(), method: 'gateway', notes: [] },
          error: s.reason instanceof Error ? s.reason.message : 'Erro ao calcular',
        }))
      })

      if (allResults.length === 0) {
        setCalcError('Nenhum resultado retornado pelo gateway. Verifique as seleções.')
        setIsCalculating(false)
        return
      }

      setCalculationResults(allResults)
      router.push('/results')
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : 'Erro ao calcular')
      setIsCalculating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurar Cálculo</h1>
        <p className="text-gray-500 mt-1">
          Selecione as lentes, configure os parâmetros cirúrgicos e escolha as calculadoras
        </p>
      </div>

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

      {/* 1. Lens picker */}
      <LensPickerPanel selectedLenses={selectedLenses} onChange={setSelectedLenses} />

      {/* 2. Surgery params */}
      <SurgeryPanel />

      {/* 3. Calculator selection */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          3. Calculadoras · {selectedAvailable.length} selecionada{selectedAvailable.length !== 1 ? 's' : ''}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CALCULATORS.map((calc) => {
            const isSelected = selectedCalcs.has(calc.id)
            const isAvailable = calc.status === 'available'
            return (
              <button
                key={calc.id}
                onClick={() => toggle(calc.id)}
                disabled={!isAvailable}
                className={`text-left rounded-2xl border p-5 transition-all ${
                  !isAvailable
                    ? 'border-slate-100 bg-slate-50 opacity-55 cursor-not-allowed'
                    : isSelected
                    ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200 shadow-md'
                    : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${calc.logoBg} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                  >
                    {calc.logoText}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        isAvailable
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {isAvailable ? '✓ Disponível' : 'Em breve'}
                    </span>
                    {isAvailable && (
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-400 mb-0.5">{calc.org}</p>
                <h3 className="font-semibold text-gray-900 mb-1 text-sm leading-snug">{calc.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{calc.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {calc.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  {isAvailable && <span>⏱ {calc.time}</span>}
                  <a
                    href={calc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-500 hover:underline ml-auto"
                  >
                    ↗ Site
                  </a>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {calcError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-start gap-3 text-sm text-red-800">
          <span>⚠️</span>
          <div>
            <strong>Erro no cálculo:</strong> {calcError}
          </div>
        </div>
      )}

      {/* Compatibility warnings */}
      {compatibilityWarnings.map(({ calcId, calcName, suggestions }) => (
        <div
          key={calcId}
          className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex items-start gap-3 text-sm"
        >
          <span className="text-amber-500 text-lg shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="font-semibold text-amber-900">
              Lente <span className="font-mono">{selectedLenses[0]?.family}</span> não está no catálogo de{' '}
              <span className="font-semibold">{calcName}</span>
            </p>
            <p className="text-amber-700 mt-0.5">
              O cálculo será tentado mas provavelmente falhará. Lentes compatíveis:{' '}
              <span className="font-mono font-semibold">{suggestions}</span>
            </p>
          </div>
        </div>
      ))}

      {/* Hints */}
      {selectedLenses.length === 0 && selectedAvailable.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800">
          ⚠️ Selecione ao menos uma lente no passo 1 para calcular.
        </div>
      )}

      {/* Slow-calc warning: multiple lenses × multiple calculators */}
      {selectedLenses.length > 1 && selectedGateway.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-sm text-blue-800 flex items-start gap-2">
          <span className="shrink-0">🕐</span>
          <span>
            <strong>{selectedLenses.length} lentes × {selectedGateway.length} calculadora{selectedGateway.length > 1 ? 's' : ''}</strong>
            {' '}— cálculos rodam em paralelo por lente.
            {selectedGateway.some((id) => ['escrs', 'jj-tecnis', 'apacrs-true-k', 'apacrs-toric'].includes(id))
              ? ' Calculadoras com captura de tela (~10-15s cada) podem aumentar o tempo total.'
              : ' Estimativa: ~2-5s por lente.'}
          </span>
        </div>
      )}
      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => router.push('/validate')}
          className="px-5 py-3 border border-slate-200 text-gray-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
        >
          ← Voltar
        </button>
        <button
          disabled={!canCalculate || isCalculating}
          onClick={handleCalculate}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isCalculating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Calculando via gateway...
            </>
          ) : selectedLenses.length === 0 ? (
            'Selecione ao menos uma lente (passo 1)'
          ) : selectedAvailable.length === 0 ? (
            'Selecione ao menos uma calculadora (passo 3)'
          ) : selectedGateway.length === 0 ? (
            'Nenhuma calculadora automática selecionada'
          ) : (
            `🔬 Calcular · ${selectedLenses.length} lente${selectedLenses.length > 1 ? 's' : ''} · ${selectedGateway.length} calculadora${selectedGateway.length > 1 ? 's' : ''} →`
          )}
        </button>
      </div>
    </div>
  )
}
