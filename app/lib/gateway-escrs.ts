/**
 * ESCRS IOL Calculator Gateway Integration
 * Integrates ESCRS headless adapter with voiston gateway
 *
 * Can be used:
 * 1. Via gateway HTTP endpoint: POST /calculate?calculatorId=escrs
 * 2. Directly: import { calculateESCRSViaSyringe } from '@/lib/gateway-escrs'
 */

import { calculateESCRS } from './adapters/escrs-adapter'

export interface ESCRSCalculationRequest {
  calculatorId: 'escrs'
  eye: 'OD' | 'OS'
  biometry: {
    k1: number // Keratometry reading 1 (D)
    k2: number // Keratometry reading 2 (D)
    al: number // Axial length (mm)
    acd: number // Anterior chamber depth (mm)
    lt?: number // Lens thickness (mm) - optional
    cct?: number // Central corneal thickness (µm) - optional
    wtw?: number // White-to-white (mm) - optional
  }
  options?: {
    manufacturer?: string // IOL manufacturer (default: Alcon)
    headless?: boolean // Run browser headless (default: false for stability)
    slowMo?: number // Slow down operations by this many ms
    timeout?: number // Operation timeout in ms
  }
}

export interface ESCRSCalculationResult {
  success: boolean
  calculator: 'ESCRS'
  eye: 'OD' | 'OS'
  input: {
    k1: number
    k2: number
    al: number
    acd: number
    manufacturer?: string
  }
  results?: Record<string, any>
  screenshots?: {
    before: string
    after: string
  }
  error?: string
}

/**
 * Calculate IOL power using ESCRS calculator
 * Wrapper around Node.js Playwright adapter for use in Next.js server components
 *
 * ⚠️ NOTE: This requires @playwright/test package and will only work in:
 * - Node.js environment (not browser)
 * - API routes
 * - Server actions
 * - getServerSideProps / getStaticProps
 */
export async function calculateESCRSViaSyringe(
  request: ESCRSCalculationRequest
): Promise<ESCRSCalculationResult> {
  try {
    // Validate input
    if (!request.biometry.k1 || !request.biometry.k2 || !request.biometry.al || !request.biometry.acd) {
      return {
        success: false,
        calculator: 'ESCRS',
        eye: request.eye,
        error: 'Missing required biometry fields: K1, K2, AL, ACD',
      }
    }

    // Call Playwright adapter
    const result = await calculateESCRS(request.biometry, {
      eye: request.eye,
      manufacturer: request.options?.manufacturer,
      headless: request.options?.headless ?? false,
      slowMo: request.options?.slowMo ?? 500,
      timeout: request.options?.timeout ?? 60000,
    })

    return result
  } catch (error) {
    return {
      success: false,
      calculator: 'ESCRS',
      eye: request.eye,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Gateway API endpoint wrapper
 * Use in app/api/calculate.ts or similar
 *
 * Example:
 * ```typescript
 * export async function POST(req: Request) {
 *   const body = await req.json();
 *   if (body.calculatorId === 'escrs') {
 *     const result = await calculateESCRSViaSyringe(body);
 *     return Response.json(result);
 *   }
 * }
 * ```
 */
export async function handleESCRSCalculation(req: ESCRSCalculationRequest): Promise<ESCRSCalculationResult> {
  return calculateESCRSViaSyringe(req)
}
