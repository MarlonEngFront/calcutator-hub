'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBiometryStore } from '@/app/stores/biometry-store'
import type { CalculationResult } from '@/app/stores/biometry-store'

// ── Calculator display metadata ────────────────────────────────────────────────
const CALC_META: Record<string, { label: string; color: string; url: string }> = {
  'tecnis-toric':       { label: 'TECNIS Toric',        color: 'from-blue-600 to-blue-800',    url: 'tecnistoriccalc.com' },
  'apacrs-true-k-toric':{ label: 'APACRS True K Toric', color: 'from-indigo-600 to-indigo-800', url: 'calc.apacrs.org' },
  'escrs':              { label: 'ESCRS',                color: 'from-teal-600 to-teal-800',    url: 'iolcalculator.escrs.org' },
  'brascrs-double-k':   { label: 'BRASCRS Double K',    color: 'from-violet-600 to-violet-800', url: 'brascrs.com.br' },
  'brascrs-multiformula':{ label: 'BRASCRS Multifórmula',color: 'from-purple-600 to-purple-800',url: 'brascrs.com.br' },
  'apacrs-toric':       { label: 'APACRS Toric',        color: 'from-cyan-600 to-cyan-800',    url: 'calc.apacrs.org' },
}

// ── Multi-formula table (BRASCRS calcs) ───────────────────────────────────────
interface MultiFormulaRow { formula: string; elp: number; iolPower: number }

function MultiFormulaTable({ rows }: { rows: MultiFormulaRow[] }) {
  return (
    <div className="mt-3 pt-3 border-t border-inherit">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resultados por Fórmula</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="text-left py-1 font-semibold">Fórmula</th>
            <th className="text-right py-1 font-semibold">ELP</th>
            <th className="text-right py-1 font-semibold">LIO (D)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.formula} className="border-b border-gray-50 last:border-0">
              <td className="py-1.5 font-medium text-gray-700">{row.formula}</td>
              <td className="py-1.5 text-right font-mono text-gray-500">{row.elp.toFixed(2)}</td>
              <td className="py-1.5 text-right font-mono font-bold text-gray-900">{row.iolPower.toFixed(2)}</td>
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

function EyeResultCard({ eye, result, calcId }: EyeResultProps) {
  const meta = CALC_META[calcId]
  const eyeColor = eye === 'OD' ? 'border-blue-300 bg-blue-50' : 'border-indigo-300 bg-indigo-50'
  const eyeBadge = eye === 'OD'
    ? 'bg-blue-600 text-white'
    : 'bg-indigo-600 text-white'
  const [showScreenshot, setShowScreenshot] = useState(false)

  return (
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
            {showScreenshot ? '🔼 Ocultar' : '🖼 Ver resultado'}
          </button>
        )}
      </div>

      {/* Screenshot — lazy: only render when toggled */}
      {result.screenshotDataUrl && showScreenshot && (
        <div className="border-b border-inherit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.screenshotDataUrl}
            alt={`Screenshot ${eye} - ${meta?.label ?? calcId}`}
            className="w-full object-contain max-h-96 bg-white"
          />
        </div>
      )}

      {/* Main metrics */}
      <div className="p-4 space-y-3">
        {/* Multi-formula results (BRASCRS calcs) */}
        {Array.isArray((result.raw as Record<string, unknown>)?.multiFormulaResults) && (
          <MultiFormulaTable
            rows={(result.raw as Record<string, unknown>).multiFormulaResults as MultiFormulaRow[]}
          />
        )}

        {/* Single IOL power — shown only when no multi-formula table */}
        {result.iolPower !== undefined && !Array.isArray((result.raw as Record<string, unknown>)?.multiFormulaResults) && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Potência IOL</span>
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

        {/* Toric fields */}
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
                <span className={`font-mono text-sm ${
                  result.residualAstigmatism > 0.5 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {result.residualAstigmatism.toFixed(2)} D
                </span>
              </div>
            )}
          </div>
        )}

        {/* Warnings */}
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

        {/* No data state */}
        {result.iolPower === undefined && !result.screenshotDataUrl && (
          <p className="text-sm text-gray-400 italic text-center py-2">
            Dados não disponíveis para este olho
          </p>
        )}
      </div>
    </div>
  )
}

// ── Calculator result block ────────────────────────────────────────────────────
interface CalcBlockProps {
  calc: CalculationResult
}

function CalcBlock({ calc }: CalcBlockProps) {
  const meta = CALC_META[calc.calculatorId]
  const gradient = meta?.color ?? 'from-slate-600 to-slate-800'
  const label = calc.calculatorLabel || meta?.label || calc.calculatorId

  const odResult = calc.results.find((r) => r.eye === 'OD')
  const oeResult = calc.results.find((r) => r.eye === 'OE')

  const statusBadge =
    calc.status === 'completed'
      ? { text: 'Concluído', cls: 'bg-green-500/20 text-green-100 border-green-400/30' }
      : calc.status === 'partial'
      ? { text: 'Parcial', cls: 'bg-amber-500/20 text-amber-100 border-amber-400/30' }
      : { text: 'Falhou', cls: 'bg-red-500/20 text-red-100 border-red-400/30' }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Calculator header */}
      <div className={`bg-gradient-to-r ${gradient} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">{label}</h3>
            {meta?.url && <p className="text-white/60 text-xs mt-0.5">{meta.url}</p>}
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusBadge.cls}`}>
            {statusBadge.text}
          </span>
        </div>

        {/* Audit */}
        <div className="mt-2 flex items-center gap-4 text-white/50 text-xs">
          <span>🕐 {new Date(calc.audit.executedAt).toLocaleTimeString('pt-BR')}</span>
          <span>⚙️ {calc.audit.method}</span>
        </div>
      </div>

      {/* Error state */}
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

      {/* Eye results */}
      {(odResult || oeResult) && (
        <div className={`p-6 grid gap-4 ${odResult && oeResult ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
          {odResult && <EyeResultCard eye="OD" result={odResult} calcId={calc.calculatorId} />}
          {oeResult && <EyeResultCard eye="OE" result={oeResult} calcId={calc.calculatorId} />}
        </div>
      )}

      {/* Failed with no results */}
      {calc.status === 'failed' && !odResult && !oeResult && !calc.error && (
        <div className="px-6 py-8 text-center text-gray-400">
          <div className="text-4xl mb-2">😞</div>
          <p className="text-sm">Sem resultados disponíveis para esta calculadora.</p>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const router = useRouter()
  const { biometry, meta, calculationResults, selectedIOL } = useBiometryStore()

  // Empty state — no biometry
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

  // No results yet — still using mock/demo
  const hasResults = calculationResults.length > 0

  const completedCount = calculationResults.filter((r) => r.status === 'completed').length
  const failedCount = calculationResults.filter((r) => r.status === 'failed').length

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

      {/* No results state */}
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

      {/* Calculator result blocks */}
      {hasResults && (
        <div className="space-y-6">
          {calculationResults.map((calc) => (
            <CalcBlock key={`${calc.calculatorId}-${calc.requestId}`} calc={calc} />
          ))}
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
