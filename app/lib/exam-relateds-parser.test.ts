import { describe, expect, it } from 'vitest'
import { parseExamRelateds, unwrapExamRelatedsPayload } from './exam-relateds-parser'

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
