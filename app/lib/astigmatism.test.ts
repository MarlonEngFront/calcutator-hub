import { describe, expect, it } from 'vitest'
import { cornealAstigmatism, isToricIndicated, isToricLensCode, TORIC_INDICATION_THRESHOLD_D } from './astigmatism'

describe('cornealAstigmatism', () => {
  it('calcula |K2 - K1|', () => {
    expect(cornealAstigmatism(43.0, 44.5)).toBeCloseTo(1.5)
    expect(cornealAstigmatism(44.5, 43.0)).toBeCloseTo(1.5)
  })

  it('retorna undefined se K1 ou K2 faltarem', () => {
    expect(cornealAstigmatism(undefined, 44.5)).toBeUndefined()
    expect(cornealAstigmatism(43.0, undefined)).toBeUndefined()
  })
})

describe('isToricIndicated', () => {
  it('threshold é 1.00 D', () => {
    expect(TORIC_INDICATION_THRESHOLD_D).toBe(1.0)
  })

  it('indica quando astigmatismo >= 1.00 D', () => {
    expect(isToricIndicated(43.0, 44.0)).toBe(true)
    expect(isToricIndicated(43.0, 44.5)).toBe(true)
  })

  it('não indica quando astigmatismo < 1.00 D', () => {
    expect(isToricIndicated(43.0, 43.5)).toBe(false)
    expect(isToricIndicated(43.0, 43.0)).toBe(false)
  })

  it('não indica quando faltam dados', () => {
    expect(isToricIndicated(undefined, undefined)).toBe(false)
  })
})

describe('isToricLensCode', () => {
  it('reconhece lentes tóricas e multifocais tóricas do catálogo', () => {
    expect(isToricLensCode('Alcon SN6ATx')).toBe(true)
    expect(isToricLensCode('Alcon TFNTx')).toBe(true) // multifocal-toric
    expect(isToricLensCode('J&J ZCU')).toBe(true)
  })

  it('não marca lentes monofocais/EDOF como tóricas', () => {
    expect(isToricLensCode('Alcon SN60WF')).toBe(false)
    expect(isToricLensCode('J&J ZCB00')).toBe(false)
  })

  it('retorna false para código desconhecido', () => {
    expect(isToricLensCode('Inexistente XYZ')).toBe(false)
  })
})
