'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBiometryStore } from '@/app/stores/biometry-store'
import type { ParsedBiometry, BiometryMeta, SurgeryParams } from '@/app/stores/biometry-store'

// ─── Range helpers ─────────────────────────────────────────────────────────────
const RANGES: Record<string, [number, number]> = {
  K1: [36, 52], K2: [36, 52], AL: [18, 34], ACD: [1.5, 5],
  LT: [2, 7], WTW: [10, 14], CCT: [400, 700], Cyl: [0, 10],
}
function fieldStatus(field: string, v?: number): 'ok' | 'warn' | 'neutral' {
  if (v == null || !Number.isFinite(v)) return 'neutral'
  const r = RANGES[field]
  if (!r) return 'neutral'
  return v >= r[0] && v <= r[1] ? 'ok' : 'warn'
}

// ─── Eye SVG icon ──────────────────────────────────────────────────────────────
function EyeIcon({ color = '#6b7280', size = 17 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// ─── Check / Warn badge ────────────────────────────────────────────────────────
function CheckBadge({ status }: { status: 'ok' | 'warn' | 'neutral' }) {
  if (status === 'ok')
    return (
      <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  if (status === 'warn')
    return (
      <span className="shrink-0 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
        <span className="text-white font-bold leading-none" style={{ fontSize: 10 }}>!</span>
      </span>
    )
  return <span className="shrink-0 w-4 h-4" />
}

// ─── Field row ─────────────────────────────────────────────────────────────────
interface FieldRowProps {
  label: string
  value: number
  unit: string
  field?: string
  step?: number
  note?: string
  onChange: (v: number) => void
}
function FieldRow({ label, value, unit, field, step = 0.01, note, onChange }: FieldRowProps) {
  const status = field ? fieldStatus(field, value) : 'neutral'
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors group">
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        {note && <span className="block text-[11px] text-slate-400 leading-tight">{note}</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number" step={step}
          value={value ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-[4.5rem] text-right font-mono font-semibold text-sm text-gray-900 bg-transparent border-0 outline-none
            focus:bg-white focus:ring-1 focus:ring-blue-200 focus:rounded focus:px-1 transition-all"
        />
        <span className="text-[11px] text-slate-400 w-5 shrink-0">{unit}</span>
      </div>
      <CheckBadge status={status} />
    </div>
  )
}

// ─── K row (with optional axis line) ──────────────────────────────────────────
function KRow({
  label, value, axis, field, onChange, onAxisChange,
}: {
  label: string; value: number; axis?: number; field: string
  onChange: (v: number) => void; onAxisChange?: (v: number) => void
}) {
  const status = fieldStatus(field, value)
  return (
    <div className="px-4 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs font-medium text-slate-600">{label}</span>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number" step={0.01}
            value={value ?? ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-[4.5rem] text-right font-mono font-semibold text-sm text-gray-900 bg-transparent border-0 outline-none
              focus:bg-white focus:ring-1 focus:ring-blue-200 focus:rounded focus:px-1 transition-all"
          />
          <span className="text-[11px] text-slate-400 w-4 shrink-0">D</span>
        </div>
        <CheckBadge status={status} />
      </div>
      {axis != null && onAxisChange && (
        <div className="flex items-center gap-1 mt-0.5 pr-5">
          <span className="text-[11px] text-slate-400 flex-1 pl-0">eixo</span>
          <input
            type="number" step={1} min={0} max={180}
            value={axis ?? ''}
            onChange={(e) => onAxisChange(parseInt(e.target.value) || 0)}
            className="w-10 text-right font-mono text-[11px] text-slate-500 bg-transparent border-0 outline-none
              focus:bg-white focus:ring-1 focus:ring-blue-200 focus:rounded focus:px-1 transition-all"
          />
          <span className="text-[11px] text-slate-400">°</span>
        </div>
      )}
    </div>
  )
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-200">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  )
}

// ─── Campos adicionais ─────────────────────────────────────────────────────────
function AdditionalFields({ eyeData, eye }: { eyeData: ParsedBiometry['OD']; eye: 'OD' | 'OE' }) {
  const avgK = eyeData.K1 && eyeData.K2 ? (eyeData.K1 + eyeData.K2) / 2 : undefined
  const items: Array<{ label: string; value?: number; unit: string; decimals?: number }> = [
    { label: 'Axial Length',                value: eyeData.AL,     unit: 'mm',  decimals: 2 },
    { label: 'K1 2.4',                      value: eyeData.K1,     unit: 'D',   decimals: 2 },
    { label: 'K1 Axis 2.4',                 value: eyeData.K1Axis, unit: '°',   decimals: 0 },
    { label: 'K2 2.4',                      value: eyeData.K2,     unit: 'D',   decimals: 2 },
    { label: 'K2 Axis 2.4',                 value: eyeData.K2Axis, unit: '°',   decimals: 0 },
    { label: 'Avgk 2.4',                    value: avgK,           unit: 'D',   decimals: 2 },
    { label: 'CYL 2.4',                     value: eyeData.Cyl,    unit: 'D',   decimals: 2 },
    { label: 'Anterior Chamber Depth',      value: eyeData.ACD,    unit: 'mm',  decimals: 2 },
    { label: 'Cornea Central Thickness',    value: eyeData.CCT,    unit: 'µm',  decimals: 0 },
    { label: 'Espessura Corneana Central',  value: eyeData.CCT,    unit: 'µm',  decimals: 0 },
    { label: 'Cornea WTW',                  value: eyeData.WTW,    unit: 'mm',  decimals: 2 },
  ].filter((f) => f.value != null && Number.isFinite(f.value))

  return (
    <div className="px-4 py-3 space-y-1.5">
      {items.map((f) => (
        <div key={f.label} className="flex items-center justify-between text-[11.5px]">
          <span className="text-slate-500 font-medium">{f.label}</span>
          <span className="font-mono font-semibold text-slate-700 tabular-nums">
            {f.value != null
              ? (f.decimals === 0 ? Math.round(f.value) : f.value.toFixed(f.decimals ?? 2))
              : '—'}
            {' '}
            <span className="text-slate-400 font-normal">{f.unit}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Eye column ────────────────────────────────────────────────────────────────
interface EyeColumnProps {
  eye: 'OD' | 'OE'
  eyeData: ParsedBiometry['OD']
  surgeryParams: SurgeryParams
  onFieldChange: (field: string, value: number) => void
  onSurgeryChange: (params: Partial<SurgeryParams>) => void
}

function EyeColumn({ eye, eyeData, surgeryParams, onFieldChange, onSurgeryChange }: EyeColumnProps) {
  const [showAdditional, setShowAdditional] = useState(false)
  const isOD = eye === 'OD'
  const iconColor = isOD ? '#2563eb' : '#4338ca'
  const labelCls = isOD ? 'text-blue-700' : 'text-indigo-700'
  const borderCls = isOD ? 'border-blue-100' : 'border-indigo-100'
  const eyeParams = isOD ? surgeryParams.OD : surgeryParams.OE

  return (
    <div className={`rounded-2xl border ${borderCls} bg-white overflow-hidden`}>
      {/* Eye header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-2">
        <EyeIcon color={iconColor} />
        <span className={`text-[11px] font-bold uppercase tracking-widest ${labelCls}`}>
          {isOD ? 'Olho Direito' : 'Olho Esquerdo'}
        </span>
      </div>

      {/* Column label row */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-1.5 bg-slate-50 border-b border-slate-100">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Parâmetro</span>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${labelCls} pr-1`}>
          {eye} — {isOD ? 'Olho Direito' : 'Olho Esquerdo'}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ref.</span>
      </div>

      {/* Keratometry */}
      <SectionHeader label="Ceratometria" />
      <KRow label="K1" value={eyeData.K1} axis={eyeData.K1Axis}
        field="K1"
        onChange={(v) => onFieldChange('K1', v)}
        onAxisChange={(v) => onFieldChange('K1Axis', v)}
      />
      <KRow label="K2" value={eyeData.K2} axis={eyeData.K2Axis}
        field="K2"
        onChange={(v) => onFieldChange('K2', v)}
        onAxisChange={(v) => onFieldChange('K2Axis', v)}
      />
      {eyeData.Cyl != null && (
        <FieldRow label="CYL" value={eyeData.Cyl} unit="D" field="Cyl" step={0.01}
          note={eyeData.Axis != null ? `eixo ${Math.round(eyeData.Axis)}°` : undefined}
          onChange={(v) => onFieldChange('Cyl', v)}
        />
      )}

      {/* Biometry */}
      <SectionHeader label="Biometria" />
      <FieldRow label="Comprimento Axial" value={eyeData.AL} unit="mm" field="AL" step={0.01}
        onChange={(v) => onFieldChange('AL', v)}
      />
      <FieldRow label="ACD" value={eyeData.ACD} unit="mm" field="ACD" step={0.01}
        onChange={(v) => onFieldChange('ACD', v)}
      />
      <FieldRow label="LT" value={eyeData.LT ?? 4.2} unit="mm" field="LT" step={0.01}
        onChange={(v) => onFieldChange('LT', v)}
      />
      <FieldRow label="CCT" value={eyeData.CCT ?? 540} unit="µm" field="CCT" step={1}
        onChange={(v) => onFieldChange('CCT', v)}
      />
      <FieldRow label="WTW" value={eyeData.WTW} unit="mm" field="WTW" step={0.1}
        onChange={(v) => onFieldChange('WTW', v)}
      />

      {/* Surgery params */}
      <SectionHeader label="Parâmetros Cirúrgicos" />
      {/* SIA — shared, same for both eyes */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
        <span className="flex-1 text-xs font-medium text-slate-600">SIA (Cirurgião)</span>
        <div className="flex items-center gap-1 shrink-0">
          <input type="number" step={0.01} min={0} max={3}
            value={surgeryParams.SIA}
            onChange={(e) => onSurgeryChange({ SIA: parseFloat(e.target.value) || 0 })}
            className="w-12 text-right font-mono font-semibold text-sm text-gray-900 bg-transparent border-0 outline-none
              focus:bg-white focus:ring-1 focus:ring-blue-200 focus:rounded focus:px-1 transition-all"
          />
          <span className="text-[11px] text-slate-400">@</span>
          <input type="number" step={1} min={0} max={180}
            value={surgeryParams.SIAAxis}
            onChange={(e) => onSurgeryChange({ SIAAxis: parseInt(e.target.value) || 0 })}
            className="w-10 text-right font-mono font-semibold text-sm text-gray-900 bg-transparent border-0 outline-none
              focus:bg-white focus:ring-1 focus:ring-blue-200 focus:rounded focus:px-1 transition-all"
          />
          <span className="text-[11px] text-slate-400">°</span>
        </div>
        <span className="shrink-0 w-4 h-4" />
      </div>
      {/* Ref target — per eye */}
      <FieldRow label="Refração Alvo" value={eyeParams.refTarget} unit="D" step={0.25}
        onChange={(v) => {
          if (isOD) onSurgeryChange({ OD: { ...surgeryParams.OD, refTarget: v } })
          else onSurgeryChange({ OE: { ...surgeryParams.OE, refTarget: v } })
        }}
      />

      {/* Campos adicionais toggle */}
      <button
        onClick={() => setShowAdditional(!showAdditional)}
        className="w-full px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2
          text-[10.5px] font-semibold uppercase tracking-wider text-slate-500
          hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <span className={`transition-transform duration-200 ${showAdditional ? 'rotate-180' : ''}`}>▼</span>
        Campos Adicionais ({eye})
      </button>
      {showAdditional && <AdditionalFields eyeData={eyeData} eye={eye} />}
    </div>
  )
}

// ─── Center sticky panel — file viewer ────────────────────────────────────────
interface ExamViewerPanelProps {
  fileDataUrl: string | null
  meta: BiometryMeta
  biometry: ParsedBiometry
}

function ExamViewerPanel({ fileDataUrl, meta, biometry }: ExamViewerPanelProps) {
  const rows: Array<{ label: string; field: keyof ParsedBiometry['OD']; unit: string; d: number }> = [
    { label: 'AL',  field: 'AL',  unit: 'mm', d: 2 },
    { label: 'K1',  field: 'K1',  unit: 'D',  d: 2 },
    { label: 'K2',  field: 'K2',  unit: 'D',  d: 2 },
    { label: 'ACD', field: 'ACD', unit: 'mm', d: 2 },
    { label: 'LT',  field: 'LT',  unit: 'mm', d: 2 },
    { label: 'CCT', field: 'CCT', unit: 'µm', d: 0 },
    { label: 'WTW', field: 'WTW', unit: 'mm', d: 1 },
    { label: 'CYL', field: 'Cyl', unit: 'D',  d: 2 },
  ]
  const fmt = (v: number | undefined, d: number) =>
    v != null && Number.isFinite(v) ? (d === 0 ? Math.round(v).toString() : v.toFixed(d)) : '—'

  const isPDF = meta.fileType === 'application/pdf'
  const isImage = meta.fileType?.startsWith('image/')

  if (fileDataUrl && (isPDF || isImage)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {/* Header controls */}
        <div className="px-3 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
          <a href={fileDataUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white
              px-2 py-1 rounded border border-slate-600 hover:bg-slate-700 transition-colors">
            ↗ Abrir em Nova Aba
          </a>
          <span className="ml-auto text-[11px] font-bold text-blue-400">Biometria Original</span>
        </div>
        {/* File viewer */}
        <div className="h-[520px] overflow-hidden bg-slate-100">
          {isPDF && (
            <iframe
              src={fileDataUrl}
              className="w-full h-full border-0"
              title="Biometria original"
            />
          )}
          {isImage && (
            <div className="w-full h-full overflow-y-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileDataUrl} className="w-full h-auto" alt="Biometria original" />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Fallback: numeric comparison table
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Biometria</p>
        <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">
          {meta.equipment ?? meta.filename}
        </p>
      </div>
      <div className="grid grid-cols-3 px-3 py-1.5 bg-white border-b border-slate-100">
        <span />
        <span className="text-[10px] font-bold text-blue-600 text-center uppercase tracking-wide">OD</span>
        <span className="text-[10px] font-bold text-indigo-600 text-center uppercase tracking-wide">OE</span>
      </div>
      {rows.map((row) => {
        const od = biometry.OD[row.field] as number | undefined
        const oe = biometry.OE[row.field] as number | undefined
        if (od == null && oe == null) return null
        const odSt = fieldStatus(row.field === 'Cyl' ? 'Cyl' : row.label, od)
        const oeSt = fieldStatus(row.field === 'Cyl' ? 'Cyl' : row.label, oe)
        return (
          <div key={row.label}
            className="grid grid-cols-3 gap-1 px-3 py-1.5 border-b border-slate-100 last:border-0 hover:bg-slate-50">
            <span className="text-[11px] text-slate-500 font-semibold self-center">
              {row.label} <span className="text-slate-400 font-normal">{row.unit}</span>
            </span>
            <div className="flex items-center justify-center gap-1">
              <span className={`text-xs font-mono font-bold tabular-nums ${odSt === 'warn' ? 'text-amber-600' : 'text-blue-700'}`}>
                {fmt(od, row.d)}
              </span>
              <CheckBadge status={odSt} />
            </div>
            <div className="flex items-center justify-center gap-1">
              <span className={`text-xs font-mono font-bold tabular-nums ${oeSt === 'warn' ? 'text-amber-600' : 'text-indigo-700'}`}>
                {fmt(oe, row.d)}
              </span>
              <CheckBadge status={oeSt} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ValidatePage() {
  const router = useRouter()
  const {
    biometry, meta, clearBiometry,
    updateODField, updateOEField,
    surgeryParams, setSurgeryParams,
    fileDataUrl,
  } = useBiometryStore()
  const [isConfirming, setIsConfirming] = useState(false)

  if (!biometry || !meta) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhuma biometria carregada</h2>
        <p className="text-gray-500 mb-6">Envie um arquivo de exame para continuar.</p>
        <button onClick={() => router.push('/')}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
          Ir para upload
        </button>
      </div>
    )
  }

  const isManualEntry = meta.examType === 'manual'
  const hasWarnings =
    (['K1', 'K2', 'AL', 'ACD'] as const).some((f) => fieldStatus(f, biometry.OD[f]) === 'warn') ||
    (['K1', 'K2', 'AL', 'ACD'] as const).some((f) => fieldStatus(f, biometry.OE[f]) === 'warn')

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Dark header panel ─────────────────────────────────────────────── */}
      <div className="bg-[#1B2236] rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4">
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[11px] font-bold
              px-2.5 py-1 rounded-full uppercase tracking-wide">
              ✦ Dados extraídos por IA
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">Revise os parâmetros biométricos</h1>
          <p className="text-slate-400 text-sm mt-1">
            Compare os dados extraídos com o exame original abaixo.
          </p>
        </div>

        {/* Patient info strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-white/10
          divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          <div className="px-6 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Paciente</p>
            <p className="text-white font-bold mt-0.5 truncate">{meta.patientName ?? '—'}</p>
          </div>
          <div className="px-6 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Gênero</p>
            <p className="text-white font-bold mt-0.5">{meta.gender ?? '—'}</p>
          </div>
          <div className="px-6 py-3.5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Exame</p>
              <p className="text-white font-bold mt-0.5 truncate">{meta.equipment ?? meta.filename}</p>
            </div>
            <button
              onClick={() => { clearBiometry(); router.push('/') }}
              className="shrink-0 text-xs text-slate-400 border border-slate-600 rounded-lg px-2.5 py-1
                hover:text-white hover:border-slate-400 transition-colors mt-3"
            >
              Trocar
            </button>
          </div>
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────────────────────────────── */}
      {isManualEntry && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-base mt-0.5">✏️</span>
          <div className="text-sm">
            <span className="font-semibold text-amber-800">Entrada manual.</span>
            <span className="text-amber-700"> Preencha os campos abaixo com os valores do laudo biométrico.</span>
          </div>
        </div>
      )}
      {hasWarnings && !isManualEntry && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3 text-sm">
          <span>⚠️</span>
          <span className="text-amber-800">
            Campos marcados com <strong>!</strong> estão fora da faixa esperada — verifique antes de calcular.
          </span>
        </div>
      )}

      {/* ── 3-column layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)] gap-4 items-start">

        {/* OD */}
        <EyeColumn
          eye="OD"
          eyeData={biometry.OD}
          surgeryParams={surgeryParams}
          onFieldChange={(field, value) =>
            updateODField(field as keyof ParsedBiometry['OD'], value)
          }
          onSurgeryChange={setSurgeryParams}
        />

        {/* Sticky center panel */}
        <div className="sticky top-36">
          <ExamViewerPanel fileDataUrl={fileDataUrl} meta={meta} biometry={biometry} />
        </div>

        {/* OE */}
        <EyeColumn
          eye="OE"
          eyeData={biometry.OE}
          surgeryParams={surgeryParams}
          onFieldChange={(field, value) =>
            updateOEField(field as keyof ParsedBiometry['OE'], value)
          }
          onSurgeryChange={setSurgeryParams}
        />
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => { clearBiometry(); router.push('/') }}
          className="px-5 py-3 border border-slate-200 text-gray-600 rounded-xl font-medium
            hover:bg-slate-50 transition-colors"
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
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3
            rounded-xl font-semibold hover:bg-blue-700 disabled:bg-blue-400
            disabled:cursor-not-allowed transition-colors shadow-sm"
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
