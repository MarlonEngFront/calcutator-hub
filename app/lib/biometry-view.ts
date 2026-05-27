import type { BiometricKey, EyeData } from '@/app/types/biometrics'
import type { KeratometryReading, ParsedBiometry, ParsedEye, SurgeryParams } from '@/app/stores/biometry-store'

export function buildEyeData(
  eye: ParsedEye,
  surgery: SurgeryParams,
  eyeKey: 'OD' | 'OE',
): EyeData {
  return {
    AL: eye.AL,
    K1: eye.K1,
    K2: eye.K2,
    K1Axis: eye.K1Axis,
    K2Axis: eye.K2Axis,
    TK1: eye.TK1,
    TK2: eye.TK2,
    Cyl: eye.Cyl ?? 0,
    Axis: eye.Axis ?? 0,
    ACD: eye.ACD,
    LT: eye.LT ?? 4.2,
    WTW: eye.WTW,
    CCT: eye.CCT ?? 540,
    SIA: surgery.SIA,
    SIAAxis: surgery.SIAAxis,
    refTarget: surgery[eyeKey].refTarget,
  }
}

export function buildOriginalEyeData(
  original: ParsedBiometry | null,
  eyeKey: 'OD' | 'OE',
  surgery: SurgeryParams,
): EyeData | null {
  if (!original) return null
  return buildEyeData(original[eyeKey], surgery, eyeKey)
}

const SURGERY_KEYS = new Set<BiometricKey>(['SIA', 'SIAAxis', 'refTarget'])

export function isSurgeryField(key: BiometricKey): boolean {
  return SURGERY_KEYS.has(key)
}

export function eyeFieldFromBiometricKey(key: BiometricKey): keyof ParsedEye | null {
  if (SURGERY_KEYS.has(key)) return null
  if (key === 'TK1' || key === 'TK2') return key
  if (key in ({ AL: 1, K1: 1, K2: 1, K1Axis: 1, K2Axis: 1, Cyl: 1, Axis: 1, ACD: 1, LT: 1, WTW: 1, CCT: 1 } as Record<string, 1>)) {
    return key as keyof ParsedEye
  }
  return null
}

export function applyKeratometryReadingToParsedEye(
  eye: ParsedEye,
  reading?: KeratometryReading,
): ParsedEye {
  if (!reading) return eye
  const next = { ...eye }
  if (reading.K1 != null) next.K1 = reading.K1
  if (reading.K2 != null) next.K2 = reading.K2
  if (reading.K1Axis != null) next.K1Axis = reading.K1Axis
  if (reading.K2Axis != null) next.K2Axis = reading.K2Axis
  if (reading.Cyl != null) next.Cyl = reading.Cyl
  if (reading.Axis != null) next.Axis = reading.Axis
  return next
}

/** Persiste EyeData editado de volta ao store (calculadoras leem biometry). */
export function parsedEyeFromEyeData(eye: EyeData): ParsedEye {
  return {
    AL: eye.AL,
    K1: eye.K1,
    K2: eye.K2,
    K1Axis: eye.K1Axis,
    K2Axis: eye.K2Axis,
    TK1: eye.TK1,
    TK2: eye.TK2,
    Cyl: eye.Cyl,
    Axis: eye.Axis,
    ACD: eye.ACD,
    LT: eye.LT,
    WTW: eye.WTW,
    CCT: eye.CCT,
    refTarget: eye.refTarget,
  }
}

export function sessionEyeFromParsed(sessionEye: {
  K1: number
  K2: number
  K1Axis?: number
  K2Axis?: number
  TK1?: number
  TK2?: number
  Cyl: number
  Axis: number
  AL: number
  ACD: number
  LT: number
  WTW: number
  CCT: number
  refTarget: number
  SIA: number
  SIAAxis: number
}): ParsedEye {
  return {
    AL: sessionEye.AL,
    K1: sessionEye.K1,
    K2: sessionEye.K2,
    K1Axis: sessionEye.K1Axis,
    K2Axis: sessionEye.K2Axis,
    TK1: sessionEye.TK1,
    TK2: sessionEye.TK2,
    Cyl: sessionEye.Cyl,
    Axis: sessionEye.Axis,
    ACD: sessionEye.ACD,
    LT: sessionEye.LT,
    WTW: sessionEye.WTW,
    CCT: sessionEye.CCT,
    refTarget: sessionEye.refTarget,
  }
}
