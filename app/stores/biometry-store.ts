import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IOL } from '@/app/lib/iol-catalog'

export interface ParsedBiometry {
  OD: {
    AL: number
    K1: number
    K2: number
    K1Axis?: number
    K2Axis?: number
    ACD: number
    WTW: number
    CCT?: number
    Cyl?: number
    Axis?: number
    LT?: number
    refTarget?: number
  }
  OE: {
    AL: number
    K1: number
    K2: number
    K1Axis?: number
    K2Axis?: number
    ACD: number
    WTW: number
    CCT?: number
    Cyl?: number
    Axis?: number
    LT?: number
    refTarget?: number
  }
}

export interface BiometryMeta {
  filename: string
  uploadedAt: string
  fileSize: number
  fileType: string
  patientName?: string
  equipment?: string
  examType?: string
  examId?: number        // ID do exame na API Voiston
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

interface BiometryStore {
  biometry: ParsedBiometry | null
  meta: BiometryMeta | null
  selectedIOL: IOL | null
  surgeryParams: SurgeryParams
  calculationResults: CalculationResult[]

  setBiometry: (b: ParsedBiometry, meta: BiometryMeta) => void
  clearBiometry: () => void
  updateODField: (field: keyof ParsedBiometry['OD'], value: number) => void
  updateOEField: (field: keyof ParsedBiometry['OE'], value: number) => void
  setSelectedIOL: (iol: IOL | null) => void
  setSurgeryParams: (params: Partial<SurgeryParams>) => void
  setCalculationResults: (results: CalculationResult[]) => void
  clearResults: () => void
}

const DEFAULT_SURGERY: SurgeryParams = {
  SIA: 0.1,
  SIAAxis: 120,
  OD: { seIOLPower: 21.0, refTarget: 0 },
  OE: { seIOLPower: 21.0, refTarget: 0 },
}

export const useBiometryStore = create<BiometryStore>()(
  persist(
    (set) => ({
      biometry: null,
      meta: null,
      selectedIOL: null,
      surgeryParams: DEFAULT_SURGERY,
      calculationResults: [],

      setBiometry: (biometry, meta) => set({ biometry, meta }),

      clearBiometry: () =>
        set({
          biometry: null,
          meta: null,
          selectedIOL: null,
          calculationResults: [],
          surgeryParams: DEFAULT_SURGERY,
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

      setSelectedIOL: (iol) => set({ selectedIOL: iol }),

      setSurgeryParams: (params) =>
        set((state) => ({
          surgeryParams: { ...state.surgeryParams, ...params },
        })),

      setCalculationResults: (results) => set({ calculationResults: results }),

      clearResults: () => set({ calculationResults: [] }),
    }),
    {
      name: 'voiston-hub-biometry',
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      // Exclude calculationResults — base64 screenshots can be MBs, crash hydration
      partialize: (state) => ({
        biometry: state.biometry,
        meta: state.meta,
        selectedIOL: state.selectedIOL,
        surgeryParams: state.surgeryParams,
        // calculationResults intentionally excluded
      }),
    }
  )
)
