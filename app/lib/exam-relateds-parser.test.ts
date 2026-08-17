import { describe, expect, it } from 'vitest'
import { eyeDataCriticalFieldsResolved, normalizeEyeData, parseExamRelateds, unwrapExamRelatedsPayload } from './exam-relateds-parser'

describe('unwrapExamRelatedsPayload', () => {
  it('returns root when GroupedMeasurement is top-level', () => {
    const root = { GroupedMeasurement: [{ Side: 2, LabelGroups: [] }] }
    expect(unwrapExamRelatedsPayload(root).GroupedMeasurement).toHaveLength(1)
  })

  it('unwraps nested data.GroupedMeasurement', () => {
    const wrapped = {
      data: {
        GroupedMeasurement: [{ Side: 2, LabelGroups: [] }],
      },
    }
    expect(unwrapExamRelatedsPayload(wrapped).GroupedMeasurement).toHaveLength(1)
  })
})

describe('parseExamRelateds Nidek K refs', () => {
  it('extracts kReadings for 2.4 and 3.3', () => {
    const session = parseExamRelateds(
      {
        GroupedMeasurement: [
          {
            Side: 2,
            LabelGroups: [
              {
                TypeGroups: [
                  {
                    MeasurementType: { Name: 'K1_2dot4' },
                    Measurements: [{ DoubleValue: 44.12 }],
                  },
                  {
                    MeasurementType: { Name: 'K2_2dot4' },
                    Measurements: [{ DoubleValue: 45.42 }],
                  },
                  {
                    MeasurementType: { Name: 'K1_3dot3' },
                    Measurements: [{ DoubleValue: 44.12 }],
                  },
                  {
                    MeasurementType: { Name: 'K2_3dot3' },
                    Measurements: [{ DoubleValue: 45.61 }],
                  },
                  {
                    MeasurementType: { Name: 'AL' },
                    Measurements: [{ DoubleValue: 23.35 }],
                  },
                ],
              },
            ],
          },
        ],
      },
      123,
      86,
    )

    expect(session?.kReadings?.ref2dot4?.OD?.K1).toBe(44.12)
    expect(session?.kReadings?.ref3dot3?.OD?.K2).toBe(45.61)
    expect(session?.rawMeasurements?.OD.K1_2dot4).toBeUndefined()
  })
})

describe('parseExamRelateds recusa payload sem AL/K1/K2 reconhecível', () => {
  // Bug real: Zeiss IOLMaster 700 no hub — GroupedMeasurement vinha com
  // MeasurementType só com ID (sem Name/DisplayName). extractSideData guardava
  // esses valores só como `numeric['__id_N']`, então o guard de "numeric vazio"
  // não pegava (havia chaves), mas find() nunca casava nada — todo campo caía
  // no default hardcoded (AL 23.50, K1 43.00...) como se fosse medida real.
  it('retorna null quando as medidas só têm ID, sem Name/DisplayName', () => {
    const session = parseExamRelateds(
      {
        GroupedMeasurement: [
          {
            Side: 2,
            LabelGroups: [
              {
                TypeGroups: [
                  { MeasurementType: { ID: 101 }, Measurements: [{ DoubleValue: 23.57 }] },
                  { MeasurementType: { ID: 102 }, Measurements: [{ DoubleValue: 43.95 }] },
                  { MeasurementType: { ID: 103 }, Measurements: [{ DoubleValue: 45.06 }] },
                ],
              },
            ],
          },
          {
            Side: 1,
            LabelGroups: [
              {
                TypeGroups: [
                  { MeasurementType: { ID: 101 }, Measurements: [{ DoubleValue: 23.24 }] },
                ],
              },
            ],
          },
        ],
      },
      123,
      86,
    )

    expect(session).toBeNull()
  })

  it('eyeDataCriticalFieldsResolved reporta AL/K1/K2 ausentes quando só há chaves não reconhecidas', () => {
    const resolved = eyeDataCriticalFieldsResolved({ DeltaK: 44.7 })
    expect(resolved).toEqual({ AL: false, K1: false, K2: false })
  })

  it('eyeDataCriticalFieldsResolved reporta true quando rótulos batem', () => {
    const resolved = eyeDataCriticalFieldsResolved({ AL: 23.57, K1: 43.95, K2: 45.06 })
    expect(resolved).toEqual({ AL: true, K1: true, K2: true })
  })
})

describe('normalizeEyeData loose matching', () => {
  // Regressão: exame real (Alcon OcuScan RxP) trouxe 'DeltaK' e
  // 'Astigmatismo (central)' = 45.42 D, sem nenhum rótulo limpo de AL/LT.
  // 'al' era substring de 'centr-AL' e 'lt' era substring de 'de-LT-aK',
  // então Comprimento Axial e Espessura do Cristalino roubavam o valor de
  // astigmatismo em vez de cair no default. Ver app/lib/exam-relateds-parser.ts.
  it('does not match AL/LT inside unrelated labels via substring', () => {
    const eye = normalizeEyeData({
      DeltaK: 45.42,
      'Astigmatismo (central)': 45.42,
      K1: 44.06,
      K2: 45.99,
    })

    // Sem rótulo real de AL/LT no payload, deve cair no default fisiológico —
    // nunca no valor de astigmatismo (45.42 é impossível como AL/LT em mm).
    expect(eye.AL).toBe(23.5)
    expect(eye.LT).toBe(4.2)
  })

  it('still matches AL/LT when the label is the real thing (word-bounded)', () => {
    const eye = normalizeEyeData({
      'AL (mm)': 22.36,
      'Lens Thickness': 4.35,
      K1: 44.06,
      K2: 45.99,
    })

    expect(eye.AL).toBe(22.36)
    expect(eye.LT).toBe(4.35)
  })

  // Mesmo exame real, olho OE: K2 nao veio no payload, so K1 + DeltaK +
  // 'Astigmatismo (central)'. O fallback Argos (reconstroi K1/K2 a partir de
  // DeltaK +- |Astig|/2) precisa continuar casando 'astigmatismo (central)'
  // via o needle explicito 'astigmatismo' (nao mais via prefixo solto
  // 'astigmatism' dentro de 'astigmatismo', que o word-boundary bloqueia).
  it('Argos K2 reconstruction still matches Portuguese "astigmatismo" label', () => {
    const eye = normalizeEyeData({
      K1: 43.94,
      DeltaK: 44.7,
      'Astigmatismo (central)': 44.7,
    })

    // kav=44.7, astig=44.7 -> half=22.35 -> K2 = kav + half = 67.05
    // (mesmo resultado de antes da mudanca — nao e o valor certo pro paciente,
    // isso e um problema de rotulagem no exame de origem, nao deste parser,
    // mas o comportamento do reconstruction fallback nao deve regredir)
    expect(eye.K2).toBeCloseTo(67.05, 2)
  })
})
