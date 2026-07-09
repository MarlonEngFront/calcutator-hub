'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logHubEvent } from '@/app/lib/analytics'
import { useBiometryStore, type ParsedBiometry, type SurgeryParams } from '@/app/stores/biometry-store'
import { IOL_CATALOG } from '@/app/lib/iol-catalog'
import {
  getLensesForCalculator,
  matchLensToCalc,
} from '@/app/lib/calculator-lens-catalogs'
import {
  calculateSingle,
  calculateBundle,
  type GatewayEye,
  type GatewayLens,
} from '@/app/lib/gateway-client'
import type { IOL } from '@/app/lib/iol-catalog'


// ── Gateway helpers ────────────────────────────────────────────────────────────

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

// Short label for progress steps
const CALC_SHORT: Record<string, string> = {
  'tecnis-toric':          'TECNIS',
  'apacrs-true-k-toric':  'True K',
  'apacrs-toric':          'Barrett',
  'escrs':                 'ESCRS',
  'brascrs-double-k':      'Double K',
  'brascrs-multiformula':  'Multiform.',
}

const BUNDLE_MAX = 4

// Calculadoras http-api (BRASCRS) não usam Playwright — sem browser, sem custo de CPU.
// As demais (TECNIS, APACRS, ESCRS) rodam via Playwright headless, compartilhando um
// Chromium por chamada de bundle no gateway (2 vCPU/instância) — agrupar muitas delas
// numa chamada só gera disputa de CPU e piora a latência total. Mantemos grupos menores
// pra essas, o que também deixa o Cloud Run escalar horizontalmente entre instâncias.
const HTTP_API_CALC_IDS = new Set(['brascrs-double-k', 'brascrs-multiformula'])
const PLAYWRIGHT_BUNDLE_MAX = 2

function chunkSelectedCalcs(selectedGateway: string[]): string[][] {
  const httpApiIds   = selectedGateway.filter((id) => HTTP_API_CALC_IDS.has(id))
  const playwrightIds = selectedGateway.filter((id) => !HTTP_API_CALC_IDS.has(id))

  const chunks: string[][] = []
  for (let i = 0; i < httpApiIds.length; i += BUNDLE_MAX) {
    chunks.push(httpApiIds.slice(i, i + BUNDLE_MAX))
  }
  for (let i = 0; i < playwrightIds.length; i += PLAYWRIGHT_BUNDLE_MAX) {
    chunks.push(playwrightIds.slice(i, i + PLAYWRIGHT_BUNDLE_MAX))
  }
  return chunks
}

// ── Calc step type ─────────────────────────────────────────────────────────────
type CalcStepStatus = 'pending' | 'running' | 'done' | 'error'
interface CalcStep {
  id: string
  label: string
  status: CalcStepStatus
}

// ── Progress Modal ─────────────────────────────────────────────────────────────
function CalcProgressModal({ steps }: { steps: CalcStep[] }) {
  const total = steps.length
  const done  = steps.filter((s) => s.status === 'done' || s.status === 'error').length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
            <h2 className="text-white font-bold text-lg">Calculando via gateway...</h2>
          </div>
          {/* Progress bar */}
          <div className="mt-4 bg-white/20 rounded-full h-1.5">
            <div
              className="bg-white rounded-full h-1.5 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-white/60 text-xs mt-2">{done} de {total} etapas • {pct}%</p>
        </div>

        {/* Step list */}
        <div className="px-6 py-4 max-h-60 overflow-y-auto space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {step.status === 'done'    && <span className="w-4 text-green-500 text-sm shrink-0 leading-none">✓</span>}
              {step.status === 'error'   && <span className="w-4 text-red-500 text-sm shrink-0 leading-none">✗</span>}
              {step.status === 'running' && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              {step.status === 'pending' && (
                <span className="w-4 h-4 border-2 border-slate-200 rounded-full shrink-0 block" />
              )}
              <span className={`text-sm leading-snug ${
                step.status === 'done'    ? 'text-gray-400' :
                step.status === 'error'   ? 'text-red-600 font-medium' :
                step.status === 'running' ? 'text-gray-900 font-semibold' :
                                            'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Skeleton preview */}
        <div className="px-6 pb-6 border-t border-slate-100 pt-4">
          <p className="text-xs text-gray-400 mb-3">Preparando visualização dos resultados...</p>
          <div className="space-y-3 animate-pulse">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-xl bg-slate-100 p-4">
                <div className="h-2.5 bg-slate-200 rounded w-2/5 mb-3" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-14 bg-slate-200 rounded-lg" />
                  <div className="h-14 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Surgery Params Panel (collapsible) ───────────────────────────────────────
function SurgeryPanel({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const {
    surgeryParams, setSurgeryParams,
    surgicalPresets, activeSurgicalPreset,
    setSurgicalPreset, selectSurgicalPreset, deleteSurgicalPreset,
  } = useBiometryStore()
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveName, setSaveName] = useState('')

  const presetNames = Object.keys(surgicalPresets)

  const summary = `SIA ${surgeryParams.SIA}D • ${surgeryParams.SIAAxis}° • OD: ${
    surgeryParams.OD.refTarget >= 0 ? '+' : ''
  }${surgeryParams.OD.refTarget.toFixed(2)}D • OE: ${
    surgeryParams.OE.refTarget >= 0 ? '+' : ''
  }${surgeryParams.OE.refTarget.toFixed(2)}D`

  const handleSave = () => {
    const name = saveName.trim()
    if (!name) return
    setSurgicalPreset(name, surgeryParams)
    setSaveName('')
    setShowSaveInput(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-base">⚙️</span>
            <h3 className="font-semibold text-gray-900">Parâmetros Cirúrgicos</h3>
          </div>
          {collapsed && (
            <p className="text-xs text-gray-500 font-mono mt-1">{summary}</p>
          )}
        </div>
        <span className="text-slate-400 text-xs ml-4 shrink-0">
          {collapsed ? '▼ Expandir' : '▲ Recolher'}
        </span>
      </button>

      {!collapsed && (
        <>
          {/* Preset toolbar */}
          <div className="px-6 py-3 border-t border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-500">SE LIO e alvo refrativo por olho — obrigatório para TECNIS</p>
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
        </>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CalculatorsPage() {
  const router = useRouter()
  const { biometry, meta, surgeryParams, setCalculationResults, selectedLenses } = useBiometryStore()
  const [selectedCalcs, setSelectedCalcs]     = useState<Set<string>>(new Set())
  const [isCalculating, setIsCalculating]     = useState(false)
  const [calcError, setCalcError]             = useState<string | null>(null)
  const [isParamsOpen, setIsParamsOpen]       = useState(false)
  const [calcSteps, setCalcSteps]             = useState<CalcStep[]>([])
  const [showCalcModal, setShowCalcModal]     = useState(false)

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

  const available    = CALCULATORS.filter((c) => c.status === 'available')
  const allIds       = available.map((c) => c.id)
  const allSelected  = allIds.length > 0 && allIds.every((id) => selectedCalcs.has(id))

  const toggle = (id: string) => {
    if (!available.find((c) => c.id === id)) return
    setSelectedCalcs((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedCalcs(allSelected ? new Set() : new Set(allIds))
  }

  const selectedAvailable = [...selectedCalcs].filter((id) => available.find((c) => c.id === id))
  const selectedGateway   = selectedAvailable
  const canCalculate      = selectedLenses.length > 0 && selectedGateway.length > 0

  // Compatibility warnings
  const compatibilityWarnings: Array<{ calcId: string; calcName: string; suggestions: string }> = []
  if (selectedLenses.length > 0 && selectedGateway.length > 0) {
    const primary = selectedLenses[0]
    for (const calcId of selectedGateway) {
      const matched = matchLensToCalc(calcId, primary)
      if (!matched) {
        const catalog     = getLensesForCalculator(calcId)
        const suggestions = catalog.length > 0 ? catalog.slice(0, 5).map((l) => l.family).join(', ') : '—'
        const calcName    = CALCULATORS.find((c) => c.id === calcId)?.name ?? calcId
        compatibilityWarnings.push({ calcId, calcName, suggestions })
      }
    }
  }

  const handleCalculate = async () => {
    if (!canCalculate) return

    // ── Pre-flight biometry validation ─────────────────────────────────────────
    const GATEWAY_RANGES: Record<string, [number, number]> = {
      AL:  [14, 38], K1: [25, 65], K2: [25, 65],
      ACD: [0.5, 8], WTW: [5, 17], LT: [1, 10],
    }
    const fieldLabels: Record<string, string> = {
      AL: 'Comprimento Axial', K1: 'K1', K2: 'K2',
      ACD: 'ACD', WTW: 'WTW', LT: 'LT',
    }
    const invalidFields: string[] = []
    for (const eye of ['OD', 'OE'] as const) {
      for (const [field, [min, max]] of Object.entries(GATEWAY_RANGES)) {
        const val = biometry[eye][field as keyof ParsedBiometry['OD']] as number | undefined
        if (val == null || val < min || val > max) {
          invalidFields.push(`${eye} ${fieldLabels[field]} = ${val ?? '—'} (esperado ${min}–${max})`)
        }
      }
    }
    if (invalidFields.length > 0) {
      logHubEvent('hub_validacao_preflight_erro', { n_campos: invalidFields.length })
      setCalcError(`Campos fora do range aceito pelo gateway — volte e corrija:\n• ${invalidFields.join('\n• ')}`)
      return
    }

    // ── Build progress steps ────────────────────────────────────────────────────
    const initialSteps: CalcStep[] = [
      { id: 'validate', label: 'Validando biometria', status: 'done' },
      { id: 'prepare',  label: 'Preparando parâmetros', status: 'done' },
    ]
    selectedLenses.forEach((lens, li) => {
      chunkSelectedCalcs(selectedGateway).forEach((chunk, ci) => {
        const names = chunk.map((id) => CALC_SHORT[id] ?? id).join(', ')
        initialSteps.push({ id: `lens-${li}-chunk-${ci}`, label: `${lens.family} · ${names}`, status: 'pending' })
      })
    })
    initialSteps.push({ id: 'finalize', label: 'Processando resultados', status: 'pending' })

    setCalcSteps(initialSteps)
    setShowCalcModal(true)
    setIsCalculating(true)
    setCalcError(null)

    logHubEvent('hub_calculo_iniciado', {
      n_lentes: selectedLenses.length,
      n_calculadoras: selectedGateway.length,
    })

    const updateStep = (id: string, status: CalcStepStatus) => {
      setCalcSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
    }

    try {
      const eyes = {
        OD: buildEye(biometry.OD, surgeryParams, 'OD'),
        OE: buildEye(biometry.OE, surgeryParams, 'OE'),
      }

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
          const lens      = buildLens(iol)
          const base      = {
            requestId,
            source:  { app: 'calculator-hub', environment: 'unknown' as const },
            patient: { isDemoData: meta.filename === 'demo-biometry.json' },
            lens,
            ...(Object.keys(lensOverrides).length > 0 ? { lensOverrides } : {}),
            eyes,
          }

          // Chunk calcs — http-api (BRASCRS) agrupadas até o max do gateway; Playwright
          // (TECNIS/APACRS/ESCRS) em grupos menores pra reduzir disputa de CPU no bundle.
          const calcChunks = chunkSelectedCalcs(selectedGateway)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const chunkResults = await Promise.all(
            calcChunks.map(async (chunk, chunkIdx) => {
              const stepId = `lens-${lensIdx}-chunk-${chunkIdx}`
              updateStep(stepId, 'running')
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let result: Record<string, any>
                if (chunk.length === 1) {
                  const single = await calculateSingle({ ...base, calculator: { id: chunk[0] } })
                  result = { [chunk[0]]: single }
                } else {
                  const bundle = await calculateBundle({ ...base, calculators: chunk.map((id) => ({ id })) })
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  result = bundle.results as Record<string, any>
                }
                updateStep(stepId, 'done')
                return result
              } catch (e) {
                updateStep(stepId, 'error')
                throw e
              }
            })
          )

          const mergedResults = Object.assign({}, ...chunkResults)
          const data = {
            bundleId: requestId,
            status:   'success',
            results:  mergedResults,
            audit:    { executedAt: new Date().toISOString(), durationMs: 0, method: 'gateway', notes: [] as string[] },
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entries = Object.entries(data.results as Record<string, any>)
          if (entries.length === 0) {
            return [{
              requestId,
              calculatorId:    selectedGateway[0] ?? 'unknown',
              calculatorLabel: selectedGateway[0] ?? 'Calculadora',
              lensCode:        pickedLens.code,
              lensFamily:      pickedLens.family,
              lensBrand:       pickedLens.manufacturer,
              lensAConstant:   pickedLens.aConstant,
              status:          'failed' as const,
              results:         [],
              audit:           { executedAt: new Date().toISOString(), method: 'gateway', notes: ['Nenhum resultado retornado'] },
            }]
          }

          return entries.map(([id, r]) => ({
            requestId:       r?.requestId ?? requestId,
            calculatorId:    id,
            calculatorLabel: r?.calculator?.label ?? id,
            lensCode:        pickedLens.code,
            lensFamily:      pickedLens.family,
            lensBrand:       pickedLens.manufacturer,
            lensAConstant:   pickedLens.aConstant,
            status:          r?.status ?? 'failed',
            results:         r?.results ?? [],
            audit:           r?.audit ?? { executedAt: new Date().toISOString(), method: '', notes: [] },
            ...(r?.status === 'failed' ? { error: r?.audit?.notes?.join(' ') ?? 'Falhou' } : {}),
          }))
        })
      )

      updateStep('finalize', 'running')

      const allResults = settled.flatMap((s, i) => {
        if (s.status === 'fulfilled') return s.value
        const lens = selectedLenses[i]
        return selectedGateway.map((calcId) => ({
          requestId:       `voiston-hub-err-${Date.now()}-${i}`,
          calculatorId:    calcId,
          calculatorLabel: calcId,
          lensCode:        lens?.code,
          lensFamily:      lens?.family,
          lensBrand:       lens?.manufacturer,
          lensAConstant:   lens?.aConstant,
          status:          'failed' as const,
          results:         [],
          audit:           { executedAt: new Date().toISOString(), method: 'gateway', notes: [] },
          error:           s.reason instanceof Error ? s.reason.message : 'Erro ao calcular',
        }))
      })

      if (allResults.length === 0) {
        setCalcError('Nenhum resultado retornado pelo gateway. Verifique as seleções.')
        setShowCalcModal(false)
        setIsCalculating(false)
        return
      }

      setCalculationResults(allResults)
      logHubEvent('hub_calculo_resultado', {
        n_total:  allResults.length,
        n_sucesso: allResults.filter((r) => r.status === 'success').length,
        n_erro:    allResults.filter((r) => r.status === 'failed').length,
      })
      updateStep('finalize', 'done')

      // Brief pause so user sees "done" state before navigating
      await new Promise((r) => setTimeout(r, 500))
      router.push('/results')
    } catch (err) {
      setShowCalcModal(false)
      setCalcError(err instanceof Error ? err.message : 'Erro ao calcular')
      setIsCalculating(false)
    }
  }

  return (
    <>
      {showCalcModal && <CalcProgressModal steps={calcSteps} />}

      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurar Cálculo</h1>
          <p className="text-gray-500 mt-1">
            Selecione as lentes, escolha as calculadoras e ajuste os parâmetros cirúrgicos
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

        {/* 1. Lentes selecionadas (read-only summary) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Lentes selecionadas</h3>
            <button
              onClick={() => router.push('/selecaolentes')}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Mudar
            </button>
          </div>
          {selectedLenses.length === 0 ? (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-500">⚠️</span>
              <p className="text-sm text-amber-800">
                Nenhuma lente selecionada.{' '}
                <button onClick={() => router.push('/selecaolentes')} className="font-semibold underline">
                  Voltar para seleção
                </button>
              </p>
            </div>
          ) : (
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
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 2. Calculator selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Calculadoras · {selectedAvailable.length} selecionada{selectedAvailable.length !== 1 ? 's' : ''}
            </h2>
            <button
              onClick={toggleAll}
              className={`text-sm border rounded-lg px-3 py-1.5 transition-colors ${
                allSelected
                  ? 'text-red-500 border-red-200 hover:bg-red-50'
                  : 'text-blue-600 border-blue-200 hover:bg-blue-50'
              }`}
            >
              {allSelected ? '✗ Limpar seleção' : '✓ Selecionar todas'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CALCULATORS.map((calc) => {
              const isSelected  = selectedCalcs.has(calc.id)
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

        {/* 3. Surgery params (collapsible) */}
        <SurgeryPanel collapsed={!isParamsOpen} onToggle={() => setIsParamsOpen((v) => !v)} />

        {/* Error */}
        {calcError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-start gap-3 text-sm text-red-800">
            <span className="mt-0.5">⚠️</span>
            <div>
              <strong>Erro no cálculo:</strong>
              <span className="whitespace-pre-line ml-1">{calcError}</span>
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
            ⚠️ Selecione ao menos uma lente para calcular.
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
            {selectedLenses.length === 0
              ? 'Selecione ao menos uma lente'
              : selectedAvailable.length === 0
              ? 'Selecione ao menos uma calculadora'
              : `🔬 Calcular · ${selectedLenses.length} lente${selectedLenses.length > 1 ? 's' : ''} · ${selectedGateway.length} calculadora${selectedGateway.length > 1 ? 's' : ''} →`
            }
          </button>
        </div>
      </div>
    </>
  )
}
