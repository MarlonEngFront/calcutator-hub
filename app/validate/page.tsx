'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBiometryStore } from '@/app/stores/biometry-store'
import type { ParsedBiometry, BiometryMeta, SurgeryParams } from '@/app/stores/biometry-store'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const CARD_BG  = '#475361'
const TEAL     = '#4db6ac'
const EYE_COLOR = { OD: '#f29121', OE: '#71ba66' } as const

// ─── Range / decimal config ────────────────────────────────────────────────────
const RANGES: Record<string, [number, number]> = {
  K1: [36, 52], K2: [36, 52], AL: [18, 34], ACD: [1.5, 5],
  LT: [2, 7], WTW: [10, 14], CCT: [400, 700], Cyl: [0, 10],
}
const DECIMALS: Record<string, number> = {
  AL: 2, K1: 2, K2: 2, K1Axis: 0, K2Axis: 0,
  ACD: 2, LT: 2, CCT: 0, WTW: 2, Cyl: 2, Axis: 0,
  SIA: 2, SIAAxis: 0, refTarget: 2,
}
const FIELD_REF: Record<string, string> = {
  AL: '18–34 mm', K1: '36–52 D', K2: '36–52 D',
  ACD: '1.5–5 mm', LT: '2–7 mm', CCT: '400–700 µm',
  WTW: '10–14 mm', Cyl: '0–10 D',
}

function fieldStatus(field: string, v?: number): 'ok' | 'warn' | 'neutral' {
  if (v == null || !Number.isFinite(v)) return 'neutral'
  const r = RANGES[field]
  if (!r) return 'neutral'
  return v >= r[0] && v <= r[1] ? 'ok' : 'warn'
}

function toFixed(val: number | undefined, field: string): string {
  if (val == null || !Number.isFinite(val)) return ''
  return val.toFixed(DECIMALS[field] ?? 2)
}

// ─── AnatomicalGuide ───────────────────────────────────────────────────────────
function AnatomicalGuide({ side }: { side: 'OD' | 'OE' }) {
  const isOE = side === 'OE'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isOE ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.85rem',
      opacity: 0.6,
      padding: '0.7rem 0.5rem 0.3rem',
    }}>
      <div style={{ width: 52, height: 34, flexShrink: 0 }}>
        <svg viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 30C10 30 30 10 50 10C70 10 90 30 90 30C90 30 70 50 50 50C30 50 10 30 10 30Z"
            stroke="white" strokeWidth="2" />
          <circle cx="50" cy="30" r="15" stroke="white" strokeWidth="2" />
          <circle cx="50" cy="30" r="7" fill="white" />
        </svg>
      </div>
      <div style={{ width: 16, height: 34, transform: isOE ? 'rotateY(180deg)' : 'none' }}>
        <svg viewBox="0 0 40 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 10C10 10 35 30 25 50C15 70 5 70 5 70"
            stroke="white" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <span style={{
        fontSize: '0.67rem', fontWeight: 700,
        color: EYE_COLOR[side], textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        {side === 'OD' ? 'Olho Direito' : 'Olho Esquerdo'}
      </span>
    </div>
  )
}

// ─── Status icon ───────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: 'ok' | 'warn' | 'neutral' }) {
  if (status === 'ok')   return <span style={{ fontSize: '0.7rem', fontWeight: 800, color: TEAL, width: 11, flexShrink: 0 }}>✓</span>
  if (status === 'warn') return <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f29121', width: 11, flexShrink: 0 }}>!</span>
  return <span style={{ width: 11, flexShrink: 0, display: 'inline-block' }} />
}

// ─── Biometric input ───────────────────────────────────────────────────────────
interface BioInputProps {
  field: string
  value: number | undefined
  onChange: (v: number) => void
  showStatus?: boolean
  compact?: boolean
}
function BioInput({ field, value, onChange, showStatus = true, compact }: BioInputProps) {
  const d    = DECIMALS[field] ?? 2
  const step = d === 0 ? 1 : 0.01
  const status = fieldStatus(field, value)
  const display = toFixed(value, field)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
      <input
        type="number"
        step={step}
        value={display}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v) }}
        className={`input-biometric ${status === 'warn' ? 'warn' : ''}`}
        style={{
          maxWidth: compact ? 62 : 76, minWidth: compact ? 52 : 62,
          textAlign: 'center', fontSize: '0.9rem',
          padding: '0.18rem 0.12rem', height: '1.9rem',
        }}
      />
      {showStatus && <StatusIcon status={status} />}
    </div>
  )
}

// ─── Biometric table — one eye ─────────────────────────────────────────────────
interface EyeTableProps {
  eye: 'OD' | 'OE'
  eyeData: ParsedBiometry['OD']
  surgeryParams: SurgeryParams
  onFieldChange: (f: string, v: number) => void
  onSurgeryChange: (p: Partial<SurgeryParams>) => void
}

function EyeTable({ eye, eyeData, surgeryParams, onFieldChange, onSurgeryChange }: EyeTableProps) {
  const [showExtra, setShowExtra] = useState(false)
  const eyeColor   = EYE_COLOR[eye]
  const eyeLabel   = eye === 'OD' ? 'OD — Olho Direito' : 'OE — Olho Esquerdo'
  const eyeParams  = eye === 'OD' ? surgeryParams.OD : surgeryParams.OE
  const hasCyl     = eyeData.Cyl != null && Number.isFinite(eyeData.Cyl)

  type RowDef = { label: string; ref?: string; node: React.ReactNode }

  const rows: RowDef[] = [
    {
      label: 'AL',
      ref: FIELD_REF.AL,
      node: <BioInput field="AL" value={eyeData.AL} onChange={(v) => onFieldChange('AL', v)} />,
    },
    {
      label: 'K1 / K2',
      ref: FIELD_REF.K1,
      node: (
        <div style={{ display: 'flex', gap: '0.28rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {(['K1', 'K2'] as const).map((k) => {
            const axisKey = k === 'K1' ? 'K1Axis' : 'K2Axis'
            const axisVal = eyeData[axisKey]
            return (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.04rem' }}>
                <BioInput field={k} value={eyeData[k]} onChange={(v) => onFieldChange(k, v)} />
                {axisVal != null && (
                  <span style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.48)', fontWeight: 700 }}>
                    eixo {Math.round(axisVal)}°
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ),
    },
    ...(hasCyl ? [{
      label: 'CYL / Eixo',
      ref: FIELD_REF.Cyl,
      node: (
        <div style={{ display: 'flex', gap: '0.28rem', alignItems: 'center', justifyContent: 'center' }}>
          <BioInput field="Cyl" value={eyeData.Cyl} onChange={(v) => onFieldChange('Cyl', v)} />
          {eyeData.Axis != null && (
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
              @ {Math.round(eyeData.Axis)}°
            </span>
          )}
        </div>
      ),
    } as RowDef] : []),
    {
      label: 'ACD / LT',
      ref: '1.5 / 2 mm',
      node: (
        <div style={{ display: 'flex', gap: '0.28rem', justifyContent: 'center' }}>
          <BioInput field="ACD" value={eyeData.ACD} onChange={(v) => onFieldChange('ACD', v)} />
          <BioInput field="LT" value={eyeData.LT ?? 4.2} onChange={(v) => onFieldChange('LT', v)} />
        </div>
      ),
    },
    {
      label: 'CCT / WTW',
      ref: '400 / 10',
      node: (
        <div style={{ display: 'flex', gap: '0.28rem', justifyContent: 'center' }}>
          <BioInput field="CCT" value={eyeData.CCT ?? 540} onChange={(v) => onFieldChange('CCT', v)} />
          <BioInput field="WTW" value={eyeData.WTW} onChange={(v) => onFieldChange('WTW', v)} />
        </div>
      ),
    },
    {
      label: 'SIA',
      node: (
        <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center', justifyContent: 'center' }}>
          <BioInput field="SIA" value={surgeryParams.SIA}
            onChange={(v) => onSurgeryChange({ SIA: v })} showStatus={false} compact />
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>@</span>
          <BioInput field="SIAAxis" value={surgeryParams.SIAAxis}
            onChange={(v) => onSurgeryChange({ SIAAxis: v })} showStatus={false} compact />
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>°</span>
        </div>
      ),
    },
    {
      label: 'Ref. Alvo',
      node: (
        <BioInput field="refTarget" value={eyeParams.refTarget}
          onChange={(v) => {
            if (eye === 'OD') onSurgeryChange({ OD: { ...surgeryParams.OD, refTarget: v } })
            else             onSurgeryChange({ OE: { ...surgeryParams.OE, refTarget: v } })
          }} showStatus={false} />
      ),
    },
  ]

  // Campos adicionais (read-only computed)
  const avgK = (eyeData.K1 && eyeData.K2) ? ((eyeData.K1 + eyeData.K2) / 2) : undefined
  const extras = [
    { label: 'AvgK',  value: avgK,         unit: 'D',  d: 2 },
    { label: 'CYL',   value: eyeData.Cyl,  unit: 'D',  d: 2 },
    { label: 'LT',    value: eyeData.LT,   unit: 'mm', d: 2 },
    { label: 'CCT',   value: eyeData.CCT,  unit: 'µm', d: 0 },
  ].filter((f) => f.value != null && Number.isFinite(f.value as number))

  return (
    <div style={{
      background: CARD_BG,
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.05)',
      fontFamily: 'var(--font-barlow, Barlow, sans-serif)',
      overflow: 'hidden',
    }}>
      <AnatomicalGuide side={eye} />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              <th style={{
                textAlign: 'left', padding: '0.35rem 0.75rem',
                color: 'rgba(255,255,255,0.38)', fontWeight: 500,
                fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Parâmetro</th>
              <th style={{
                textAlign: 'center', padding: '0.35rem 0.4rem',
                color: eyeColor, fontWeight: 800, fontSize: '0.76rem',
                borderBottom: `2px solid ${eyeColor}`, minWidth: 165,
              }}>{eyeLabel}</th>
              <th style={{
                textAlign: 'right', padding: '0.35rem 0.75rem',
                color: 'rgba(255,255,255,0.38)', fontWeight: 500,
                fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Ref.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent' }}>
                <td style={{
                  padding: '0.3rem 0.75rem', fontWeight: 600,
                  fontSize: '0.77rem', color: '#fff', whiteSpace: 'nowrap', verticalAlign: 'middle',
                }}>{row.label}</td>
                <td style={{ padding: '0.25rem 0.35rem', textAlign: 'center', verticalAlign: 'middle' }}>
                  {row.node}
                </td>
                <td style={{
                  padding: '0.3rem 0.75rem',
                  color: 'rgba(255,255,255,0.36)', fontSize: '0.58rem',
                  whiteSpace: 'nowrap', textAlign: 'right', verticalAlign: 'middle',
                }}>{row.ref ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Campos adicionais */}
      {extras.length > 0 && (
        <>
          <button
            onClick={() => setShowExtra(!showExtra)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(255,255,255,0.035)', borderTop: '1px solid rgba(255,255,255,0.07)',
              fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.055em', color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer', border: 'none',
            }}
          >
            <span style={{ transition: 'transform 0.2s', transform: showExtra ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
            Campos Adicionais ({eye})
          </button>
          {showExtra && (
            <div style={{
              padding: '0.65rem 0.85rem',
              background: 'rgba(0,0,0,0.14)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', flexDirection: 'column', gap: '0.3rem',
            }}>
              {extras.map((f) => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{f.label}</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {(f.value as number).toFixed(f.d)} <span style={{ opacity: 0.5, fontWeight: 400 }}>{f.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Center panel — file viewer ────────────────────────────────────────────────
interface ExamViewerPanelProps {
  fileDataUrl: string | null
  meta: BiometryMeta
  biometry: ParsedBiometry
  isExpanded: boolean
  onToggleExpand: () => void
}

function ExamViewerPanel({ fileDataUrl, meta, biometry, isExpanded, onToggleExpand }: ExamViewerPanelProps) {
  const rows: Array<{ label: string; field: keyof ParsedBiometry['OD']; unit: string; d: number }> = [
    { label: 'AL',  field: 'AL',  unit: 'mm', d: 2 },
    { label: 'K1',  field: 'K1',  unit: 'D',  d: 2 },
    { label: 'K2',  field: 'K2',  unit: 'D',  d: 2 },
    { label: 'ACD', field: 'ACD', unit: 'mm', d: 2 },
    { label: 'LT',  field: 'LT',  unit: 'mm', d: 2 },
    { label: 'CCT', field: 'CCT', unit: 'µm', d: 0 },
    { label: 'WTW', field: 'WTW', unit: 'mm', d: 2 },
    { label: 'CYL', field: 'Cyl', unit: 'D',  d: 2 },
  ]
  const fmt = (v: number | undefined, d: number) =>
    v != null && Number.isFinite(v) ? (d === 0 ? Math.round(v).toString() : v.toFixed(d)) : '—'

  const isPDF   = meta.fileType === 'application/pdf'
  const isImage = meta.fileType?.startsWith('image/')
  const hasFile = !!fileDataUrl && (isPDF || isImage)

  if (hasFile) {
    return (
      <div style={{
        borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${isExpanded ? TEAL : 'rgba(255,255,255,0.1)'}`,
        outline: isExpanded ? `3px solid rgba(77,182,172,0.2)` : '3px solid transparent',
        outlineOffset: '2px',
        boxShadow: isExpanded ? '0 0 0 1px rgba(77,182,172,0.1), 0 20px 45px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.15)',
        transform: isExpanded ? 'scale(1.006)' : 'scale(1)',
        transition: ['border-color 0.4s ease', 'outline-color 0.4s ease', 'box-shadow 0.4s ease', 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)'].join(', '),
      }}>
        <div style={{
          padding: '0.55rem 0.85rem', background: '#394149', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-barlow, Barlow, sans-serif)',
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Biometria Original
          </span>
          <a href={fileDataUrl!} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', padding: '0.25rem 0.6rem', borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ↗ Nova Aba
          </a>
          <button
            onClick={onToggleExpand}
            style={{
              fontSize: '0.65rem', padding: '0.25rem 0.7rem', borderRadius: 100,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700,
              background: isExpanded ? TEAL : 'rgba(255,255,255,0.08)',
              color: isExpanded ? '#fff' : 'rgba(255,255,255,0.6)',
              transition: 'background 0.3s, color 0.3s',
            }}
          >
            {isExpanded ? '⤡ Reduzir' : '⤢ Ampliar'}
          </button>
        </div>
        <div style={{
          overflow: 'hidden', background: '#2a3340',
          height: isExpanded ? '78vh' : '400px',
          transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {isPDF && <iframe src={fileDataUrl!} className="w-full h-full border-0" title="Biometria original" />}
          {isImage && (
            <div className="w-full h-full overflow-y-auto flex items-start justify-center" style={{ cursor: isExpanded ? 'zoom-out' : 'zoom-in' }} onClick={onToggleExpand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileDataUrl!} className="w-full h-auto object-contain" alt="Biometria original" />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Fallback: tabela comparativa numérica
  return (
    <div style={{
      background: CARD_BG, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      color: '#fff', border: '1px solid rgba(255,255,255,0.05)',
      fontFamily: 'var(--font-barlow, Barlow, sans-serif)', overflow: 'hidden',
    }}>
      <div style={{ padding: '0.75rem 1rem', background: '#394149', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)' }}>Biometria</p>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.equipment ?? meta.filename}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.12)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: EYE_COLOR.OD, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OD</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: EYE_COLOR.OE, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OE</span>
      </div>
      {rows.map((row, i) => {
        const od = biometry.OD[row.field] as number | undefined
        const oe = biometry.OE[row.field] as number | undefined
        if (od == null && oe == null) return null
        const odSt = fieldStatus(row.field === 'Cyl' ? 'Cyl' : row.label, od)
        const oeSt = fieldStatus(row.field === 'Cyl' ? 'Cyl' : row.label, oe)
        return (
          <div key={row.label} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem',
            padding: '0.4rem 0.75rem', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, alignSelf: 'center' }}>
              {row.label} <span style={{ opacity: 0.5, fontWeight: 400 }}>{row.unit}</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: odSt === 'warn' ? '#f29121' : EYE_COLOR.OD }}>
                {fmt(od, row.d)}
              </span>
              <StatusIcon status={odSt} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: oeSt === 'warn' ? '#f29121' : EYE_COLOR.OE }}>
                {fmt(oe, row.d)}
              </span>
              <StatusIcon status={oeSt} />
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
  const [isConfirming, setIsConfirming]     = useState(false)
  const [isPanelExpanded, setIsPanelExpanded] = useState(true)

  if (!biometry || !meta) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center', padding: '5rem 1rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📭</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          Nenhuma biometria carregada
        </h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Envie um arquivo de exame para continuar.</p>
        <button onClick={() => router.push('/')}
          className="btn-med-primary"
          style={{ background: '#2563eb' }}>
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
    <div style={{
      margin: '0 auto',
      maxWidth: isPanelExpanded ? '1700px' : '1000px',
      transition: 'max-width 0.5s cubic-bezier(0.4,0,0.2,1)',
      fontFamily: 'var(--font-barlow, Barlow, sans-serif)',
    }}>
      {/* ── Header dark card ──────────────────────────────────────────────────── */}
      <div style={{
        background: '#394149',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        marginBottom: '1.25rem',
        color: '#fff',
      }}>
        <div style={{ padding: '1.1rem 1.5rem 0.9rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: 'rgba(77,182,172,0.18)', color: TEAL,
            fontSize: '0.65rem', fontWeight: 800, padding: '0.22rem 0.65rem',
            borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.05em',
            marginBottom: '0.6rem',
          }}>
            ✦ {isManualEntry ? 'Entrada Manual' : 'Dados Extraídos por IA'}
          </span>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
            Revise os parâmetros biométricos
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>
            Compare os dados extraídos com o exame original abaixo.
          </p>
        </div>

        {/* Patient strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { label: 'Paciente', value: meta.patientName ?? '—' },
            { label: 'Gênero',   value: meta.gender ?? '—' },
            { label: 'Exame',    value: meta.equipment ?? meta.filename },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              padding: '0.75rem 1.25rem',
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            }}>
              <p style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.055em', color: 'rgba(255,255,255,0.4)' }}>
                {label}
              </p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alertas ───────────────────────────────────────────────────────────── */}
      {isManualEntry && (
        <div style={{
          background: 'rgba(242,145,33,0.08)', border: '1px solid rgba(242,145,33,0.3)',
          borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem',
          display: 'flex', gap: '0.65rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '0.9rem', marginTop: '0.05rem' }}>✏️</span>
          <div style={{ fontSize: '0.82rem', color: '#fff' }}>
            <strong style={{ color: '#f29121' }}>Entrada manual.</strong>{' '}
            <span style={{ opacity: 0.75 }}>Preencha os campos abaixo com os valores do laudo biométrico.</span>
          </div>
        </div>
      )}
      {hasWarnings && !isManualEntry && (
        <div style={{
          background: 'rgba(242,145,33,0.08)', border: '1px solid rgba(242,145,33,0.3)',
          borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem',
          display: 'flex', gap: '0.65rem', alignItems: 'flex-start',
        }}>
          <span>⚠️</span>
          <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
            Campos marcados com <strong style={{ color: '#f29121' }}>!</strong> estão fora da faixa esperada — verifique antes de calcular.
          </span>
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1rem',
      }}>
        <span><span style={{ color: TEAL, fontWeight: 800 }}>✓</span> OK</span>
        <span><span style={{ color: '#f29121', fontWeight: 800 }}>!</span> Alerta Clínico</span>
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>Inputs editáveis — arraste ou digite</span>
      </div>

      {/* ── 3-column grid ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isPanelExpanded ? '1fr 2.2fr 1fr' : '1fr 240px 1fr',
        gap: '1.1rem',
        alignItems: 'start',
        transition: 'grid-template-columns 0.5s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* OD */}
        <EyeTable
          eye="OD"
          eyeData={biometry.OD}
          surgeryParams={surgeryParams}
          onFieldChange={(f, v) => updateODField(f as keyof ParsedBiometry['OD'], v)}
          onSurgeryChange={setSurgeryParams}
        />

        {/* Centro — sticky */}
        <div style={{ position: 'sticky', top: '9rem' }}>
          <ExamViewerPanel
            fileDataUrl={fileDataUrl}
            meta={meta}
            biometry={biometry}
            isExpanded={isPanelExpanded}
            onToggleExpand={() => setIsPanelExpanded((v) => !v)}
          />
        </div>

        {/* OE */}
        <EyeTable
          eye="OE"
          eyeData={biometry.OE}
          surgeryParams={surgeryParams}
          onFieldChange={(f, v) => updateOEField(f as keyof ParsedBiometry['OE'], v)}
          onSurgeryChange={setSurgeryParams}
        />
      </div>

      {/* ── Ações ─────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        marginTop: '1.5rem', paddingTop: '0.5rem',
      }}>
        <button
          onClick={() => { clearBiometry(); router.push('/') }}
          className="btn-med-secondary"
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
          className="btn-med-primary"
          style={{ flex: 1, maxWidth: 420 }}
        >
          {isConfirming ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="animate-spin-med" style={{
                display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
              }} />
              Confirmando...
            </span>
          ) : 'Confirmar e selecionar calculadoras →'}
        </button>
      </div>
    </div>
  )
}
