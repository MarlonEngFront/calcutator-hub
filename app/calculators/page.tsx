'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBiometryStore } from '@/app/stores/biometry-store'
import { IOL_CATALOG } from '@/app/lib/iol-catalog'
import { getLensesForCalculator, type CalcLens } from '@/app/lib/calculator-lens-catalogs'

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
    description: 'Barrett, Cooke K6, EVO, Hill-RBF, Hoffer®QST, Kane, Pearl DGS.',
    status: 'available' as const,
    tags: ['Barrett', 'Kane', 'EVO', 'Hill-RBF'],
    logoText: 'ESC', logoBg: 'bg-blue-700', time: '~30-40s',
  },
]

// ─── Per-calculator Lens Selector ───────────────────────────────────
interface CalcLensSelectorProps {
  calcId: string
  calcName: string
  selected: CalcLens | null
  onChange: (lens: CalcLens) => void
}

function CalcLensSelector({ calcId, calcName, selected, onChange }: CalcLensSelectorProps) {
  const lenses = getLensesForCalculator(calcId)
  if (lenses.length === 0) return null

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {calcName}
      </label>
      <select
        value={selected?.code ?? ''}
        onChange={(e) => {
          const lens = lenses.find((l) => l.code === e.target.value)
          if (lens) onChange(lens)
        }}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
      >
        <option value="" disabled>Selecione a lente...</option>
        {lenses.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Surgery Params Panel ────────────────────────────────────────────
function SurgeryPanel() {
  const { surgeryParams, setSurgeryParams } = useBiometryStore()

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-gray-900">3. Parâmetros Cirúrgicos</h3>
        <p className="text-xs text-gray-500 mt-0.5">SE LIO e alvo refrativo por olho — obrigatório para TECNIS</p>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* SIA global */}
        <div className="sm:col-span-2 flex gap-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SIA (D)</label>
            <input type="number" step="0.01" min="0" max="3"
              value={surgeryParams.SIA}
              onChange={(e) => setSurgeryParams({ SIA: parseFloat(e.target.value) || 0 })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Eixo SIA (°)</label>
            <input type="number" step="1" min="0" max="180"
              value={surgeryParams.SIAAxis}
              onChange={(e) => setSurgeryParams({ SIAAxis: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400" />
          </div>
        </div>

        {/* OD */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-blue-700 border-b border-blue-100 pb-1">OD — Olho Direito</div>
          <div>
            <label className="text-xs font-medium text-gray-500">SE LIO estimado (D)</label>
            <input type="number" step="0.5" min="0" max="50"
              value={surgeryParams.OD.seIOLPower}
              onChange={(e) => setSurgeryParams({ OD: { ...surgeryParams.OD, seIOLPower: parseFloat(e.target.value) || 0 } })}
              className="mt-1 w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Alvo refrativo (D)</label>
            <input type="number" step="0.25" min="-5" max="2"
              value={surgeryParams.OD.refTarget}
              onChange={(e) => setSurgeryParams({ OD: { ...surgeryParams.OD, refTarget: parseFloat(e.target.value) || 0 } })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400" />
          </div>
        </div>

        {/* OE */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-indigo-700 border-b border-indigo-100 pb-1">OE — Olho Esquerdo</div>
          <div>
            <label className="text-xs font-medium text-gray-500">SE LIO estimado (D)</label>
            <input type="number" step="0.5" min="0" max="50"
              value={surgeryParams.OE.seIOLPower}
              onChange={(e) => setSurgeryParams({ OE: { ...surgeryParams.OE, seIOLPower: parseFloat(e.target.value) || 0 } })}
              className="mt-1 w-full border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Alvo refrativo (D)</label>
            <input type="number" step="0.25" min="-5" max="2"
              value={surgeryParams.OE.refTarget}
              onChange={(e) => setSurgeryParams({ OE: { ...surgeryParams.OE, refTarget: parseFloat(e.target.value) || 0 } })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function CalculatorsPage() {
  const router = useRouter()
  const { biometry, meta, surgeryParams, setCalculationResults } = useBiometryStore()
  const [selectedCalcs, setSelectedCalcs] = useState<Set<string>>(new Set())
  const [isCalculating, setIsCalculating] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)
  // Per-calculator lens overrides: calcId → CalcLens
  const [lensOverrides, setLensOverrides] = useState<Record<string, CalcLens>>({})

  if (!biometry || !meta) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhuma biometria carregada</h2>
        <button onClick={() => router.push('/')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700">
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
  // All selected calculators must have a lens chosen
  const allLensesSelected = selectedAvailable.every((id) => lensOverrides[id] != null)
  const canCalculate = selectedAvailable.length > 0 && allLensesSelected

  const handleCalculate = async () => {
    if (!canCalculate) return
    setIsCalculating(true)
    setCalcError(null)

    // Derive base IOL from first selected calculator's lens override.
    // Gateway adapters use lensOverrides[calcId] per-calc; base lens is fallback only.
    const firstCalcLens = lensOverrides[selectedAvailable[0]]
    const baseIol =
      IOL_CATALOG.find((i) => i.manufacturerCode === firstCalcLens.code) ?? {
        id: firstCalcLens.code,
        model: firstCalcLens.family,
        manufacturer: firstCalcLens.manufacturer,
        manufacturerCode: firstCalcLens.code,
        type: 'toric' as const,
        aConstant: 119.1,
      }

    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculatorIds: selectedAvailable,
          biometry,
          iol: baseIol,
          surgeryParams,
          lensOverrides: Object.fromEntries(
            Object.entries(lensOverrides).map(([id, l]) => [
              id,
              {
                id: l.code,
                brand: l.manufacturer,
                family: l.family,
                a_constant: l.aConstant ?? 119.1,
                toric_available: l.haigisA0 == null, // formula-based calcs are not toric
                code: l.code,
                ...(l.haigisA0 != null ? { haigisA0: l.haigisA0 } : {}),
                ...(l.haigisA1 != null ? { haigisA1: l.haigisA1 } : {}),
                ...(l.haigisA2 != null ? { haigisA2: l.haigisA2 } : {}),
              },
            ])
          ),
          isDemoData: meta.filename === 'demo-biometry.json',
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      // Normaliza bundle response → CalculationResult[]
      const results = Object.entries(data.results as Record<string, any>).map(([id, r]) => ({
        requestId: r.requestId,
        calculatorId: id,
        calculatorLabel: r.calculator?.label ?? id,
        status: r.status,
        results: r.results ?? [],
        audit: r.audit ?? { executedAt: new Date().toISOString(), method: '', notes: [] },
      }))

      setCalculationResults(results)
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
        <p className="text-gray-500 mt-1">Escolha as calculadoras, selecione a lente de cada uma e defina os parâmetros cirúrgicos</p>
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
          <button onClick={() => router.push('/validate')} className="ml-auto text-sm text-blue-600 hover:underline">← Editar</button>
        </div>
      </div>

      {/* 1. Calculators */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          1. Calculadoras · {selectedAvailable.length} selecionada{selectedAvailable.length !== 1 ? 's' : ''}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CALCULATORS.map((calc) => {
            const isSelected = selectedCalcs.has(calc.id)
            const isAvailable = calc.status === 'available'
            return (
              <button key={calc.id} onClick={() => toggle(calc.id)} disabled={!isAvailable}
                className={`text-left rounded-2xl border p-5 transition-all ${
                  !isAvailable ? 'border-slate-100 bg-slate-50 opacity-55 cursor-not-allowed' :
                  isSelected ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200 shadow-md' :
                  'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm cursor-pointer'
                }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${calc.logoBg} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                    {calc.logoText}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      isAvailable ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>{isAvailable ? '✓ Disponível' : 'Em breve'}</span>
                    {isAvailable && (
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
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
                    <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  {isAvailable && <span>⏱ {calc.time}</span>}
                  <a href={calc.url} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-500 hover:underline ml-auto">↗ Site</a>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Per-calculator lens picker — shown only when calculators are selected */}
      {selectedAvailable.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-gray-900">2. Lente por Calculadora</h3>
            <p className="text-xs text-gray-500 mt-0.5">Cada calculadora usa seu próprio catálogo de lentes</p>
          </div>
          <div className="p-6 space-y-4">
            {selectedAvailable.map((calcId) => {
              const calc = CALCULATORS.find((c) => c.id === calcId)
              if (!calc) return null
              return (
                <CalcLensSelector
                  key={calcId}
                  calcId={calcId}
                  calcName={calc.name}
                  selected={lensOverrides[calcId] ?? null}
                  onChange={(lens) => setLensOverrides((prev) => ({ ...prev, [calcId]: lens }))}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* 3. Surgery params */}
      <SurgeryPanel />

      {/* Error */}
      {calcError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-start gap-3 text-sm text-red-800">
          <span>⚠️</span>
          <div>
            <strong>Erro no cálculo:</strong> {calcError}
          </div>
        </div>
      )}

      {/* Hint */}
      {selectedAvailable.length > 0 && !allLensesSelected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800">
          ⚠️ Selecione a lente para cada calculadora escolhida (passo 2).
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => router.push('/validate')}
          className="px-5 py-3 border border-slate-200 text-gray-600 rounded-xl font-medium hover:bg-slate-50 transition-colors">
          ← Voltar
        </button>
        <button disabled={!canCalculate || isCalculating} onClick={handleCalculate}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors shadow-sm">
          {isCalculating ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Calculando via gateway...</>
          ) : selectedAvailable.length === 0 ? 'Selecione ao menos uma calculadora (passo 1)' :
            !allLensesSelected ? 'Selecione a lente por calculadora (passo 2)' :
            `🔬 Calcular · ${selectedAvailable.length} calculadora${selectedAvailable.length > 1 ? 's' : ''} →`}
        </button>
      </div>
    </div>
  )
}
