import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { IOL } from '@/app/lib/iol-catalog'

export interface ParsedEye {
  AL: number
  K1: number
  K2: number
  K1Axis?: number
  K2Axis?: number
  TK1?: number
  TK2?: number
  ACD: number
  WTW: number
  CCT?: number
  Cyl?: number
  Axis?: number
  LT?: number
  refTarget?: number
}

export interface ParsedBiometry {
  OD: ParsedEye
  OE: ParsedEye
}

export type KeratometryReading = {
  K1?: number
  K2?: number
  K1Axis?: number
  K2Axis?: number
  Cyl?: number
  Axis?: number
}

export type KeratometryReadings = {
  ref2dot4?: { OD?: KeratometryReading; OE?: KeratometryReading }
  ref3dot3?: { OD?: KeratometryReading; OE?: KeratometryReading }
}

export interface BiometryMeta {
  filename: string
  uploadedAt: string
  fileSize: number
  fileType: string
  patientName?: string
  gender?: string
  equipment?: string
  examType?: string
  examId?: number
  examTypeId?: number
}

export interface SurgeryParams {
  SIA: number
  SIAAxis: number
  OD: { seIOLPower: number; refTarget: number }
  OE: { seIOLPower: number; refTarget: number }
}

export interface CalculationResult {
  requestId: string
  calculatorId: string
  calculatorLabel: string
  status: 'completed' | 'failed' | 'partial'
  results: Array<{
    eye: 'OD' | 'OE'
    iolPower?: number
    predictedRefraction?: number
    toricModel?: string
    toricAxis?: number
    residualAstigmatism?: number
    screenshotDataUrl?: string
    warnings: string[]
    raw?: Record<string, unknown>
  }>
  audit: {
    executedAt: string
    method: string
    notes: string[]
  }
  error?: string
}

export interface BiometrySessionExtras {
  originalBiometry?: ParsedBiometry
  kReadings?: KeratometryReadings
  rawMeasurements?: { OD: Record<string, string>; OE: Record<string, string> }
  relatedMeasurementTypeNames?: string[]
}

interface BiometryStore {
  biometry: ParsedBiometry | null
  originalBiometry: ParsedBiometry | null
  meta: BiometryMeta | null
  kReadings: KeratometryReadings | null
  rawMeasurements: { OD: Record<string, string>; OE: Record<string, string> } | null
  relatedMeasurementTypeNames: string[]
  selectedIOL: IOL | null
  surgeryParams: SurgeryParams
  originalSurgeryParams: SurgeryParams
  calculationResults: CalculationResult[]
  fileDataUrl: string | null
  surgicalPresets: Record<string, SurgeryParams>
  activeSurgicalPreset: string

  setBiometry: (
    b: ParsedBiometry,
    meta: BiometryMeta,
    extras?: BiometrySessionExtras,
    surgery?: SurgeryParams,
  ) => void
  clearBiometry: () => void
  updateODField: (field: keyof ParsedEye, value: number) => void
  updateOEField: (field: keyof ParsedEye, value: number) => void
  setODEye: (eye: ParsedEye) => void
  setOEEye: (eye: ParsedEye) => void
  setSelectedIOL: (iol: IOL | null) => void
  setSurgeryParams: (params: Partial<SurgeryParams>) => void
  setCalculationResults: (results: CalculationResult[]) => void
  clearResults: () => void
  setFileDataUrl: (url: string | null) => void
  setSurgicalPreset: (name: string, params: SurgeryParams) => void
  deleteSurgicalPreset: (name: string) => void
  selectSurgicalPreset: (name: string) => void
}

const DEFAULT_SURGERY: SurgeryParams = {
  SIA: 0.1,
  SIAAxis: 120,
  OD: { seIOLPower: 21.0, refTarget: 0 },
  OE: { seIOLPower: 21.0, refTarget: 0 },
}

const DEFAULT_PRESETS: Record<string, SurgeryParams> = {
  'Padrão 1': DEFAULT_SURGERY,
}

export const useBiometryStore = create<BiometryStore>()(
  persist(
    (set) => ({
      biometry: null,
      originalBiometry: null,
      meta: null,
      kReadings: null,
      rawMeasurements: null,
      relatedMeasurementTypeNames: [],
      selectedIOL: null,
      surgeryParams: DEFAULT_SURGERY,
      originalSurgeryParams: DEFAULT_SURGERY,
      calculationResults: [],
      fileDataUrl: null,
      surgicalPresets: DEFAULT_PRESETS,
      activeSurgicalPreset: 'Padrão 1',

      setBiometry: (biometry, meta, extras, surgery) =>
        set({
          biometry,
          meta,
          originalBiometry: extras?.originalBiometry ?? structuredClone(biometry),
          kReadings: extras?.kReadings ?? null,
          rawMeasurements: extras?.rawMeasurements ?? null,
          relatedMeasurementTypeNames: extras?.relatedMeasurementTypeNames ?? [],
          ...(surgery
            ? { surgeryParams: surgery, originalSurgeryParams: structuredClone(surgery) }
            : {}),
        }),

      clearBiometry: () =>
        set({
          biometry: null,
          originalBiometry: null,
          meta: null,
          kReadings: null,
          rawMeasurements: null,
          relatedMeasurementTypeNames: [],
          selectedIOL: null,
          calculationResults: [],
          fileDataUrl: null,
          surgeryParams: DEFAULT_SURGERY,
          originalSurgeryParams: DEFAULT_SURGERY,
        }),

      updateODField: (field, value) =>
        set((state) => ({
          biometry: state.biometry
            ? { ...state.biometry, OD: { ...state.biometry.OD, [field]: value } }
            : null,
        })),

      updateOEField: (field, value) =>
        set((state) => ({
          biometry: state.biometry
            ? { ...state.biometry, OE: { ...state.biometry.OE, [field]: value } }
            : null,
        })),

      setODEye: (eye) =>
        set((state) => ({
          biometry: state.biometry ? { ...state.biometry, OD: eye } : null,
        })),

      setOEEye: (eye) =>
        set((state) => ({
          biometry: state.biometry ? { ...state.biometry, OE: eye } : null,
        })),

      setSelectedIOL: (iol) => set({ selectedIOL: iol }),

      setSurgeryParams: (params) =>
        set((state) => ({
          surgeryParams: { ...state.surgeryParams, ...params },
        })),

      setCalculationResults: (results) => set({ calculationResults: results }),

      clearResults: () => set({ calculationResults: [] }),

      setFileDataUrl: (url) => set({ fileDataUrl: url }),

      setSurgicalPreset: (name, params) =>
        set((state) => ({
          surgicalPresets: { ...state.surgicalPresets, [name]: params },
          activeSurgicalPreset: name,
        })),

      deleteSurgicalPreset: (name) =>
        set((state) => {
          const next = { ...state.surgicalPresets }
          delete next[name]
          if (Object.keys(next).length === 0) next['Padrão 1'] = DEFAULT_SURGERY
          const nextActive =
            state.activeSurgicalPreset === name ? Object.keys(next)[0] : state.activeSurgicalPreset
          return { surgicalPresets: next, activeSurgicalPreset: nextActive }
        }),

      selectSurgicalPreset: (name) =>
        set((state) => {
          const preset = state.surgicalPresets[name]
          if (!preset) return {}
          return { activeSurgicalPreset: name, surgeryParams: preset }
        }),
    }),
    {
      name: 'voiston-hub-biometry-v2',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
      partialize: (state) => ({
        biometry: state.biometry,
        originalBiometry: state.originalBiometry,
        meta: state.meta,
        kReadings: state.kReadings,
        rawMeasurements: state.rawMeasurements,
        relatedMeasurementTypeNames: state.relatedMeasurementTypeNames,
        selectedIOL: state.selectedIOL,
        surgeryParams: state.surgeryParams,
        originalSurgeryParams: state.originalSurgeryParams,
        surgicalPresets: state.surgicalPresets,
        activeSurgicalPreset: state.activeSurgicalPreset,
      }),
    }
  )
)
