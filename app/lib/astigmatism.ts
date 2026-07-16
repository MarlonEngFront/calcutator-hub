import { IOL_CATALOG } from './iol-catalog'

/** Astigmatismo corneano ≥ este valor (D) indica benefício de LIO tórica. */
export const TORIC_INDICATION_THRESHOLD_D = 1.0

/** Astigmatismo corneano ceratométrico simples: |K2 − K1|. */
export function cornealAstigmatism(K1?: number, K2?: number): number | undefined {
  if (K1 == null || K2 == null || !Number.isFinite(K1) || !Number.isFinite(K2)) return undefined
  return Math.abs(K2 - K1)
}

export function isToricIndicated(K1?: number, K2?: number): boolean {
  const ast = cornealAstigmatism(K1, K2)
  return ast != null && ast >= TORIC_INDICATION_THRESHOLD_D
}

/** Cruza o código da lente (CalcLens.code / IOL.manufacturerCode) com o catálogo clínico para saber se é tórica. */
export function isToricLensCode(code: string): boolean {
  const iol = IOL_CATALOG.find((l) => l.manufacturerCode === code)
  return iol?.type === 'toric' || iol?.type === 'multifocal-toric'
}
