'use client'

import { getBiometryTheme, type BiometryUiTheme } from '@/app/lib/biometry-theme'
import {
  formatMeasurementDisplayLabel,
  orderBiometricMeasurements,
  shouldHideFromExtraFieldsRawList,
} from '@/app/lib/biometric-measurement-order'

type ExtraFieldRow = { label: string; value: string }

function getRawCI(map: Record<string, string> | undefined, ...keys: string[]): string | undefined {
  if (!map) return undefined
  const lc: Record<string, string> = {}
  for (const [k, v] of Object.entries(map)) lc[k.toLowerCase().trim()] = v
  for (const key of keys) {
    const v = lc[key.toLowerCase().trim()]
    if (v) return v
  }
  return undefined
}

function normalizeMeasurementAlias(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(\d+)dot(\d+)/g, '$1.$2')
    .replace(/[_-]+/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getExtraFieldCanonicalKey(label: string): string {
  const normalized = normalizeMeasurementAlias(label)
  const diameter = normalized.match(/(\d+[\.,]\d+)/)?.[1]?.replace(',', '.')
  const suffix = diameter ? `:${diameter}` : ''

  if (/k2.*axis|axis.*k2|eixo.*curv.*max|axis.*steep|steep\s*axis/.test(normalized)) return `STEEP_AXIS${suffix}`
  if (/k1.*axis|axis.*k1|eixo.*curv.*min|axis.*flat|flat\s*axis/.test(normalized)) return `FLAT_AXIS${suffix}`
  if (/^k1\b|flat\s*k|k\s*flat/.test(normalized)) return `K1${suffix}`
  if (/^k2\b|steep\s*k|k\s*steep/.test(normalized)) return `K2${suffix}`
  if (/^avg\s*k|^meank\b|mean\s*k|k\s*avg|km/.test(normalized)) return `AVG_K${suffix}`
  if (/^astig|astigmatis|^cyl\b/.test(normalized)) return `ASTIG${suffix}`
  if (/^al$|axial\s*length|comprimento\s*axial/.test(normalized)) return 'AL'
  if (/^acd$|anterior\s*chamber\s*depth|optical\s*acd/.test(normalized)) return 'ACD'
  if (/^lt$|lens\s*thick/.test(normalized)) return 'LT'
  if (/^cct|espessura\s*corneana|espessura\s*corn|corneal\s*thick|pachym/.test(normalized)) return 'CCT'
  if (/^wtw|white.*to.*white|corneal\s*diam|cornea\s*wtw/.test(normalized)) return 'WTW'
  if (/^ls\b|lens\s*status|status.*crist|surgery\s*type/.test(normalized)) return 'LS'

  return normalized
}

function isTechnicalMeasurementLabel(label: string): boolean {
  return /_|dot\d/i.test(label)
}

export function ExtraFieldsCard({ title, raw, theme = 'dark' }: { title: string; raw?: Record<string, string>; theme?: BiometryUiTheme }) {
  const ui = getBiometryTheme(theme)
  const rows: ExtraFieldRow[] = []
  const rowIndexByKey = new Map<string, number>()

  function addRow(row: ExtraFieldRow) {
    const labelKey = getExtraFieldCanonicalKey(row.label)
    if (!labelKey) return

    const existingIndex = rowIndexByKey.get(labelKey)
    if (existingIndex != null) {
      const existing = rows[existingIndex]
      if (isTechnicalMeasurementLabel(existing.label) && !isTechnicalMeasurementLabel(row.label)) {
        rows[existingIndex] = row
      }
      return
    }

    rowIndexByKey.set(labelKey, rows.length)
    rows.push(row)
  }

  const ls = getRawCI(raw, 'ls or status', 'ls/status', 'ls', 'status')
  if (ls) addRow({ label: 'LS or Status', value: ls })

  const kIndex = getRawCI(raw, 'k index', 'kindex')
  if (kIndex) addRow({ label: 'K Index', value: kIndex })

  const meanK = getRawCI(raw, 'review: mean k', 'mean k', 'k mean', 'avg k', 'k médio', 'k medio')
  if (meanK) addRow({ label: 'review: Mean K', value: meanK })

  for (const [label, value] of Object.entries(raw ?? {})) {
    if (label.startsWith('__id_')) continue
    if (shouldHideFromExtraFieldsRawList(label)) continue
    addRow({ label, value })
  }

  const orderedRows = orderBiometricMeasurements(rows, (row) => row.label)

  return (
    <div style={{
      marginTop: '0.75rem',
      padding: '0.75rem 0.9rem',
      borderRadius: 10,
      background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.035)',
      border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase',
        color: ui.selectionLabel, fontWeight: 800, marginBottom: '0.55rem',
      }}>
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.35rem' }}>
        {orderedRows.length === 0 && (
          <p style={{ fontSize: '0.78rem', color: ui.muted, margin: 0 }}>
            Nenhum campo adicional no laudo.
          </p>
        )}
        {orderedRows.map((item, index) => {
          if (item.type === 'groupHeader') {
            return (
              <div
                key={`group-${item.diameter}`}
                style={{
                  marginTop: index === 0 ? 0 : '0.25rem',
                  padding: '0.28rem 0.5rem',
                  borderRadius: 5,
                  background: theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                  color: ui.kHeaderColor,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
              >
                {item.label}
              </div>
            )
          }

          const r = item.measurement
          const indent = item.inKeratometryDiameterGroup === true
          return (
            <div
              key={`${r.label}-${r.value}-${index}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.75rem',
                paddingLeft: indent ? '0.85rem' : undefined,
              }}
            >
              <span style={{ fontSize: '0.78rem', color: ui.label, fontWeight: 600 }}>
                {formatMeasurementDisplayLabel(r.label)}
              </span>
              <span style={{
                fontSize: '0.78rem', color: ui.label, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums', textAlign: 'right',
              }}>
                {r.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
