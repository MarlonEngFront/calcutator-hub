'use client'

import { useState, useCallback, memo, type CSSProperties, type ReactNode } from 'react'
import { formatKeratometryGroupHeaderLabel } from '@/app/lib/biometric-measurement-order'
import { getBiometryTheme, type BiometryUiTheme } from '@/app/lib/biometry-theme'
import { BIOMETRIC_RANGES, isInRange, type BiometricKey } from '@/app/types/biometrics'
import type { EyeData } from '@/app/types/biometrics'

type NidekKeratometryReading = {
  K1?: number
  K2?: number
  K1Axis?: number
  K2Axis?: number
  Cyl?: number
  Axis?: number
}

/** Duas linhas K1/K2 (ref 2.4 e 3.3) com radio — Nidek AL-Scan */
export type NidekKeratometrySelection = {
  selectedRef: '2.4' | '3.3'
  onSelectRef: (ref: '2.4' | '3.3') => void
  /** Leituras por diâmetro para este olho (OD ou OE) */
  ref24: NidekKeratometryReading
  ref33: NidekKeratometryReading
}

export type TotalKeratometrySelection = {
  selectedSource: 'anterior' | 'total'
  onSelectSource: (source: 'anterior' | 'total') => void
  anterior: { K1?: number; K2?: number; K1Axis?: number; K2Axis?: number }
  total: { K1?: number; K2?: number; K1Axis?: number; K2Axis?: number }
}

interface BiometricTableProps {
  side: 'OD' | 'OE'
  data: EyeData
  originalData?: EyeData | null
  onChange: (key: BiometricKey, value: number) => void
  showTotalK?: boolean
  theme?: BiometryUiTheme
  /** Nidek: duas linhas visíveis + seleção de qual ref alimenta o cálculo */
  nidekKRows?: NidekKeratometrySelection
  totalKRows?: TotalKeratometrySelection
}

type FieldGroup = {
  keys: BiometricKey[]
  label?: string
}

const FIELD_GROUPS: FieldGroup[] = [
  { keys: ['AL'] },
  { keys: ['K1', 'K2'], label: 'K1 / K2 (Ant.)' },
  { keys: ['TK1', 'TK2'], label: 'TK1 / TK2 (Total)' },
  { keys: ['Cyl', 'Axis'], label: 'Cyl / Eixo' },
  { keys: ['ACD', 'LT'], label: 'ACD / LT' },
  { keys: ['CCT', 'WTW'], label: 'CCT / WTW' },
  { keys: ['SIA', 'SIAAxis'], label: 'SIA (Cirurgião)' },
  { keys: ['refTarget'] },
]

const TORIC_COLOR = '#f1a10d'
const TORIC_ROW_BG = 'rgb(230 179 84 / 26%)'

function keratometryHeaderStyle(t: ReturnType<typeof getBiometryTheme>): CSSProperties {
  return {
    padding: '0.35rem 0.5rem 0.2rem',
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: t.kHeaderColor,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    borderBottom: `1px solid ${t.kHeaderBorder}`,
    background: t.kHeaderBg,
  }
}

function isEdited(key: BiometricKey, current: number, original: EyeData | null | undefined): boolean {
  if (!original) return false
  const orig = original[key] ?? 0
  const range = BIOMETRIC_RANGES[key]
  const epsilon = range.decimals === 0 ? 0.5 : Math.pow(10, -(range.decimals + 1))
  return Math.abs(current - orig) > epsilon
}

const BiometricTableInput = memo(function BiometricTableInput({
  side,
  inputKey,
  data,
  originalData,
  focused,
  onFocus,
  onBlur,
  onChange,
  ui,
}: {
  side: 'OD' | 'OE'
  inputKey: BiometricKey
  data: EyeData
  originalData?: EyeData | null
  focused: boolean
  onFocus: () => void
  onBlur: () => void
  onChange: (key: BiometricKey, raw: string) => void
  ui: ReturnType<typeof getBiometryTheme>
}) {
  const range = BIOMETRIC_RANGES[inputKey]
  const val = data[inputKey] ?? 0
  const edited = isEdited(inputKey, val, originalData)
  const inRange = isInRange(inputKey, val)
  const isToric = inputKey === 'Cyl' && val > 0.75
  const axisValue = inputKey === 'K1' ? data.K1Axis : inputKey === 'K2' ? data.K2Axis : undefined
  const inputBorderColor = edited ? '#5c9ce6' : isToric ? '#f1a10d' : undefined

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.05rem', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          <input
            id={`${side.toLowerCase()}-${inputKey}`}
            type="number"
            step={range.decimals === 0 ? 1 : 0.01}
            value={val.toFixed(range.decimals)}
            onChange={(e) => onChange(inputKey, e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            className={`${ui.inputClass} ${inRange ? 'valid' : 'invalid'} ${isToric ? 'toric-highlight' : ''} ${!inRange ? 'warn' : ''}`}
            title={edited ? `Editado (original: ${(originalData?.[inputKey] ?? 0).toFixed(range.decimals)})` : ''}
            style={{
              maxWidth: 80,
              minWidth: 65,
              textAlign: 'center',
              fontSize: '0.95rem',
              border: inputBorderColor ? `1px solid ${inputBorderColor}` : undefined,
              padding: '0.25rem 0.2rem',
              height: '2.1rem',
            }}
          />
          {edited && (
            <span
              title={`Valor editado manualmente (IA extraiu: ${(originalData?.[inputKey] ?? 0).toFixed(range.decimals)})`}
              style={{
                position: 'absolute',
                top: -4,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#5c9ce6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.5rem',
                color: '#fff',
                fontWeight: 800,
                lineHeight: 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                cursor: 'help',
              }}
            >
              ✎
            </span>
          )}
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: edited ? '#5c9ce6' : (inRange ? '#4db6ac' : '#f29121'), width: 10 }}>
            {focused ? '' : (edited ? '✎' : (inRange ? '✓' : '!'))}
          </span>
        </div>
        {axisValue != null && (
          <span style={{ fontSize: '0.75rem', color: ui.axis, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.1 }}>
            eixo {Math.round(axisValue)}°
          </span>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  if (
    prevProps.side !== nextProps.side ||
    prevProps.inputKey !== nextProps.inputKey ||
    prevProps.focused !== nextProps.focused ||
    prevProps.data[nextProps.inputKey] !== nextProps.data[nextProps.inputKey] ||
    prevProps.originalData?.[nextProps.inputKey] !== nextProps.originalData?.[nextProps.inputKey]
  ) {
    return false
  }
  const k = nextProps.inputKey
  if (k === 'K1') return prevProps.data.K1Axis === nextProps.data.K1Axis
  if (k === 'K2') return prevProps.data.K2Axis === nextProps.data.K2Axis
  return true
})

export const BiometricTable = memo(function BiometricTableMemo(props: BiometricTableProps) {
  return <BiometricTableComponent {...props} />
}, (prevProps, nextProps) => {
  return (
    prevProps.side === nextProps.side &&
    prevProps.data === nextProps.data &&
    prevProps.originalData === nextProps.originalData &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.showTotalK === nextProps.showTotalK &&
    prevProps.theme === nextProps.theme &&
    prevProps.nidekKRows?.selectedRef === nextProps.nidekKRows?.selectedRef &&
    prevProps.nidekKRows === nextProps.nidekKRows &&
    prevProps.totalKRows?.selectedSource === nextProps.totalKRows?.selectedSource &&
    prevProps.totalKRows === nextProps.totalKRows
  )
})

function keratometryCylStyle(ui: ReturnType<typeof getBiometryTheme>): CSSProperties {
  return {
    fontSize: '0.75rem',
    color: ui.cyl,
    fontWeight: 700,
    letterSpacing: '0.02em',
    lineHeight: 1.1,
  }
}

function formatKeratometryCyl(value: number): string {
  const fixed = value.toFixed(BIOMETRIC_RANGES.Cyl.decimals)
  return value > 0 ? `+${fixed} D` : `${fixed} D`
}

function KeratometryCylUnderK1({ Cyl, Axis, ui }: { Cyl?: number; Axis?: number; ui: ReturnType<typeof getBiometryTheme> }) {
  if (Cyl == null && Axis == null) return null
  const cylText = Cyl != null ? `CYL ${formatKeratometryCyl(Cyl)}` : null
  const axisText = Axis != null ? `eixo ${Math.round(Axis)}°` : null
  return (
    <span style={keratometryCylStyle(ui)}>
      {[cylText, axisText].filter(Boolean).join(' · ')}
    </span>
  )
}

/** Par K1/K2 apenas leitura — CYL do diâmetro abaixo do eixo K1 */
function KeratometryReadonlyPair({
  K1,
  K2,
  K1Axis,
  K2Axis,
  Cyl,
  Axis,
  ui,
}: NidekKeratometryReading & { K1: number; K2: number; ui: ReturnType<typeof getBiometryTheme> }) {
  const d = BIOMETRIC_RANGES.K1.decimals
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
      {(['K1', 'K2'] as const).map((k) => {
        const num = k === 'K1' ? K1 : K2
        const inR = isInRange(k === 'K1' ? 'K1' : 'K2', num)
        const axis = k === 'K1' ? K1Axis : K2Axis
        return (
        <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.05rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
            <input
              type="number"
              readOnly
              tabIndex={-1}
              value={num.toFixed(d)}
              className={`${ui.inputClass} ${inR ? 'valid' : 'invalid'} ${!inR ? 'warn' : ''}`}
              style={{
                maxWidth: 80,
                minWidth: 65,
                textAlign: 'center',
                fontSize: '0.95rem',
                opacity: 0.65,
                cursor: 'default',
                padding: '0.25rem 0.2rem',
                height: '2.1rem',
                background: ui.readonlyBg,
                border: `1px solid ${ui.readonlyBorder}`,
              }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: inR ? '#4db6ac' : '#f29121', width: 10 }}>
              {inR ? '✓' : '!'}
            </span>
          </div>
          {axis != null && (
            <span style={{ fontSize: '0.75rem', color: ui.muted, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.1 }}>
              eixo {Math.round(axis)}°
            </span>
          )}
          {k === 'K1' && <KeratometryCylUnderK1 Cyl={Cyl} Axis={Axis} ui={ui} />}
        </div>
        )
      })}
    </div>
  )
}

function KeratometryEditablePair({
  side,
  data,
  originalData,
  focused,
  setFocused,
  handleChange,
  reading,
  ui,
}: {
  side: 'OD' | 'OE'
  data: EyeData
  originalData?: EyeData | null
  focused: string | null
  setFocused: (id: string | null) => void
  handleChange: (key: BiometricKey, raw: string) => void
  reading: NidekKeratometryReading
  ui: ReturnType<typeof getBiometryTheme>
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', justifyContent: 'center' }}>
      {(['K1', 'K2'] as const).map((key) => {
        const inputKey = key as BiometricKey
        const isFocused = focused === `${side}-${inputKey}`
        return (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.05rem' }}>
            <BiometricTableInput
              side={side}
              inputKey={inputKey}
              data={data}
              originalData={originalData}
              focused={isFocused}
              onFocus={() => setFocused(`${side}-${inputKey}`)}
              onBlur={() => setFocused(null)}
              onChange={handleChange}
              ui={ui}
            />
            {key === 'K1' && <KeratometryCylUnderK1 Cyl={reading.Cyl} Axis={reading.Axis} ui={ui} />}
          </div>
        )
      })}
    </div>
  )
}

function BiometricTableComponent({ side, data, originalData, onChange, showTotalK = true, theme = 'dark', nidekKRows, totalKRows }: BiometricTableProps) {
  const ui = getBiometryTheme(theme)
  const [focused, setFocused] = useState<string | null>(null)

  const handleChange = useCallback(
    (key: BiometricKey, raw: string) => {
      const val = parseFloat(raw)
      if (!isNaN(val)) onChange(key, val)
    },
    [onChange]
  )

  const eyeColor = side === 'OD' ? '#f29121' : '#71ba66'
  const eyeLabel = side === 'OD' ? 'OD — Olho Direito' : 'OE — Olho Esquerdo'

  const groups = FIELD_GROUPS
    .map((g) => {
      if (g.keys[0] === 'TK1' && !showTotalK) return null
      if (g.keys[0] === 'K1' && nidekKRows) return null
      if (g.keys[0] === 'Cyl' && nidekKRows) return null
      if ((g.keys[0] === 'K1' || g.keys[0] === 'TK1') && totalKRows) return null
      return g
    })
    .filter(Boolean) as FieldGroup[]

  return (
    <div className={ui.panelClass} style={{ overflowX: 'auto', marginTop: '0.25rem', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', fontFamily: 'Barlow, sans-serif' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.4rem', color: ui.headerMuted, fontWeight: 500, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Parâmetro
            </th>
            <th style={{ textAlign: 'center', padding: '0.4rem', color: eyeColor, fontWeight: 800, fontSize: '0.8125rem', borderBottom: `2px solid ${eyeColor}`, minWidth: 140 }}>
              {eyeLabel}
            </th>
            <th style={{ textAlign: 'right', padding: '0.4rem', color: ui.headerMuted, fontWeight: 500, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ref.
            </th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const rows: ReactNode[] = []
            let visualRow = 0

            if (nidekKRows) {
              const pair = (['2.4', '3.3'] as const).map((ref) => ({
                ref,
                reading: ref === '2.4' ? nidekKRows.ref24 : nidekKRows.ref33,
              }))
              for (const { ref, reading } of pair) {
                const refMm = Number.parseFloat(ref)
                rows.push(
                  <tr key={`nidek-k-hdr-${side}-${ref}`}>
                    <td colSpan={3} style={keratometryHeaderStyle(ui)}>
                      {formatKeratometryGroupHeaderLabel(refMm)}
                    </td>
                  </tr>,
                )
                const isSelected = nidekKRows.selectedRef === ref
                const bg = visualRow % 2 === 0 ? ui.rowAlt : 'transparent'
                visualRow++
                rows.push(
                  <tr key={`nidek-k-${side}-${ref}`} style={{ background: bg }}>
                    <td style={{ padding: '0.35rem 0.4rem', fontWeight: 600, fontSize: '0.8125rem', color: ui.label, verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.58rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: ui.selectionLabel, fontWeight: 700 }}>
                          Seleção
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`nidek-kref-${side}`}
                            checked={isSelected}
                            onChange={() => nidekKRows.onSelectRef(ref)}
                            style={{ accentColor: '#4db6ac', width: 15, height: 15 }}
                          />
                          <span>K1 / K2 (ref: {ref})</span>
                        </label>
                      </div>
                    </td>
                    <td style={{ padding: '0.3rem 0.2rem', textAlign: 'center' }}>
                      {isSelected ? (
                        <KeratometryEditablePair
                          side={side}
                          data={data}
                          originalData={originalData}
                          focused={focused}
                          setFocused={setFocused}
                          handleChange={handleChange}
                          reading={reading}
                          ui={ui}
                        />
                      ) : (
                        <KeratometryReadonlyPair
                          K1={reading.K1 ?? 0}
                          K2={reading.K2 ?? 0}
                          K1Axis={reading.K1Axis}
                          K2Axis={reading.K2Axis}
                          Cyl={reading.Cyl}
                          Axis={reading.Axis}
                          ui={ui}
                        />
                      )}
                    </td>
                    <td style={{ padding: '0.3rem 0.4rem', color: ui.muted, fontSize: '0.65rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {`${BIOMETRIC_RANGES.K1.min}/${BIOMETRIC_RANGES.K2.min}`}
                    </td>
                  </tr>
                )
              }
            }

            if (totalKRows) {
              // Mirrors the Nidek dual-row UI, but switches between anterior K
              // and total K measurements when both are available.
              const pair = [
                { source: 'anterior' as const, label: 'K1 / K2 (Ant.)', reading: totalKRows.anterior },
                { source: 'total' as const, label: 'TK1 / TK2 (Total)', reading: totalKRows.total },
              ]
              for (const { source, label, reading } of pair) {
                const isSelected = totalKRows.selectedSource === source
                const bg = visualRow % 2 === 0 ? ui.rowAlt : 'transparent'
                visualRow++
                rows.push(
                  <tr key={`total-k-${side}-${source}`} style={{ background: bg }}>
                    <td style={{ padding: '0.35rem 0.4rem', fontWeight: 600, fontSize: '0.8125rem', color: ui.label, verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.58rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: ui.selectionLabel, fontWeight: 700 }}>
                          Usar no calculo
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`total-k-source-${side}`}
                            checked={isSelected}
                            onChange={() => totalKRows.onSelectSource(source)}
                            style={{ accentColor: '#4db6ac', width: 15, height: 15 }}
                          />
                          <span>{label}</span>
                        </label>
                      </div>
                    </td>
                    <td style={{ padding: '0.3rem 0.2rem', textAlign: 'center' }}>
                      {isSelected ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                          {(['K1', 'K2'] as const).map((key) => {
                            const inputKey = key as BiometricKey
                            const isFocused = focused === `${side}-${inputKey}`
                            return (
                              <BiometricTableInput
                                key={`${side}-total-${source}-${key}`}
                                side={side}
                                inputKey={inputKey}
                                data={data}
                                originalData={originalData}
                                focused={isFocused}
                                onFocus={() => setFocused(`${side}-${inputKey}`)}
                                onBlur={() => setFocused(null)}
                                onChange={handleChange}
                                ui={ui}
                              />
                            )
                          })}
                        </div>
                      ) : (
                        <KeratometryReadonlyPair
                          K1={reading.K1 ?? 0}
                          K2={reading.K2 ?? 0}
                          K1Axis={reading.K1Axis}
                          K2Axis={reading.K2Axis}
                          ui={ui}
                        />
                      )}
                    </td>
                    <td style={{ padding: '0.3rem 0.4rem', color: ui.muted, fontSize: '0.65rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {`${BIOMETRIC_RANGES.K1.min}/${BIOMETRIC_RANGES.K2.min}`}
                    </td>
                  </tr>
                )
              }
            }

            for (const group of groups) {
              const rowLabel = group.label || BIOMETRIC_RANGES[group.keys[0]].label
              const isCylRow = group.keys[0] === 'Cyl'
              const hasToric = isCylRow && (data['Cyl'] ?? 0) > 0.75
              const bg = visualRow % 2 === 0 ? ui.rowAlt : 'transparent'
              visualRow++

              rows.push(
                <tr
                  key={group.keys.join('-')}
                  style={{
                    background: hasToric ? TORIC_ROW_BG : bg,
                  }}
                >
                  {/* Label */}
                  <td style={{
                    padding: '0.3rem 0.4rem', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.8125rem',
                    color: hasToric ? TORIC_COLOR : ui.label,
                  }}>
                    <span title={group.label ? `Dados de ${group.label}` : BIOMETRIC_RANGES[group.keys[0]].label}>
                      {rowLabel}
                    </span>
                  </td>

                  {/* Values */}
                  <td style={{ padding: '0.3rem 0.2rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: hasToric ? '0.25rem' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                        {group.keys.map((key, keyIdx) => {
                          const isSIAGroup = group.keys[0] === 'SIA'
                          const isFocused = focused === `${side}-${key}`

                          return (
                            <span key={`${side}-${key}-wrap`} style={{ display: 'contents' }}>
                              {isSIAGroup && keyIdx === 1 && (
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: ui.siaAt }}>@</span>
                              )}
                              <BiometricTableInput
                                side={side}
                                inputKey={key}
                                data={data}
                                originalData={originalData}
                                focused={isFocused}
                                onFocus={() => setFocused(`${side}-${key}`)}
                                onBlur={() => setFocused(null)}
                                onChange={handleChange}
                                ui={ui}
                              />
                              {isSIAGroup && keyIdx === 1 && (
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: ui.siaAt }}>°</span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                      {hasToric && (
                        <span style={{
                          fontSize: '0.6rem',
                          color: TORIC_COLOR,
                          background: `${TORIC_COLOR}20`,
                          padding: '0.1rem 0.5rem',
                          borderRadius: '4px',
                          border: `1px solid ${TORIC_COLOR}30`,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          Tórico
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Range */}
                  <td style={{ padding: '0.3rem 0.4rem', color: ui.muted, fontSize: '0.65rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {group.keys.map((key, i) => {
                      const r = BIOMETRIC_RANGES[key]
                      return (
                        <span key={key}>
                          {r.min}{i < group.keys.length - 1 ? '/' : ''}
                        </span>
                      )
                    })}
                  </td>
                </tr>
              )
            }

            return rows
          })()}
        </tbody>
      </table>
    </div>
  )
}
