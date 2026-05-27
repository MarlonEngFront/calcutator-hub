export type MeasurementOrderKey =
  | 'AL'
  | 'K1'
  | 'K2'
  | 'AVG_K'
  | 'ASTIG'
  | 'STEEP_AXIS'
  | 'FLAT_AXIS'
  | 'ACD'
  | 'ACD_SD'
  | 'LT'
  | 'LT_SD'
  | 'CCT'
  | 'WTW'
  | 'SE'
  | 'SIA'
  | 'SIA_AXIS'
  | 'TARGET_REF'
  | 'LS'
  | 'VS'
  | 'AL_SD'

export type MeasurementDisplayItem<T> =
  | { type: 'measurement'; measurement: T; inKeratometryDiameterGroup?: boolean }
  | { type: 'groupHeader'; label: string; diameter: number }

type OrderedPattern = {
  key: MeasurementOrderKey
  pattern: RegExp
}

type ClassifiedMeasurement<T> = {
  measurement: T
  originalIndex: number
  matchedKey: MeasurementOrderKey | null
  priorityIndex: number
  diameter: number | null
}

export const ORDERED_MEASUREMENT_PATTERNS: OrderedPattern[] = [
  { key: 'AL', pattern: /^AL$|axial\s*length/i },
  { key: 'K1', pattern: /^K1(?!.*axis)|flat\s*k|k\s*flat/i },
  { key: 'K2', pattern: /^K2(?!.*axis)|steep\s*k|k\s*steep/i },
  { key: 'AVG_K', pattern: /^avg\s*k|^avgk|k\s*avg|mean\s*k|km/i },
  { key: 'ASTIG', pattern: /astigmatis|^cyl\b|cylinder/i },
  { key: 'STEEP_AXIS', pattern: /k2.*axis|eixo.*curv.*max|axis.*steep|steep\s*axis|delta\s*k@/i },
  { key: 'FLAT_AXIS', pattern: /k1.*axis|eixo.*curv.*min|axis.*flat|flat\s*axis/i },
  { key: 'ACD', pattern: /^ACD$|anterior\s*chamber\s*depth|optical\s*acd/i },
  { key: 'ACD_SD', pattern: /^ACD\s*\/\s*SD|^ACD\.?SD/i },
  { key: 'LT', pattern: /^LT$|lens\s*thick/i },
  { key: 'LT_SD', pattern: /^LT\s*\/?\s*SD|^LT\.?SD/i },
  {
    key: 'CCT',
    pattern: /^CCT|espessura\s*corn|corneal\s*thick|cornea\s*central\s*thick|pachym/i,
  },
  { key: 'WTW', pattern: /^WTW|white.*to.*white|corneal\s*diam/i },
  { key: 'SE', pattern: /^SE$|spherical\s*equiv/i },
  { key: 'SIA', pattern: /^SIA$/i },
  { key: 'SIA_AXIS', pattern: /^SIA\s*@/i },
  { key: 'TARGET_REF', pattern: /refr.*alvo|target\s*ref/i },
  { key: 'LS', pattern: /^LS|lens\s*status|status.*crist/i },
  { key: 'VS', pattern: /^VS|vitreous\s*status/i },
  { key: 'AL_SD', pattern: /^AL\s*\/?\s*SD|^AL\.?SD/i },
]

const DIAMETER_PATTERN = /(\d+[\.,]\d+|\d+dot\d+)\s*(mm)?/i
const UNKNOWN_PRIORITY_INDEX = Number.MAX_SAFE_INTEGER
export const KERATOMETRY_GROUP_KEYS = new Set<MeasurementOrderKey>([
  'K1',
  'K2',
  'AVG_K',
  'ASTIG',
  'STEEP_AXIS',
  'FLAT_AXIS',
])

const KERATOMETRY_KEYS = KERATOMETRY_GROUP_KEYS

/** Order inside each ceratometry diameter block (review spec). */
const KERATOMETRY_GROUP_ORDER: Partial<Record<MeasurementOrderKey, number>> = {
  K1: 0,
  FLAT_AXIS: 1,
  K2: 2,
  STEEP_AXIS: 3,
  AVG_K: 4,
  ASTIG: 5,
}

function getPriorityIndex(key: MeasurementOrderKey | null): number {
  if (!key) return UNKNOWN_PRIORITY_INDEX
  const index = ORDERED_MEASUREMENT_PATTERNS.findIndex((entry) => entry.key === key)
  return index === -1 ? UNKNOWN_PRIORITY_INDEX : index
}

/** Normalizes API labels (underscores, dot-words) for pattern matching. */
export function normalizeMeasurementName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(\d+)dot(\d+)/gi, '$1.$2')
    .replace(/[_-]+/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const DISPLAY_ACRONYMS = new Set([
  'al',
  'k1',
  'k2',
  'acd',
  'lt',
  'cct',
  'wtw',
  'cyl',
  'se',
  'sia',
  'ls',
  'vs',
  'tk1',
  'tk2',
])

/** Human-readable label: `Keraometric_Index` → `Keratometric Index`. */
export function formatMeasurementDisplayLabel(label: string): string {
  const spaced = label
    .replace(/(\d+)dot(\d+)/gi, '$1.$2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return spaced
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase()
      if (lower === 'keraometric') return 'Keratometric'
      if (DISPLAY_ACRONYMS.has(lower)) return lower.toUpperCase()
      if (/^\d+(\.\d+)?$/.test(word)) return word
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function findMeasurementOrderKey(name: string): MeasurementOrderKey | null {
  const normalized = normalizeMeasurementName(name)
  return ORDERED_MEASUREMENT_PATTERNS.find(({ pattern }) => pattern.test(normalized))?.key ?? null
}

/** Main table already shows these; hide only the undiameter copy from raw extras. */
const EXTRA_FIELDS_HIDE_WITHOUT_DIAMETER = new Set<MeasurementOrderKey>([
  'AL',
  'K1',
  'K2',
  'ASTIG',
  'STEEP_AXIS',
  'FLAT_AXIS',
  'ACD',
  'LT',
  'CCT',
  'WTW',
])

/** Short API keys already shown in BiometricTable (not long Relateds names). */
function isCompactMainTableDuplicate(label: string, key: MeasurementOrderKey): boolean {
  const normalized = normalizeMeasurementName(label)

  switch (key) {
    case 'AL':
      return /^al$/.test(normalized)
    case 'K1':
      return /^k1$/.test(normalized)
    case 'K2':
      return /^k2$/.test(normalized)
    case 'ASTIG':
      return /^(cyl|astig)/.test(normalized)
    case 'STEEP_AXIS':
    case 'FLAT_AXIS':
      return /axis|eixo/.test(normalized) && !/(\d+[\.,]\d+|\d+dot\d+)/.test(normalized)
    case 'ACD':
      return /^acd$/.test(normalized)
    case 'LT':
      return /^lt$/.test(normalized)
    case 'CCT':
      return /^cct$/.test(normalized)
    case 'WTW':
      return /^wtw$/.test(normalized)
    default:
      return false
  }
}

/**
 * Raw Relateds labels: skip duplicates of the main biometric table, but keep
 * diameter-specific keratometry (2.4 / 3.3) so they can be grouped in ExtraFieldsCard.
 */
export function shouldHideFromExtraFieldsRawList(label: string): boolean {
  const matchedKey = findMeasurementOrderKey(label)
  if (!matchedKey) return false

  const diameter = extractMeasurementDiameter(label)
  if (KERATOMETRY_GROUP_KEYS.has(matchedKey) && diameter != null) {
    return false
  }

  if (diameter != null) return false

  if (!EXTRA_FIELDS_HIDE_WITHOUT_DIAMETER.has(matchedKey)) return false

  return isCompactMainTableDuplicate(label, matchedKey)
}

export function extractMeasurementDiameter(name: string): number | null {
  const normalized = normalizeMeasurementName(name)
  const match = DIAMETER_PATTERN.exec(normalized)
  if (!match) return null

  const parsed = Number.parseFloat(match[1].replace(',', '.').replace(/dot/i, '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function classifyMeasurement<T>(
  measurement: T,
  originalIndex: number,
  getName: (measurement: T) => string,
): ClassifiedMeasurement<T> {
  const name = getName(measurement)
  const matchedKey = findMeasurementOrderKey(name)

  return {
    measurement,
    originalIndex,
    matchedKey,
    priorityIndex: getPriorityIndex(matchedKey),
    diameter: extractMeasurementDiameter(name),
  }
}

function compareMeasurements<T>(a: ClassifiedMeasurement<T>, b: ClassifiedMeasurement<T>): number {
  if (a.priorityIndex !== b.priorityIndex) return a.priorityIndex - b.priorityIndex
  return a.originalIndex - b.originalIndex
}

function compareKeratometryGroupItems<T>(
  a: ClassifiedMeasurement<T>,
  b: ClassifiedMeasurement<T>,
): number {
  const orderA =
    a.matchedKey != null ? (KERATOMETRY_GROUP_ORDER[a.matchedKey] ?? 99) : 99
  const orderB =
    b.matchedKey != null ? (KERATOMETRY_GROUP_ORDER[b.matchedKey] ?? 99) : 99
  if (orderA !== orderB) return orderA - orderB
  return a.originalIndex - b.originalIndex
}

function formatDiameter(diameter: number): string {
  return Number.isInteger(diameter) ? diameter.toFixed(1) : String(diameter).replace(',', '.')
}

/** Visual spec: subheader for keratometry blocks with diameter (e.g. biometry review UI). */
export function formatKeratometryGroupHeaderLabel(diameter: number): string {
  return `— Ceratometria (${formatDiameter(diameter)} mm) —`
}

function groupKeyForDiameter(diameter: number): string {
  return diameter.toFixed(3)
}

export function orderBiometricMeasurements<T>(
  measurements: T[],
  getName: (measurement: T) => string,
): MeasurementDisplayItem<T>[] {
  const classified = measurements.map((measurement, index) =>
    classifyMeasurement(measurement, index, getName),
  )

  const keratometryWithDiameter: ClassifiedMeasurement<T>[] = []
  const others: ClassifiedMeasurement<T>[] = []

  for (const item of classified) {
    if (item.matchedKey && KERATOMETRY_KEYS.has(item.matchedKey) && item.diameter != null) {
      keratometryWithDiameter.push(item)
    } else {
      others.push(item)
    }
  }

  const orderedOthers = [...others].sort(compareMeasurements)
  const groups = new Map<string, { diameter: number; items: ClassifiedMeasurement<T>[] }>()

  for (const item of keratometryWithDiameter) {
    const diameter = item.diameter ?? 0
    const key = groupKeyForDiameter(diameter)
    const group = groups.get(key)
    if (group) {
      group.items.push(item)
    } else {
      groups.set(key, { diameter, items: [item] })
    }
  }

  const groupedItems: MeasurementDisplayItem<T>[] = [...groups.values()]
    .sort((a, b) => a.diameter - b.diameter)
    .flatMap((group) => [
      {
        type: 'groupHeader' as const,
        label: formatKeratometryGroupHeaderLabel(group.diameter),
        diameter: group.diameter,
      },
      ...group.items.sort(compareKeratometryGroupItems).map((item) => ({
        type: 'measurement' as const,
        measurement: item.measurement,
        inKeratometryDiameterGroup: true,
      })),
    ])

  if (groupedItems.length === 0) {
    return orderedOthers.map((item) => ({ type: 'measurement', measurement: item.measurement }))
  }

  // Spec: K without diameter keeps normal priority; K with diameter is grouped immediately after
  // that block. If there is no K without diameter, place groups at the first K1-or-later slot
  // (after every strictly higher-priority row such as AL).
  let insertIndex = -1
  for (let i = 0; i < orderedOthers.length; i++) {
    const item = orderedOthers[i]
    if (
      item.matchedKey &&
      KERATOMETRY_KEYS.has(item.matchedKey) &&
      item.diameter == null
    ) {
      insertIndex = i + 1
    }
  }
  if (insertIndex === -1) {
    const k1Pri = getPriorityIndex('K1')
    const firstFromK1 = orderedOthers.findIndex((item) => item.priorityIndex >= k1Pri)
    insertIndex = firstFromK1 === -1 ? orderedOthers.length : firstFromK1
  }

  const beforeGroups = orderedOthers.slice(0, insertIndex)
  const afterGroups = orderedOthers.slice(insertIndex)

  return [
    ...beforeGroups.map((item) => ({ type: 'measurement' as const, measurement: item.measurement })),
    ...groupedItems,
    ...afterGroups.map((item) => ({ type: 'measurement' as const, measurement: item.measurement })),
  ]
}
