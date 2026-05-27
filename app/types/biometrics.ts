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
  SIA: number
  SIAAxis: number
  refTarget: number
}

export const BIOMETRIC_RANGES = {
  AL:        { min: 20.0, max: 30.0, unit: 'mm',  label: 'Comprimento Axial', decimals: 2 },
  K1:        { min: 38.0, max: 50.0, unit: 'D',   label: 'K1 (plana)',        decimals: 2 },
  K2:        { min: 38.0, max: 50.0, unit: 'D',   label: 'K2 (acentuada)',    decimals: 2 },
  TK1:       { min: 38.0, max: 50.0, unit: 'D',   label: 'TK1 (Total)',       decimals: 2 },
  TK2:       { min: 38.0, max: 50.0, unit: 'D',   label: 'TK2 (Total)',       decimals: 2 },
  Cyl:       { min: 0.0,  max: 10.0, unit: 'D',   label: 'Astigmatismo (Cyl)', decimals: 2 },
  Axis:      { min: 0,    max: 180,  unit: '°',   label: 'Eixo Ast.',      decimals: 0 },
  ACD:       { min: 2.0,  max: 4.5,  unit: 'mm',  label: 'Prof. Câm. Ant.',   decimals: 2 },
  LT:        { min: 2.0,  max: 6.0,  unit: 'mm',  label: 'Espessura Cristal.', decimals: 2 },
  WTW:       { min: 10.0, max: 14.0, unit: 'mm',  label: 'White-to-White',    decimals: 1 },
  CCT:       { min: 400,  max: 700,  unit: 'µm',  label: 'Espessura Corneal', decimals: 0 },
  SIA:       { min: 0.0,  max: 2.0,  unit: 'D',   label: 'SIA (Magnitude)',   decimals: 2 },
  SIAAxis:   { min: 0,    max: 180,  unit: '°',   label: 'SIA (Eixo)',        decimals: 0 },
  refTarget: { min: -3.0, max: 1.0,  unit: 'D',   label: 'Refração Alvo',     decimals: 2 },
} as const

export type BiometricKey = keyof typeof BIOMETRIC_RANGES

export function isInRange(key: BiometricKey, value: number): boolean {
  const range = BIOMETRIC_RANGES[key]
  return value >= range.min && value <= range.max
}
