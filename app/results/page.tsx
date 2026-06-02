'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useBiometryStore } from '@/app/stores/biometry-store'
import type { CalculationResult, ParsedBiometry, KeratometryReadings } from '@/app/stores/biometry-store'

// ── K source detection ─────────────────────────────────────────────────────────
function detectKSource(biometry: ParsedBiometry | null, kReadings: KeratometryReadings | null): string {
  if (!kReadings || !biometry) return 'K1/K2 anterior'
  const k24 = kReadings.ref2dot4?.OD
  const k33 = kReadings.ref3dot3?.OD
  if (k24?.K1 != null && Math.abs(k24.K1 - biometry.OD.K1) < 0.03) return 'K1 / K2 — Ref 2,4 mm'
  if (k33?.K1 != null && Math.abs(k33.K1 - biometry.OD.K1) < 0.03) return 'K1 / K2 — Ref 3,3 mm'
  return 'K1/K2 anterior'
}

// ── Calculator display metadata ────────────────────────────────────────────────
const CALC_META: Record<string, { label: string; color: string; url: string }> = {
  'tecnis-toric':        { label: 'TECNIS Toric',         color: 'from-blue-600 to-blue-800',    url: 'tecnistoriccalc.com' },
  'apacrs-true-k-toric': { label: 'APACRS True K Toric',  color: 'from-indigo-600 to-indigo-800', url: 'calc.apacrs.org' },
  'escrs':               { label: 'ESCRS',                 color: 'from-teal-600 to-teal-800',    url: 'iolcalculator.escrs.org' },
  'brascrs-double-k':    { label: 'BRASCRS Double K',      color: 'from-violet-600 to-violet-800', url: 'brascrs.com.br' },
  'brascrs-multiformula':{ label: 'BRASCRS Multifórmula',  color: 'from-purple-600 to-purple-800', url: 'brascrs.com.br' },
  'apacrs-toric':        { label: 'APACRS Toric',          color: 'from-cyan-600 to-cyan-800',    url: 'calc.apacrs.org' },
}

// ── Multi-formula table ────────────────────────────────────────────────────────
interface MultiFormulaRow {
  formula: string
  elp?: number | null
  iolPower?: number | null
  predictedRefraction?: number | null
  residualAstigmatism?: number | null
  [key: string]: unknown
}

function fmt(v: number | null | undefined, dec = 2) {
  return v != null && typeof v === 'number' ? v.toFixed(dec) : '—'
}

function MultiFormulaTable({ rows }: { rows: MultiFormulaRow[] }) {
  const hasElp = rows.some((r) => r.elp != null)
  const hasRef = rows.some((r) => r.predictedRefraction != null)
  const hasIol = rows.some((r) => r.iolPower != null)

  return (
    <div className="mt-3 pt-3 border-t border-inherit">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resultados por Fórmula</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="text-left py-1 font-semibold">Fórmula</th>
            {hasElp && <th className="text-right py-1 font-semibold">ELP</th>}
            {hasIol && <th className="text-right py-1 font-semibold">LIO (D)</th>}
            {hasRef && <th className="text-right py-1 font-semibold">Refr.</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.formula ?? i} className="border-b border-gray-50 last:border-0">
              <td className="py-1.5 font-medium text-gray-700">{row.formula ?? '—'}</td>
              {hasElp && <td className="py-1.5 text-right font-mono text-gray-500">{fmt(row.elp)}</td>}
              {hasIol && <td className="py-1.5 text-right font-mono font-bold text-gray-900">{fmt(row.iolPower)}</td>}
              {hasRef && (
                <td className={`py-1.5 text-right font-mono text-xs ${
                  row.predictedRefraction != null && Math.abs(row.predictedRefraction as number) > 0.5
                    ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {row.predictedRefraction != null
                    ? `${(row.predictedRefraction as number) >= 0 ? '+' : ''}${fmt(row.predictedRefraction)}`
                    : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Per-eye result card ────────────────────────────────────────────────────────
interface EyeResultProps {
  eye: 'OD' | 'OE'
  result: CalculationResult['results'][0]
  calcId: string
}

function downloadScreenshot(dataUrl: string, eye: string, calcId: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${calcId}-${eye}.png`
  a.click()
}

function printScreenshot(dataUrl: string, label: string, eye: string) {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(
    `<html><head><title>${label} - ${eye}</title>` +
    `<style>body{margin:0;padding:0;}img{width:100%;display:block;}</style>` +
    `</head><body><img src="${dataUrl}" /></body></html>`
  )
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 300)
}

function EyeResultCard({ eye, result, calcId }: EyeResultProps) {
  const meta     = CALC_META[calcId]
  const eyeColor = eye === 'OD' ? 'border-blue-300 bg-blue-50' : 'border-indigo-300 bg-indigo-50'
  const eyeBadge = eye === 'OD' ? 'bg-blue-600 text-white'     : 'bg-indigo-600 text-white'
  const [showScreenshot, setShowScreenshot] = useState(true)
  const [showModal, setShowModal]           = useState(false)

  const label = meta?.label ?? calcId

  return (
    <>
      {showModal && result.screenshotDataUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl font-light leading-none hover:text-gray-300"
            onClick={() => setShowModal(false)}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.screenshotDataUrl}
            alt={`${label} - ${eye}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className={`rounded-xl border-2 ${eyeColor} overflow-hidden`}>
        {/* Eye header */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-inherit">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${eyeBadge}`}>{eye}</span>
          <span className="text-sm font-semibold text-gray-700">
            {eye === 'OD' ? 'Olho Direito' : 'Olho Esquerdo'}
          </span>
          {result.screenshotDataUrl && (
            <button
              onClick={() => setShowScreenshot((v) => !v)}
              className="ml-auto text-xs text-blue-600 hover:underline"
            >
              {showScreenshot ? '🔼 Ocultar print' : '🖼 Ver print'}
            </button>
          )}
        </div>

        {/* Screenshot */}
        {result.screenshotDataUrl && showScreenshot && (
          <div className="border-b border-inherit bg-slate-800">
            <div className="px-4 py-2 flex items-center justify-between gap-3 border-b border-slate-700">
              {meta?.url && (
                <span className="text-xs text-slate-400">
                  Fonte:{' '}
                  <a href={`https://${meta.url}`} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
                    {meta.url}
                  </a>
                </span>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setShowModal(true)}
                  className="px-3 py-1 text-xs font-medium rounded-full border border-slate-500 text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Ampliar
                </button>
                <button
                  onClick={() => downloadScreenshot(result.screenshotDataUrl!, eye, calcId)}
                  className="px-3 py-1 text-xs font-medium rounded-full border border-slate-500 text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Baixar
                </button>
                <button
                  onClick={() => printScreenshot(result.screenshotDataUrl!, label, eye)}
                  className="px-3 py-1 text-xs font-medium rounded-full border border-slate-500 text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Imprimir
                </button>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.screenshotDataUrl}
              alt={`${label} - ${eye}`}
              className="w-full object-contain max-h-96 bg-white cursor-zoom-in"
              onClick={() => setShowModal(true)}
            />
          </div>
        )}

        {/* Metrics */}
        <div className="p-4 space-y-3">
          {Array.isArray((result.raw as Record<string, unknown>)?.multiFormulaResults) && (
            <MultiFormulaTable
              rows={(result.raw as Record<string, unknown>).multiFormulaResults as MultiFormulaRow[]}
            />
          )}

          {result.iolPower !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {Array.isArray((result.raw as Record<string, unknown>)?.multiFormulaResults)
                  ? 'Potência IOL recomendada'
                  : 'Potência IOL'}
              </span>
              <span className="font-mono font-bold text-xl text-gray-900">
                {result.iolPower.toFixed(2)} D
              </span>
            </div>
          )}

          {result.predictedRefraction !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Refração prevista</span>
              <span className={`font-mono font-semibold text-sm ${
                Math.abs(result.predictedRefraction) > 0.5
                  ? 'text-amber-600'
                  : Math.abs(result.predictedRefraction) > 0.25
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {result.predictedRefraction >= 0 ? '+' : ''}{result.predictedRefraction.toFixed(2)} D
              </span>
            </div>
          )}

          {result.toricModel && (
            <div className="mt-3 pt-3 border-t border-inherit space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dados Tóricos</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Modelo tórico</span>
                <span className="font-mono text-sm font-semibold text-gray-900">{result.toricModel}</span>
              </div>
              {result.toricAxis !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Eixo tórico</span>
                  <span className="font-mono text-sm text-gray-900">{result.toricAxis}°</span>
                </div>
              )}
              {result.residualAstigmatism !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Astigmatismo residual</span>
                  <span className={`font-mono text-sm ${result.residualAstigmatism > 0.5 ? 'text-amber-600' : 'text-green-600'}`}>
                    {result.residualAstigmatism.toFixed(2)} D
                  </span>
                </div>
              )}
            </div>
          )}

          {result.warnings?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-amber-200 space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                  <span className="mt-0.5 shrink-0">⚠️</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {result.iolPower === undefined && !result.screenshotDataUrl && (
            <p className="text-sm text-gray-400 italic text-center py-2">
              Dados não disponíveis para este olho
            </p>
          )}
        </div>
      </div>
    </>
  )
}

// ── Calculator result block ────────────────────────────────────────────────────
interface CalcBlockProps {
  calc: CalculationResult
}

function CalcBlock({ calc }: CalcBlockProps) {
  const { biometry, meta: bioMeta, surgeryParams, selectedIOL, kReadings } = useBiometryStore()
  const [showParams, setShowParams] = useState(false)

  const meta     = CALC_META[calc.calculatorId]
  const gradient = meta?.color ?? 'from-slate-600 to-slate-800'
  const label    = calc.calculatorLabel || meta?.label || calc.calculatorId

  const lensFamily = calc.lensFamily    ?? selectedIOL?.model            ?? '—'
  const lensCode   = calc.lensCode      ?? selectedIOL?.manufacturerCode ?? '—'
  const lensAConst = calc.lensAConstant ?? selectedIOL?.aConstant
  const lensMfr    = calc.lensBrand     ?? selectedIOL?.manufacturer     ?? '—'

  const kSource  = detectKSource(biometry, kReadings)
  const paramRows = [
    { label: 'Exame selecionado', value: bioMeta?.equipment ?? bioMeta?.filename ?? '—' },
    { label: 'K/Tk selecionado',  value: kSource },
    { label: 'Calculadora',       value: label },
    { label: 'Fabricante',        value: lensMfr },
    { label: 'Lente',             value: lensFamily },
    { label: 'Código lente',      value: lensCode },
    { label: 'A Constant',        value: lensAConst != null ? lensAConst.toFixed(2) : '—' },
    { label: 'K Index',           value: '1,3375' },
    { label: 'Cylinder',          value: '+VE' },
    { label: 'SIA',               value: `${surgeryParams.SIA} D @ ${surgeryParams.SIAAxis}°` },
    { label: 'Refração Alvo OD',  value: `${surgeryParams.OD.refTarget >= 0 ? '+' : ''}${surgeryParams.OD.refTarget.toFixed(2)} D` },
    { label: 'Refração Alvo OE',  value: `${surgeryParams.OE.refTarget >= 0 ? '+' : ''}${surgeryParams.OE.refTarget.toFixed(2)} D` },
  ]

  const odResult = calc.results.find((r) => r.eye === 'OD')
  const oeResult = calc.results.find((r) => r.eye === 'OE')

  const statusBadge =
    calc.status === 'completed'
      ? { text: 'Concluído', cls: 'bg-green-500/20 text-green-100 border-green-400/30' }
      : calc.status === 'partial'
      ? { text: 'Parcial',   cls: 'bg-amber-500/20 text-amber-100 border-amber-400/30' }
      : { text: 'Falhou',    cls: 'bg-red-500/20 text-red-100 border-red-400/30' }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Calculator header */}
      <div className={`bg-gradient-to-r ${gradient} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">{label}</h3>
            <p className="text-white/80 text-sm mt-0.5 font-medium">
              {lensFamily !== '—' ? lensFamily : ''}
              {lensCode !== '—' && lensFamily !== lensCode
                ? <span className="text-white/50 ml-1 font-normal text-xs">({lensCode})</span>
                : null}
            </p>
            {meta?.url && <p className="text-white/60 text-xs mt-0.5">{meta.url}</p>}
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusBadge.cls}`}>
            {statusBadge.text}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-4 text-white/50 text-xs">
          <span>🕐 {new Date(calc.audit.executedAt).toLocaleTimeString('pt-BR')}</span>
          <span>⚙️ {calc.audit.method}</span>
        </div>
      </div>

      {/* Error */}
      {calc.error && (
        <div className="m-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <strong>Erro:</strong> {calc.error}
        </div>
      )}

      {/* Audit notes */}
      {calc.audit.notes?.length > 0 && (
        <div className="mx-6 mt-4 space-y-1">
          {calc.audit.notes.map((n, i) => (
            <p key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
              <span className="mt-0.5">ℹ️</span> {n}
            </p>
          ))}
        </div>
      )}

      {/* Params accordion */}
      <div className="mx-6 mt-4 rounded-xl overflow-hidden border border-slate-200">
        <button
          onClick={() => setShowParams((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          <span>Parâmetros Utilizados no Cálculo</span>
          <span className="text-slate-400 text-xs">{showParams ? '▲' : '▼'}</span>
        </button>
        {showParams && (
          <div className="bg-white">
            {paramRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0"
              >
                <span className="text-sm text-slate-500">{row.label}</span>
                <span className="text-sm font-semibold text-slate-900 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Eye results */}
      {(odResult || oeResult) && (
        <div className={`p-6 grid gap-4 ${odResult && oeResult ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
          {odResult && <EyeResultCard eye="OD" result={odResult} calcId={calc.calculatorId} />}
          {oeResult && <EyeResultCard eye="OE" result={oeResult} calcId={calc.calculatorId} />}
        </div>
      )}

      {calc.status === 'failed' && !odResult && !oeResult && !calc.error && (
        <div className="px-6 py-8 text-center text-gray-400">
          <div className="text-4xl mb-2">😞</div>
          <p className="text-sm">Sem resultados disponíveis para esta calculadora.</p>
        </div>
      )}
    </div>
  )
}

// ── Tab status helper ──────────────────────────────────────────────────────────
function calcTabStatus(calcId: string, results: CalculationResult[]): 'ok' | 'fail' | 'partial' {
  const relevant = results.filter((r) => r.calculatorId === calcId)
  if (relevant.length === 0) return 'partial'
  if (relevant.every((r) => r.status === 'completed')) return 'ok'
  if (relevant.every((r) => r.status === 'failed'))    return 'fail'
  return 'partial'
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const router = useRouter()
  const { biometry, meta, calculationResults, selectedIOL } = useBiometryStore()

  // Group calc IDs in insertion order — all hooks before early returns
  const calcIds = useMemo(() => {
    const seen  = new Set<string>()
    const order: string[] = []
    calculationResults.forEach((r) => {
      if (!seen.has(r.calculatorId)) { seen.add(r.calculatorId); order.push(r.calculatorId) }
    })
    return order
  }, [calculationResults])

  const [activeTab, setActiveTab] = useState('')

  // Effective tab: use activeTab if valid, else first available
  const effectiveTab = calcIds.includes(activeTab) ? activeTab : (calcIds[0] ?? '')
  const tabResults   = calculationResults.filter((r) => r.calculatorId === effectiveTab)

  // ── Early returns ────────────────────────────────────────────────────────────
  if (!biometry || !meta) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum resultado disponível</h2>
        <p className="text-gray-500 mb-6">Volte e inicie um cálculo.</p>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
        >
          Ir para upload
        </button>
      </div>
    )
  }

  const hasResults     = calculationResults.length > 0
  const completedCount = calculationResults.filter((r) => r.status === 'completed').length
  const failedCount    = calculationResults.filter((r) => r.status === 'failed').length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resultados do Cálculo</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {meta.filename}
            {selectedIOL && ` · ${selectedIOL.model}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => router.push('/calculators')}
            className="text-sm text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            ← Recalcular
          </button>
          <button
            onClick={() => window.print()}
            className="text-sm text-gray-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {hasResults && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{calculationResults.length}</div>
            <div className="text-xs text-gray-500">Calculadoras</div>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <div className="text-xs text-gray-500">Concluídas</div>
          </div>
          {failedCount > 0 && (
            <>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{failedCount}</div>
                <div className="text-xs text-gray-500">Falhas</div>
              </div>
            </>
          )}
          <div className="ml-auto text-xs text-gray-400">
            {new Date(calculationResults[0]?.audit.executedAt ?? Date.now()).toLocaleString('pt-BR')}
          </div>
        </div>
      )}

      {/* No results */}
      {!hasResults && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Sem resultados de cálculo</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Volte para a página de calculadoras, selecione uma lente e calcule.
            </p>
          </div>
          <button
            onClick={() => router.push('/calculators')}
            className="ml-auto shrink-0 bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700"
          >
            Calcular
          </button>
        </div>
      )}

      {/* Tabs + results */}
      {hasResults && calcIds.length > 0 && (
        <div>
          {/* Tab bar */}
          <div className="border-b border-slate-200 overflow-x-auto">
            <div className="flex gap-0.5 min-w-max">
              {calcIds.map((id) => {
                const meta    = CALC_META[id]
                const label   = meta?.label ?? id
                const isActive = id === effectiveTab
                const status  = calcTabStatus(id, calculationResults)
                const statusIcon =
                  status === 'ok'   ? <span className="text-green-500">✓</span> :
                  status === 'fail' ? <span className="text-red-500">✗</span> :
                                     <span className="text-amber-500">⚠</span>
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                    }`}
                  >
                    {statusIcon}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="space-y-6 pt-6">
            {tabResults.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-sm">Sem resultados para esta calculadora.</p>
              </div>
            ) : (
              tabResults.map((calc) => (
                <CalcBlock key={`${calc.calculatorId}-${calc.lensCode ?? ''}-${calc.requestId}`} calc={calc} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => router.push('/')}
          className="px-5 py-3 border border-slate-200 text-gray-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
        >
          Novo exame
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center pb-4">
        Resultados gerados por calculadoras externas. Validação clínica obrigatória pelo médico responsável antes de qualquer prescrição.
      </p>
    </div>
  )
}
