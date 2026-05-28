/**
 * parseExamRelateds + normalizeEyeData
 * Portado diretamente de jjvisionpro/app/(flow)/entrada/page.tsx
 * Mapeia a resposta de GET /api/Exam/{id}/Relateds → biometria estruturada
 */

export interface EyeData {
  AL: number
  K1: number
  K2: number
  K1Axis?: number
  K2Axis?: number
  TK1?: number
  TK2?: number
  Cyl: number
  Axis: number
  ACD: number
  LT: number
  WTW: number
  CCT: number
  refTarget: number
  SIA: number
  SIAAxis: number
  Q?: number
  PA?: number
}

export interface ParsedExamSession {
  OD: EyeData
  OE: EyeData
  examId: number
  examTypeId?: number
  examTypeName?: string
  patientMetadata?: {
    name?: string
    gender?: string
    birthDate?: string
    age?: number
  }
  kReadings?: {
    ref2dot4?: { OD?: Partial<EyeData>; OE?: Partial<EyeData> }
    ref3dot3?: { OD?: Partial<EyeData>; OE?: Partial<EyeData> }
  }
  rawMeasurements?: {
    OD: Record<string, string>
    OE: Record<string, string>
  }
  relatedMeasurementTypeNames?: string[]
}

// ── Internal types ────────────────────────────────────────────────────────────

type ExtractedSide = {
  numeric: Record<string, number>
  raw: Record<string, string>
  typeNames: string[]
}

function parseNumericFromString(value: string): number | undefined {
  const cleaned = value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(',', '.')
    .replace(/[^\d.+-]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : undefined
}

function extractSideData(sideEntry: {
  Side: number
  LabelGroups: Array<{
    TypeGroups: Array<{
      MeasurementType: { ID?: number; DisplayName?: string; Name?: string }
      Measurements: Array<{ DoubleValue?: number; StringValue?: string }>
    }>
  }>
}): ExtractedSide {
  const numeric: Record<string, number> = {}
  const raw: Record<string, string> = {}
  const typeNames: string[] = []

  for (const lg of sideEntry.LabelGroups ?? []) {
    for (const tg of lg.TypeGroups ?? []) {
      const displayName = tg.MeasurementType?.DisplayName
      const typeName    = tg.MeasurementType?.Name
      const id          = tg.MeasurementType?.ID
      const measurement = tg.Measurements?.[0]
      if (!measurement) continue

      const rawStr =
        typeof measurement.StringValue === 'string' && measurement.StringValue.trim()
          ? measurement.StringValue.trim()
          : undefined

      const num =
        typeof measurement.DoubleValue === 'number' && Number.isFinite(measurement.DoubleValue)
          ? measurement.DoubleValue
          : typeof measurement.StringValue === 'string'
            ? parseNumericFromString(measurement.StringValue)
            : undefined

      if (typeof typeName === 'string' && typeName.trim()) typeNames.push(typeName.trim())

      if (typeof id === 'number' && rawStr) raw[`__id_${id}`] = rawStr
      if (typeof typeName === 'string' && rawStr) raw[typeName] = rawStr
      if (displayName && rawStr) raw[displayName] = rawStr

      if (num != null) {
        if (typeof id === 'number') numeric[`__id_${id}`] = num
        if (typeof typeName === 'string') numeric[typeName] = num
        if (displayName) numeric[displayName] = num
      }
    }
  }
  return { numeric, raw, typeNames }
}

function flattenNumericValues(obj: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') result[k] = v
    else if (v && typeof v === 'object') {
      for (const [nk, nv] of Object.entries(
        flattenNumericValues(v as Record<string, unknown>)
      )) result[nk] = nv
    }
  }
  return result
}

// ── normalizeEyeData ──────────────────────────────────────────────────────────
// Portado exato de jjvisionpro — suporta Nidek, IOLMaster, Argos, Pentacam, etc.

export function normalizeEyeData(raw: Record<string, number>): EyeData {
  const lc: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) lc[k.toLowerCase().trim()] = v

  function isValid(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v)
  }
  function findExact(...keys: string[]): number | undefined {
    for (const k of keys) {
      const v = lc[k.toLowerCase()]
      if (isValid(v)) return v
    }
    return undefined
  }
  function findLoose(...needles: string[]): number | undefined {
    const entries = Object.entries(lc)
    for (const needle of needles) {
      const n = needle.toLowerCase().trim()
      for (const [k, v] of entries) {
        if (!isValid(v)) continue
        if (k === n || k.includes(n)) return v
      }
    }
    return undefined
  }
  function find(...keys: string[]): number | undefined {
    return findExact(...keys) ?? findLoose(...keys)
  }

  const AL  = find('al', 'axial length', 'axiallength', 'axial_length', 'al (mm)', 'comprimento axial')

  // K1/K2 — range-validated (30–60 D). Argos stores only K_Axis (degrees) + DeltaK+Astig.
  // Strategy: (1) find candidate, (2) if not in diopter range check > 90 → rescue as axis,
  //           (3) fallback: reconstruct from KAV (DeltaK) ± |Astig|/2.
  const validK = (v: number | undefined): v is number => v != null && v >= 30 && v <= 60

  let K1raw  = find('k1', 'flatk', 'flat k', 'k flat', 'keratometry k1', 'km1', 'k1 (ant.)', 'k1 (anterior)')
  let K1Axis = find('k1 axis', 'k1_axis', 'k1axis', 'flat k axis', 'eixo da curv. mínima (central)', 'eixo da curv. mínima')
  if (!validK(K1raw)) {
    // value looks like axis degrees (e.g. 176) or small garbage (e.g. 1) — rescue if > 90
    if (K1raw != null && K1raw > 90 && K1Axis == null) K1Axis = K1raw
    K1raw = find('flatk', 'flat k', 'k flat', 'keratometry k1', 'km1', 'k1 (ant.)', 'k1 (anterior)',
      'k1_d', 'k1 d', 'k1(d)', 'r1_d', 'flat meridian', 'flat k (d)', 'keratometry1')
  }

  let K2raw  = find('k2', 'steepk', 'steep k', 'k steep', 'keratometry k2', 'km2', 'k2 (ant.)', 'k2 (anterior)')
  let K2Axis = find('k2 axis', 'k2_axis', 'k2axis', 'steep k axis', 'eixo da curv. máxima (central)', 'eixo da curv. máxima')
  if (!validK(K2raw)) {
    if (K2raw != null && K2raw > 90 && K2Axis == null) K2Axis = K2raw
    K2raw = find('steepk', 'steep k', 'k steep', 'keratometry k2', 'km2', 'k2 (ant.)', 'k2 (anterior)',
      'k2_d', 'k2 d', 'k2(d)', 'r2_d', 'steep meridian', 'steep k (d)', 'keratometry2')
  }

  // Argos fallback: reconstruct K1/K2 from KAV (DeltaK TypeName) ± |Astig|/2
  if (!validK(K1raw) || !validK(K2raw)) {
    const kav = findExact('deltak', 'k_av', 'kav', 'kavg')
      ?? find('mean k', 'meank', 'average k', 'km', 'k average')
    const astigD = findExact('astig', 'astigmatismo')
      ?? find('astigmatism', 'cylinder', 'cyl')
    if (kav != null && validK(kav) && astigD != null) {
      const half = Math.abs(astigD) / 2
      if (!validK(K1raw)) K1raw = kav - half  // flat meridian (smaller K)
      if (!validK(K2raw)) K2raw = kav + half  // steep meridian (larger K)
    }
  }

  const K1 = K1raw
  const K2 = K2raw

  const TK1 = find('tk1', 'total k1', 'totalk1', 'k1 total')
  const TK2 = find('tk2', 'total k2', 'totalk2', 'k2 total')
  const ACD = find('acd', 'anterior chamber depth', 'acd (mm)', 'acd depth', 'profundidade da câmara anterior')
  const LT  = find('lt', 'lens thickness', 'lensthickness', 'lens_thickness', 'lt (mm)', 'espessura do cristalino')
  const WTW = find('wtw', 'white to white', 'white-to-white', 'corneal diameter', 'wtw (mm)', 'diâmetro corneano', 'diametro corneano')
  const CCT = find(
    'cct', 'corneal thickness', 'cornealthickness', 'central corneal thickness',
    'espessura corneana central', 'espessura corneal central', 'espessura corneana (central)',
  )
  const Cyl = find('cyl', 'cylinder', 'astigmatism', 'astigmatismo', 'astig', 'cyl (d)', 'astigmatismo (cyl)')
  const Axis = find(
    'axis', 'astigmatism axis', 'cyl axis',
    'eixo do astig.', 'eixo do astigmatismo', 'eixo do astig (central)',
  )

  return {
    AL:        AL        ?? 23.50,
    K1:        K1        ?? 43.00,
    K2:        K2        ?? 44.00,
    K1Axis,
    K2Axis,
    TK1,
    TK2,
    ACD:       ACD       ?? 3.10,
    WTW:       WTW       ?? 11.8,
    CCT:       CCT       ?? 540,
    refTarget: find('reftarget', 'target ref', 'targetref', 'ref target', 'refr. alvo', 'refração alvo') ?? 0,
    Cyl:       Cyl       ?? 0,
    Axis:      Axis      ?? 0,
    LT:        LT        ?? 4.20,
    Q:         find('q', 'asphericity', 'q factor'),
    PA:        find('pa', 'posterior/anterior', 'pa ratio'),
    SIA:       0.10,
    SIAAxis:   120,
  }
}

/** Desembrulha payload Relateds (axios .data, Exam.*, etc.) antes do parse. */
export function unwrapExamRelatedsPayload(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {}
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj.GroupedMeasurement)) return obj

  const nested = [obj.data, obj.Data, obj.Result, obj.result, obj.Exam]
  for (const candidate of nested) {
    if (!candidate || typeof candidate !== 'object') continue
    const inner = candidate as Record<string, unknown>
    if (Array.isArray(inner.GroupedMeasurement)) {
      return {
        ...inner,
        Patient: inner.Patient ?? obj.Patient,
        Measurements: inner.Measurements ?? obj.Measurements,
      }
    }
  }
  return obj
}

function normCyl(
  cyl: number | undefined,
  axis: number | undefined,
): { Cyl: number | undefined; Axis: number | undefined } {
  if (cyl == null) return { Cyl: undefined, Axis: axis }
  if (cyl > 0) return { Cyl: -cyl, Axis: axis != null ? (axis + 90) % 180 : undefined }
  return { Cyl: cyl, Axis: axis }
}

function normalizeKeratometryKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(\d+)[.,](\d+)/g, '$1dot$2')
    .replace(/[_\s-]+/g, '')
}

function hasNumericKey(side: ExtractedSide, key: string): boolean {
  const target = normalizeKeratometryKey(key)
  return Object.keys(side.numeric).some((k) => normalizeKeratometryKey(k) === target)
}

function getNumeric(side: ExtractedSide, key: string): number | undefined {
  const target = normalizeKeratometryKey(key)
  for (const [k, v] of Object.entries(side.numeric)) {
    if (normalizeKeratometryKey(k) === target) return v
  }
  return undefined
}

function firstNumeric(side: ExtractedSide, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = getNumeric(side, key)
    if (v != null && Number.isFinite(v)) return v
  }
  return undefined
}

function hasKeratometryDiameter(side: ExtractedSide, which: 'k1' | 'k2', mm: '2dot4' | '3dot3'): boolean {
  if (hasNumericKey(side, `${which}_${mm}`)) return true
  const target = `${which}${mm}`
  return Object.keys(side.numeric).some((k) => {
    const n = normalizeKeratometryKey(k)
    return n === target || (n.startsWith(which) && n.includes(mm))
  })
}

// ── parseExamRelateds ─────────────────────────────────────────────────────────
// Portado exato de jjvisionpro — Side 2 = OD, Side 1 = OE

export function parseExamRelateds(
  data: unknown,
  examId: number,
  examTypeId?: number
): ParsedExamSession | null {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  const groupedMeasurements = obj['GroupedMeasurement'] as Array<{
    Side: number
    LabelGroups: Array<{
      TypeGroups: Array<{
        MeasurementType: { ID?: number; DisplayName?: string; Name?: string }
        Measurements: Array<{ DoubleValue?: number; StringValue?: string }>
      }>
    }>
  }> | undefined

  if (!groupedMeasurements || !Array.isArray(groupedMeasurements)) {
    // Fallback 1: Try to extract from flat numeric values
    let flat = flattenNumericValues(obj)
    console.log('[parseExamRelateds] Fallback 1 - flattenNumericValues found', Object.keys(flat).length, 'keys:', Object.keys(flat).slice(0, 5))

    // Fallback 2: Try to extract from Measurements array (newer API format)
    if (Object.keys(flat).length === 0) {
      const measurements = (obj as any)?.Measurements as Array<{
        Side?: number
        Type?: { DisplayName?: string; Name?: string }
        DoubleValue?: number
        StringValue?: string
      }> | undefined

      console.log('[parseExamRelateds] Fallback 2 - Measurements array has', Array.isArray(measurements) ? measurements.length : 0, 'items')

      if (Array.isArray(measurements) && measurements.length > 0) {
        for (const m of measurements) {
          if (m.DoubleValue != null && Number.isFinite(m.DoubleValue)) {
            const displayName = m.Type?.DisplayName || m.Type?.Name
            if (displayName) flat[displayName] = m.DoubleValue
          }
        }
        if (Object.keys(flat).length > 0) {
          console.log('[parseExamRelateds] Using Measurements fallback, extracted keys:', Object.keys(flat))
        }
      }
    }

    // Return null if no data found (don't silently return defaults)
    if (Object.keys(flat).length === 0) {
      console.log('[parseExamRelateds] No extractable data found in relateds')
      return null
    }

    console.log('[parseExamRelateds] Returning session with extracted data:', Object.keys(flat))
    return {
      OD: normalizeEyeData(flat),
      OE: normalizeEyeData(flat),
      examId,
      examTypeId: typeof examTypeId === 'number' ? examTypeId : undefined,
    }
  }

  // Side 2 = OD, Side 1 = OE (Voiston API convention)
  const odSide = groupedMeasurements.find((s) => s.Side === 2)
  const oeSide = groupedMeasurements.find((s) => s.Side === 1)

  const odExtracted = odSide ? extractSideData(odSide) : { numeric: {}, raw: {}, typeNames: [] }
  const oeExtracted = oeSide ? extractSideData(oeSide) : { numeric: {}, raw: {}, typeNames: [] }

  const allTypeNames = [...odExtracted.typeNames, ...oeExtracted.typeNames]
    .map((n) => n.toLowerCase().trim())
    .filter(Boolean)
  const relatedMeasurementTypeNames = Array.from(new Set(allTypeNames))

  // Leituras alternativas Nidek 2.4mm / 3.3mm
  const kReadings: ParsedExamSession['kReadings'] = {}
  if (
    hasKeratometryDiameter(odExtracted, 'k1', '2dot4') || hasKeratometryDiameter(odExtracted, 'k2', '2dot4') ||
    hasKeratometryDiameter(oeExtracted, 'k1', '2dot4') || hasKeratometryDiameter(oeExtracted, 'k2', '2dot4')
  ) {
    kReadings.ref2dot4 = {
      OD: {
        K1: getNumeric(odExtracted, 'K1_2dot4'),
        K2: getNumeric(odExtracted, 'K2_2dot4'),
        K1Axis: firstNumeric(odExtracted, ['K1Axis_2dot4', 'Axis_K1_2dot4', 'K1_axis_2dot4', 'AxisK1_2dot4']),
        K2Axis: firstNumeric(odExtracted, ['K2Axis_2dot4', 'Axis_K2_2dot4', 'K2_axis_2dot4', 'AxisK2_2dot4']),
        ...normCyl(
          firstNumeric(odExtracted, ['Cyl_2dot4', 'CYL_2dot4', 'Astigmatism_2dot4', 'Astig_2dot4']),
          firstNumeric(odExtracted, ['Axis_2dot4', 'CylAxis_2dot4', 'AstigmatismAxis_2dot4']),
        ),
      },
      OE: {
        K1: getNumeric(oeExtracted, 'K1_2dot4'),
        K2: getNumeric(oeExtracted, 'K2_2dot4'),
        K1Axis: firstNumeric(oeExtracted, ['K1Axis_2dot4', 'Axis_K1_2dot4', 'K1_axis_2dot4', 'AxisK1_2dot4']),
        K2Axis: firstNumeric(oeExtracted, ['K2Axis_2dot4', 'Axis_K2_2dot4', 'K2_axis_2dot4', 'AxisK2_2dot4']),
        ...normCyl(
          firstNumeric(oeExtracted, ['Cyl_2dot4', 'CYL_2dot4', 'Astigmatism_2dot4', 'Astig_2dot4']),
          firstNumeric(oeExtracted, ['Axis_2dot4', 'CylAxis_2dot4', 'AstigmatismAxis_2dot4']),
        ),
      },
    }
  }
  if (
    hasKeratometryDiameter(odExtracted, 'k1', '3dot3') || hasKeratometryDiameter(odExtracted, 'k2', '3dot3') ||
    hasKeratometryDiameter(oeExtracted, 'k1', '3dot3') || hasKeratometryDiameter(oeExtracted, 'k2', '3dot3')
  ) {
    kReadings.ref3dot3 = {
      OD: {
        K1: getNumeric(odExtracted, 'K1_3dot3'),
        K2: getNumeric(odExtracted, 'K2_3dot3'),
        K1Axis: firstNumeric(odExtracted, ['K1Axis_3dot3', 'Axis_K1_3dot3', 'K1_axis_3dot3', 'AxisK1_3dot3']),
        K2Axis: firstNumeric(odExtracted, ['K2Axis_3dot3', 'Axis_K2_3dot3', 'K2_axis_3dot3', 'AxisK2_3dot3']),
        ...normCyl(
          firstNumeric(odExtracted, ['Cyl_3dot3', 'CYL_3dot3', 'Astigmatism_3dot3', 'Astig_3dot3']),
          firstNumeric(odExtracted, ['Axis_3dot3', 'CylAxis_3dot3', 'AstigmatismAxis_3dot3']),
        ),
      },
      OE: {
        K1: getNumeric(oeExtracted, 'K1_3dot3'),
        K2: getNumeric(oeExtracted, 'K2_3dot3'),
        K1Axis: firstNumeric(oeExtracted, ['K1Axis_3dot3', 'Axis_K1_3dot3', 'K1_axis_3dot3', 'AxisK1_3dot3']),
        K2Axis: firstNumeric(oeExtracted, ['K2Axis_3dot3', 'Axis_K2_3dot3', 'K2_axis_3dot3', 'AxisK2_3dot3']),
        ...normCyl(
          firstNumeric(oeExtracted, ['Cyl_3dot3', 'CYL_3dot3', 'Astigmatism_3dot3', 'Astig_3dot3']),
          firstNumeric(oeExtracted, ['Axis_3dot3', 'CylAxis_3dot3', 'AstigmatismAxis_3dot3']),
        ),
      },
    }
  }

  return {
    OD: normalizeEyeData(odExtracted.numeric),
    OE: normalizeEyeData(oeExtracted.numeric),
    examId,
    examTypeId: typeof examTypeId === 'number' ? examTypeId : undefined,
    relatedMeasurementTypeNames,
    kReadings: Object.keys(kReadings).length ? kReadings : undefined,
    rawMeasurements: { OD: odExtracted.raw, OE: oeExtracted.raw },
  }
}
