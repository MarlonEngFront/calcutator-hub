'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useBiometryStore } from '@/app/stores/biometry-store'
import type { ParsedBiometry, BiometryMeta, SurgeryParams, KeratometryReadings, KeratometryReading } from '@/app/stores/biometry-store'

// ─── Design tokens — light theme ───────────────────────────────────────────────
const CARD_BG      = '#f8fafc'
const CARD_HDR     = '#eef2f7'
const TEAL         = '#0b8a7e'
const BORDER       = '#d1dce8'
const TEXT         = '#1e293b'
const TEXT_MED     = '#475569'
const TEXT_MUTED   = '#94a3b8'
const EYE_COLOR    = { OD: '#d97706', OE: '#16a34a' } as const

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

// ─── Filter raw measurements for Campos Adicionais ─────────────────────────────
const EXCLUDE_RAW = /^(k1[^a-z]|k1$|k2[^a-z]|k2$|tk1|tk2|cyl\b|cylinder|axis\b|avgk|avg\s*k|flatk|steepk|k\s+flat|k\s+steep|axial|axiallength|al\b|al\s*\(|__id_|k1_|k2_|k1axis|k2axis|axialk|astig|meank)/i
const HAS_DIAM = /2dot4|3dot3/i

function filterRawMeasurements(raw: Record<string, string>): Array<{ label: string; value: string }> {
  // Deduplicate by value: prefer displayName (no underscore) over typeName (with underscore)
  const valToLabel = new Map<string, string>()
  for (const [label, val] of Object.entries(raw)) {
    if (!val || EXCLUDE_RAW.test(label) || HAS_DIAM.test(label)) continue
    const prev = valToLabel.get(val)
    if (!prev) { valToLabel.set(val, label); continue }
    const prevUnderscore = prev.includes('_')
    const curUnderscore  = label.includes('_')
    if (prevUnderscore && !curUnderscore)   valToLabel.set(val, label) // prefer no underscore
    else if (!prevUnderscore && curUnderscore) { /* keep prev */ }
    else if (label.length > prev.length)    valToLabel.set(val, label)
  }
  return Array.from(valToLabel.entries()).map(([val, label]) => ({ label, value: val }))
}

// ─── AnatomicalGuide ───────────────────────────────────────────────────────────
function AnatomicalGuide({ side }: { side: 'OD' | 'OE' }) {
  const isOE = side === 'OE'
  return (
    <div style={{
      display: 'flex', flexDirection: isOE ? 'row-reverse' : 'row',
      alignItems: 'center', justifyContent: 'center',
      gap: '0.85rem', padding: '0.7rem 0.5rem 0.3rem',
    }}>
      <div style={{ width: 44, height: 28, flexShrink: 0, opacity: 0.55 }}>
        <svg viewBox="0 0 100 60" fill="none">
          <path d="M10 30C10 30 30 10 50 10C70 10 90 30 90 30C90 30 70 50 50 50C30 50 10 30 10 30Z" stroke={TEXT} strokeWidth="2" />
          <circle cx="50" cy="30" r="15" stroke={TEXT} strokeWidth="2" />
          <circle cx="50" cy="30" r="7" fill={TEXT} />
        </svg>
      </div>
      <div style={{ width: 14, height: 28, transform: isOE ? 'rotateY(180deg)' : 'none', opacity: 0.55 }}>
        <svg viewBox="0 0 40 80" fill="none">
          <path d="M10 10C10 10 35 30 25 50C15 70 5 70 5 70" stroke={TEXT} strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: EYE_COLOR[side], textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {side === 'OD' ? 'Olho Direito' : 'Olho Esquerdo'}
      </span>
    </div>
  )
}

// ─── Status icon ───────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: 'ok' | 'warn' | 'neutral' }) {
  if (status === 'ok')   return <span style={{ fontSize: '0.78rem', fontWeight: 800, color: TEAL, width: 12, flexShrink: 0 }}>✓</span>
  if (status === 'warn') return <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#d97706', width: 12, flexShrink: 0 }}>!</span>
  return <span style={{ width: 12, flexShrink: 0, display: 'inline-block' }} />
}

// ─── Biometric input ───────────────────────────────────────────────────────────
interface BioInputProps { field: string; value: number | undefined; onChange: (v: number) => void; showStatus?: boolean; compact?: boolean }
function BioInput({ field, value, onChange, showStatus = true, compact }: BioInputProps) {
  const d = DECIMALS[field] ?? 2
  const status = fieldStatus(field, value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
      <input
        type="number" step={d === 0 ? 1 : 0.01}
        value={toFixed(value, field)}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v) }}
        className={`input-biometric ${status === 'warn' ? 'warn' : ''}`}
        style={{
          maxWidth: compact ? 52 : 63, minWidth: compact ? 42 : 50,
          textAlign: 'center', fontSize: '0.92rem',
          padding: '0.18rem 0.1rem', height: '1.75rem',
          background: '#fff', color: TEXT, border: `1px solid ${BORDER}`,
          borderRadius: 6,
        }}
      />
      {showStatus && <StatusIcon status={status} />}
    </div>
  )
}

// ─── KSection (Ceratometria 2.4 / 3.3) ────────────────────────────────────────
interface KSectionProps { ref_mm: '2.4' | '3.3'; reading: KeratometryReading; selected: boolean; onSelect: () => void }
function KSection({ ref_mm, reading, selected, onSelect }: KSectionProps) {
  const cyl = reading.Cyl ?? (reading.K1 != null && reading.K2 != null ? reading.K1 - reading.K2 : undefined)
  const cylAxis = reading.Axis ?? reading.K2Axis

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: TEXT_MUTED, padding: '0.4rem 0.75rem 0.15rem' }}>
        — Ceratometria ({ref_mm} mm) —
      </div>
      <div
        onClick={onSelect}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          padding: '0.28rem 0.75rem 0.4rem',
          cursor: 'pointer',
          background: selected ? 'rgba(11,138,126,0.07)' : 'transparent',
          borderLeft: selected ? `3px solid ${TEAL}` : `3px solid transparent`,
          transition: 'background 0.18s, border-color 0.18s',
        }}
      >
        {/* Radio */}
        <div style={{
          width: 15, height: 15, borderRadius: '50%', flexShrink: 0, marginTop: 3,
          border: `2px solid ${selected ? TEAL : BORDER}`,
          background: selected ? TEAL : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.18s, background 0.18s',
        }}>
          {selected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.80rem', fontWeight: 700, color: selected ? TEAL : TEXT_MED, marginBottom: '0.3rem' }}>
            K1 / K2 (ref: {ref_mm})
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {(['K1', 'K2'] as const).map((k) => {
              const ax = k === 'K1' ? reading.K1Axis : reading.K2Axis
              const val = reading[k]
              const st  = fieldStatus(k, val)
              return (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '0.04rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.96rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: selected ? TEXT : TEXT_MED }}>
                      {val != null ? val.toFixed(2) : '—'}
                    </span>
                    {selected && <StatusIcon status={st} />}
                  </div>
                  {ax != null && (
                    <span style={{ fontSize: '0.72rem', color: TEXT_MUTED, fontWeight: 600 }}>eixo {Math.round(ax)}°</span>
                  )}
                </div>
              )
            })}
          </div>
          {cyl != null && (
            <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '0.22rem', color: selected ? TEXT_MED : TEXT_MUTED }}>
              CYL {cyl >= 0 ? '+' : ''}{cyl.toFixed(2)} D{cylAxis != null ? ` — eixo ${Math.round(cylAxis)}°` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── EyeTable ──────────────────────────────────────────────────────────────────
interface EyeTableProps {
  eye: 'OD' | 'OE'
  eyeData: ParsedBiometry['OD']
  kReadings?: KeratometryReadings | null
  rawMeasurements?: Record<string, string> | null
  surgeryParams: SurgeryParams
  onFieldChange: (f: string, v: number) => void
  onSurgeryChange: (p: Partial<SurgeryParams>) => void
}

function EyeTable({ eye, eyeData, kReadings, rawMeasurements, surgeryParams, onFieldChange, onSurgeryChange }: EyeTableProps) {
  const [showExtra, setShowExtra] = useState(false)
  const eyeColor  = EYE_COLOR[eye]
  const eyeLabel  = eye === 'OD' ? 'OD — Olho Direito' : 'OE — Olho Esquerdo'
  const eyeParams = eye === 'OD' ? surgeryParams.OD : surgeryParams.OE

  const k24 = eye === 'OD' ? kReadings?.ref2dot4?.OD : kReadings?.ref2dot4?.OE
  const k33 = eye === 'OD' ? kReadings?.ref3dot3?.OD : kReadings?.ref3dot3?.OE
  const hasKSections = !!(k24 || k33)
  const [kSource, setKSource] = useState<'2.4' | '3.3'>('2.4')

  const applyKReading = useCallback((reading: KeratometryReading | undefined) => {
    if (!reading) return
    if (reading.K1    != null) onFieldChange('K1',    reading.K1)
    if (reading.K2    != null) onFieldChange('K2',    reading.K2)
    if (reading.K1Axis != null) onFieldChange('K1Axis', reading.K1Axis)
    if (reading.K2Axis != null) onFieldChange('K2Axis', reading.K2Axis)
    if (reading.Cyl   != null) onFieldChange('Cyl',   reading.Cyl)
    if (reading.Axis  != null) onFieldChange('Axis',  reading.Axis)
  }, [onFieldChange])

  const handleSelect = useCallback((src: '2.4' | '3.3') => {
    setKSource(src)
    applyKReading(src === '2.4' ? k24 : k33)
  }, [k24, k33, applyKReading])

  const hasCyl = !hasKSections && eyeData.Cyl != null && Number.isFinite(eyeData.Cyl)

  type RowDef = { label: string; ref?: string; node: React.ReactNode }
  const rows: RowDef[] = [
    ...(!hasKSections ? [{
      label: 'K1 / K2', ref: '36–52 D',
      node: (
        <div style={{ display: 'flex', gap: '0.28rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {(['K1', 'K2'] as const).map((k) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.04rem' }}>
              <BioInput field={k} value={eyeData[k]} onChange={(v) => onFieldChange(k, v)} />
              {eyeData[k === 'K1' ? 'K1Axis' : 'K2Axis'] != null && (
                <span style={{ fontSize: '0.72rem', color: TEXT_MUTED, fontWeight: 600 }}>
                  eixo {Math.round(eyeData[k === 'K1' ? 'K1Axis' : 'K2Axis'] as number)}°
                </span>
              )}
            </div>
          ))}
        </div>
      ),
    } as RowDef] : []),
    ...(!hasKSections && hasCyl ? [{
      label: 'CYL / Eixo', ref: '0–10 D',
      node: (
        <div style={{ display: 'flex', gap: '0.28rem', alignItems: 'center', justifyContent: 'center' }}>
          <BioInput field="Cyl" value={eyeData.Cyl} onChange={(v) => onFieldChange('Cyl', v)} />
          {eyeData.Axis != null && <span style={{ fontSize: '0.86rem', color: TEXT_MED, fontWeight: 700 }}>@ {Math.round(eyeData.Axis)}°</span>}
        </div>
      ),
    } as RowDef] : []),
    {
      label: 'Comprimento Axial', ref: '20',
      node: <BioInput field="AL" value={eyeData.AL} onChange={(v) => onFieldChange('AL', v)} />,
    },
    {
      label: 'ACD / LT', ref: '2/2',
      node: (
        <div style={{ display: 'flex', gap: '0.28rem', justifyContent: 'center' }}>
          <BioInput field="ACD" value={eyeData.ACD} onChange={(v) => onFieldChange('ACD', v)} />
          <BioInput field="LT"  value={eyeData.LT ?? 4.2} onChange={(v) => onFieldChange('LT', v)} />
        </div>
      ),
    },
    {
      label: 'CCT / WTW', ref: '400/10',
      node: (
        <div style={{ display: 'flex', gap: '0.28rem', justifyContent: 'center' }}>
          <BioInput field="CCT" value={eyeData.CCT ?? 540} onChange={(v) => onFieldChange('CCT', v)} />
          <BioInput field="WTW" value={eyeData.WTW} onChange={(v) => onFieldChange('WTW', v)} />
        </div>
      ),
    },
    {
      label: 'SIA (Cirurgião)', ref: '0/0',
      node: (
        <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center', justifyContent: 'center' }}>
          <BioInput field="SIA" value={surgeryParams.SIA} onChange={(v) => onSurgeryChange({ SIA: v })} showStatus={false} compact />
          <span style={{ fontSize: '0.86rem', color: TEXT_MED, fontWeight: 700 }}>@</span>
          <BioInput field="SIAAxis" value={surgeryParams.SIAAxis} onChange={(v) => onSurgeryChange({ SIAAxis: v })} showStatus={false} compact />
          <span style={{ fontSize: '0.80rem', color: TEXT_MED }}>°</span>
        </div>
      ),
    },
    {
      label: 'Refração Alvo', ref: '-3',
      node: (
        <BioInput field="refTarget" value={eyeParams.refTarget}
          onChange={(v) => {
            if (eye === 'OD') onSurgeryChange({ OD: { ...surgeryParams.OD, refTarget: v } })
            else             onSurgeryChange({ OE: { ...surgeryParams.OE, refTarget: v } })
          }} showStatus={false} />
      ),
    },
  ]

  // ── Campos adicionais ────────────────────────────────────────────────────────
  const buildKBlock = (r: KeratometryReading | undefined, label: string) => {
    if (!r) return []
    const avgK = r.K1 != null && r.K2 != null ? (r.K1 + r.K2) / 2 : undefined
    const cyl  = r.Cyl ?? (r.K1 != null && r.K2 != null ? Math.abs(r.K1 - r.K2) : undefined)
    return [
      { header: true,  label: `— CERATOMETRIA (${label}) —` },
      ...(r.K1    != null ? [{ indent: true, label: `K1 ${label}`,     display: `+${r.K1.toFixed(2)} D` }] : []),
      ...(r.K1Axis != null ? [{ indent: true, label: `K1 Axis ${label}`, display: `${Math.round(r.K1Axis)}°` }] : []),
      ...(r.K2    != null ? [{ indent: true, label: `K2 ${label}`,     display: `+${r.K2.toFixed(2)} D` }] : []),
      ...(r.K2Axis != null ? [{ indent: true, label: `K2 Axis ${label}`, display: `${Math.round(r.K2Axis)}°` }] : []),
      ...(avgK    != null ? [{ indent: true, label: `AvgK ${label}`,   display: `+${avgK.toFixed(2)} D` }] : []),
      ...(cyl     != null ? [{ indent: true, label: `CYL ${label}`,    display: `${cyl >= 0 ? '+' : ''}${cyl.toFixed(2)} D` }] : []),
    ]
  }

  const rawExtras = rawMeasurements ? filterRawMeasurements(rawMeasurements) : []

  const extraItems: Array<{ header?: boolean; label: string; display?: string }> = [
    { label: 'Axial Length', display: eyeData.AL != null ? `${eyeData.AL.toFixed(2)} mm` : undefined },
    ...(hasKSections ? [
      ...buildKBlock(k24, '2.4'),
      ...buildKBlock(k33, '3.3'),
    ] : [
      ...(eyeData.K1 != null && eyeData.K2 != null ? [{ label: 'AvgK', display: `+${((eyeData.K1 + eyeData.K2) / 2).toFixed(2)} D` }] : []),
      ...(eyeData.Cyl != null ? [{ label: 'CYL', display: `${eyeData.Cyl.toFixed(2)} D` }] : []),
      ...(eyeData.LT  != null ? [{ label: 'LT',  display: `${eyeData.LT.toFixed(2)} mm` }] : []),
      ...(eyeData.CCT != null ? [{ label: 'CCT', display: `${Math.round(eyeData.CCT)} µm` }] : []),
    ]),
    ...rawExtras.map((r) => ({ header: false as const, label: r.label, display: r.value })),
  ].filter((f) => (f as { header?: boolean }).header || f.display != null)

  return (
    <div style={{
      background: CARD_BG, borderRadius: 12,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      border: `1px solid ${BORDER}`,
      fontFamily: 'var(--font-barlow, Barlow, sans-serif)',
      overflow: 'hidden',
    }}>
      <AnatomicalGuide side={eye} />

      {/* K sections */}
      {hasKSections && (
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          {k24 && <KSection ref_mm="2.4" reading={k24} selected={kSource === '2.4'} onSelect={() => handleSelect('2.4')} />}
          {k33 && <KSection ref_mm="3.3" reading={k33} selected={kSource === '3.3'} onSelect={() => handleSelect('3.3')} />}
        </div>
      )}

      {/* Main table */}
      <div style={{ overflowX: 'auto', borderTop: `1px solid ${BORDER}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.96rem' }}>
          <thead>
            <tr style={{ background: CARD_HDR }}>
              <th style={{ textAlign: 'left', padding: '0.32rem 0.45rem', color: TEXT_MUTED, fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Parâmetro</th>
              <th style={{ textAlign: 'center', padding: '0.32rem 0.3rem', color: eyeColor, fontWeight: 800, fontSize: '0.85rem', borderBottom: `2px solid ${eyeColor}`, minWidth: 130 }}>{eyeLabel}</th>
              <th style={{ textAlign: 'right', padding: '0.32rem 0.45rem', color: TEXT_MUTED, fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ref.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} style={{ background: i % 2 === 0 ? 'rgba(0,0,0,0.018)' : 'transparent', borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: '0.28rem 0.45rem', fontWeight: 600, fontSize: '0.86rem', color: TEXT_MED, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{row.label}</td>
                <td style={{ padding: '0.22rem 0.25rem', textAlign: 'center', verticalAlign: 'middle' }}>{row.node}</td>
                <td style={{ padding: '0.28rem 0.45rem', color: TEXT_MUTED, fontSize: '0.70rem', whiteSpace: 'nowrap', textAlign: 'right', verticalAlign: 'middle' }}>{row.ref ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Campos adicionais */}
      {extraItems.length > 0 && (
        <>
          <button
            onClick={() => setShowExtra(!showExtra)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.48rem 0.75rem',
              background: CARD_HDR, borderTop: `1px solid ${BORDER}`,
              fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: TEXT_MED,
              cursor: 'pointer', border: 'none',
            }}
          >
            <span style={{ transition: 'transform 0.2s', transform: showExtra ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
            Campos Adicionais ({eye})
          </button>
          {showExtra && (
            <div style={{ padding: '0.6rem 0.85rem', background: '#fff', borderTop: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {extraItems.map((f, i) => {
                const isHeader = (f as { header?: boolean }).header
                const isIndent = (f as { indent?: boolean }).indent
                if (isHeader) return (
                  <div key={`h-${i}`} style={{ fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: TEXT_MUTED, marginTop: i > 0 ? '0.5rem' : 0 }}>
                    {f.label}
                  </div>
                )
                return (
                  <div key={`${f.label}-${i}`} style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem',
                    borderBottom: `1px solid ${BORDER}`, paddingBottom: '0.22rem',
                    paddingLeft: isIndent ? '0.75rem' : 0,
                  }}>
                    <span style={{ color: isIndent ? TEXT_MED : TEXT, fontWeight: isIndent ? 500 : 600 }}>{f.label}</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: TEXT }}>{f.display}</span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── ExamViewerPanel ───────────────────────────────────────────────────────────
interface ExamViewerPanelProps { fileDataUrl: string | null; meta: BiometryMeta; biometry: ParsedBiometry; isExpanded: boolean; onToggleExpand: () => void }
function ExamViewerPanel({ fileDataUrl, meta, biometry, isExpanded, onToggleExpand }: ExamViewerPanelProps) {
  const isPDF   = meta.fileType === 'application/pdf'
  // fileDataUrl is now a blob: URL (created via URL.createObjectURL in upload page)
  // No conversion needed — works directly in embed/img

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

  const isImage = meta.fileType?.startsWith('image/')
  const hasFile = !!fileDataUrl && (isPDF || isImage)

  if (hasFile) {
    return (
      <div style={{
        borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${isExpanded ? TEAL : BORDER}`,
        outline: isExpanded ? `3px solid rgba(11,138,126,0.15)` : '3px solid transparent',
        outlineOffset: '2px',
        boxShadow: isExpanded ? '0 8px 32px rgba(0,0,0,0.12)' : '0 2px 12px rgba(0,0,0,0.07)',
        transform: isExpanded ? 'scale(1.005)' : 'scale(1)',
        transition: 'border-color 0.3s, outline-color 0.3s, box-shadow 0.3s, transform 0.3s',
      }}>
        <div style={{
          padding: '0.5rem 0.85rem', background: CARD_HDR, borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: TEXT_MED, flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Biometria Original
          </span>
          <a href={fileDataUrl!} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.74rem', color: TEXT_MED, padding: '0.22rem 0.55rem', borderRadius: 4, border: `1px solid ${BORDER}`, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ↗ Nova Aba
          </a>
          <button onClick={onToggleExpand}
            style={{
              fontSize: '0.74rem', padding: '0.22rem 0.65rem', borderRadius: 100,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700,
              background: isExpanded ? TEAL : BORDER,
              color: isExpanded ? '#fff' : TEXT_MED,
              transition: 'background 0.2s, color 0.2s',
            }}>
            {isExpanded ? '⤡ Reduzir' : '⤢ Ampliar'}
          </button>
        </div>
        <div style={{
          overflow: 'hidden', background: '#f1f5f9',
          height: isExpanded ? '78vh' : '400px',
          transition: 'height 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {isPDF && fileDataUrl && (
            <embed
              src={fileDataUrl}
              type="application/pdf"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          )}
          {isImage && (
            <div className="w-full h-full overflow-y-auto flex items-start justify-center" style={{ cursor: 'zoom-in' }} onClick={onToggleExpand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileDataUrl!} className="w-full h-auto object-contain" alt="Biometria original" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: CARD_BG, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
      <div style={{ padding: '0.75rem 1rem', background: CARD_HDR, borderBottom: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: TEXT_MUTED }}>Biometria</p>
        <p style={{ fontSize: '0.94rem', fontWeight: 700, color: TEXT, marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.equipment ?? meta.filename}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0.35rem 0.75rem', background: CARD_HDR, borderBottom: `1px solid ${BORDER}` }}>
        <span />
        <span style={{ fontSize: '0.80rem', fontWeight: 800, color: EYE_COLOR.OD, textAlign: 'center', textTransform: 'uppercase' }}>OD</span>
        <span style={{ fontSize: '0.80rem', fontWeight: 800, color: EYE_COLOR.OE, textAlign: 'center', textTransform: 'uppercase' }}>OE</span>
      </div>
      {rows.map((row, i) => {
        const od = biometry.OD[row.field] as number | undefined
        const oe = biometry.OE[row.field] as number | undefined
        if (od == null && oe == null) return null
        return (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0.35rem 0.75rem', background: i % 2 === 0 ? 'rgba(0,0,0,0.018)' : 'transparent', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: '0.85rem', color: TEXT_MED, fontWeight: 600 }}>{row.label} <span style={{ opacity: 0.55, fontWeight: 400 }}>{row.unit}</span></span>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: EYE_COLOR.OD, textAlign: 'center' }}>{fmt(od, row.d)}</span>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: EYE_COLOR.OE, textAlign: 'center' }}>{fmt(oe, row.d)}</span>
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
    fileDataUrl, kReadings, rawMeasurements,
  } = useBiometryStore()
  const [isConfirming, setIsConfirming]     = useState(false)
  const [isPanelExpanded, setIsPanelExpanded] = useState(true)

  if (!biometry || !meta) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center', padding: '5rem 1rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📭</div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: TEXT, marginBottom: '0.5rem' }}>Nenhuma biometria carregada</h2>
        <p style={{ color: TEXT_MED, marginBottom: '1.5rem' }}>Envie um arquivo de exame para continuar.</p>
        <button onClick={() => router.push('/')} className="btn-med-primary" style={{ background: TEAL }}>Ir para upload</button>
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
      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        marginBottom: '1.25rem',
      }}>
        <div style={{ padding: '1.1rem 1.5rem 0.9rem', background: CARD_HDR, borderBottom: `1px solid ${BORDER}` }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: 'rgba(11,138,126,0.1)', color: TEAL,
            fontSize: '0.74rem', fontWeight: 800, padding: '0.2rem 0.6rem',
            borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.05em',
            marginBottom: '0.55rem',
          }}>
            ✦ {isManualEntry ? 'Entrada Manual' : 'Dados Extraídos por IA'}
          </span>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT }}>Revise os parâmetros biométricos</h1>
          <p style={{ fontSize: '0.96rem', color: TEXT_MED, marginTop: '0.2rem' }}>Compare os dados extraídos com o exame original abaixo.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { label: 'Paciente', value: meta.patientName ?? '—' },
            { label: 'Gênero',   value: meta.gender ?? '—' },
            { label: 'Exame',    value: meta.equipment ?? meta.filename },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ padding: '0.7rem 1.25rem', borderLeft: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
              <p style={{ fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: TEXT_MUTED }}>{label}</p>
              <p style={{ fontSize: '0.96rem', fontWeight: 700, color: TEXT, marginTop: '0.12rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alertas ─────────────────────────────────────────────────────────── */}
      {(isManualEntry || hasWarnings) && (
        <div style={{
          background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.25)',
          borderRadius: 10, padding: '0.7rem 1rem', marginBottom: '1rem',
          display: 'flex', gap: '0.65rem', alignItems: 'flex-start',
        }}>
          <span>{isManualEntry ? '✏️' : '⚠️'}</span>
          <span style={{ fontSize: '0.92rem', color: TEXT }}>
            {isManualEntry
              ? <><strong style={{ color: '#d97706' }}>Entrada manual.</strong> Preencha os campos abaixo com os valores do laudo biométrico.</>
              : <>Campos com <strong style={{ color: '#d97706' }}>!</strong> fora da faixa — verifique antes de calcular.</>
            }
          </span>
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: TEXT_MUTED, marginBottom: '1rem' }}>
        <span><span style={{ color: TEAL, fontWeight: 800 }}>✓</span> OK</span>
        <span><span style={{ color: '#d97706', fontWeight: 800 }}>!</span> Alerta Clínico</span>
        <span>Inputs editáveis — arraste ou digite</span>
      </div>

      {/* ── 3-column grid ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isPanelExpanded ? '1fr 1.7fr 1fr' : '1fr 200px 1fr',
        gap: '1.1rem', alignItems: 'start',
        transition: 'grid-template-columns 0.5s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <EyeTable
          eye="OD" eyeData={biometry.OD} kReadings={kReadings}
          rawMeasurements={rawMeasurements?.OD ?? null}
          surgeryParams={surgeryParams}
          onFieldChange={(f, v) => updateODField(f as keyof ParsedBiometry['OD'], v)}
          onSurgeryChange={setSurgeryParams}
        />
        <div style={{ position: 'sticky', top: '9rem' }}>
          <ExamViewerPanel fileDataUrl={fileDataUrl} meta={meta} biometry={biometry} isExpanded={isPanelExpanded} onToggleExpand={() => setIsPanelExpanded((v) => !v)} />
        </div>
        <EyeTable
          eye="OE" eyeData={biometry.OE} kReadings={kReadings}
          rawMeasurements={rawMeasurements?.OE ?? null}
          surgeryParams={surgeryParams}
          onFieldChange={(f, v) => updateOEField(f as keyof ParsedBiometry['OE'], v)}
          onSurgeryChange={setSurgeryParams}
        />
      </div>

      {/* ── Ações ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '0.5rem' }}>
        <button onClick={() => { clearBiometry(); router.push('/') }} className="btn-med-secondary">← Voltar</button>
        <button
          onClick={async () => { setIsConfirming(true); await new Promise((r) => setTimeout(r, 400)); router.push('/calculators') }}
          disabled={isConfirming}
          className="btn-med-primary"
          style={{ flex: 1, maxWidth: 420, background: TEAL }}
        >
          {isConfirming
            ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="animate-spin-med" style={{ display: 'inline-block', width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                Confirmando...
              </span>
            : 'Confirmar e selecionar lentes →'}
        </button>
      </div>
    </div>
  )
}
