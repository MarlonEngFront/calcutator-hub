/**
 * Gateway Client — Voiston Calculator Hub
 * Aponta para o jjvision-calculation-gateway no staging
 */

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ??
  'https://jjvision-calculation-gateway-staging-372709372581.southamerica-east1.run.app'

export type GatewayEye = {
  biometry: {
    AL: number
    ACD: number
    LT: number
    WTW: number
    CCT?: number
    method?: 'optical_immersion' | 'ultrasound_contact' | 'custom_a' | 'custom_sf' | 'custom_acd'
  }
  keratometry: {
    selected: 'anterior' | 'total' | 'nidek_ref_2_4' | 'nidek_ref_3_3' | 'unknown'
    K1: number
    K2: number
    K1Axis?: number
    K2Axis?: number
    Cyl?: number
    Axis?: number
  }
  surgery: {
    SIA: number
    SIAAxis: number
    refTarget: number
    incisionLocation?: number
    preLasikRef?: number
    postLasikRef?: number
    lensFactor?: number
  }
  calculatorPreferences: {
    seIOLPower?: number
    kIndex: '1.3375' | '1.336' | '1.332' | '1.3315'
    cylinderConvention: 'plus' | 'minus'
    includePCA: boolean
  }
}

export type GatewayLens = {
  id: string
  brand: string
  family: string
  a_constant: number
  toric_available: boolean
  code?: string
  classification?: string
}

export type GatewayRequest = {
  requestId: string
  source: {
    app: 'jjvisionpro'
    environment: 'local' | 'preview' | 'production' | 'unknown'
  }
  patient: {
    isDemoData: boolean
    patientId?: string | number
    examId?: string | number
  }
  calculator: { id: string; label?: string }
  lens: GatewayLens
  eyes: {
    OD?: GatewayEye
    OE?: GatewayEye
  }
}

export type GatewayResponse = {
  requestId: string
  status: 'completed' | 'failed' | 'partial'
  calculator: { id: string; label: string; mode: string }
  lens: {
    requested: GatewayLens
    availableInCalculator: boolean | null
    matchedName?: string
  }
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
    artifactRefs: string[]
    notes: string[]
  }
}

export type GatewayBundleRequest = Omit<GatewayRequest, 'calculator'> & {
  calculators: Array<{ id: string; label?: string }>
}

export type GatewayBundleResponse = {
  bundleId: string
  status: 'completed' | 'failed' | 'partial'
  results: Record<string, GatewayResponse>
  audit: {
    executedAt: string
    durationMs: number
    method: string
    notes: string[]
  }
}

export async function calculateSingle(req: GatewayRequest): Promise<GatewayResponse> {
  const res = await fetch(`${GATEWAY_URL}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gateway error ${res.status}: ${body}`)
  }
  return res.json()
}

export async function calculateBundle(req: GatewayBundleRequest): Promise<GatewayBundleResponse> {
  const res = await fetch(`${GATEWAY_URL}/calculate-bundle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gateway bundle error ${res.status}: ${body}`)
  }
  return res.json()
}

export function checkGatewayHealth(): Promise<{ status: string }> {
  return fetch(`${GATEWAY_URL}/health`).then((r) => r.json())
}
