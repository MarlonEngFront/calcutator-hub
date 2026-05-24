/**
 * POST /api/calculate
 * Proxy server-side para o gateway staging (evita CORS no browser)
 * Monta o payload do contrato do gateway a partir dos dados do hub
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateSingle, calculateBundle } from '@/app/lib/gateway-client'
import type { GatewayEye, GatewayLens } from '@/app/lib/gateway-client'
import type { ParsedBiometry, SurgeryParams } from '@/app/stores/biometry-store'
import type { IOL } from '@/app/lib/iol-catalog'

interface HubCalculateRequest {
  calculatorIds: string[]
  biometry: ParsedBiometry
  iol: IOL
  surgeryParams: SurgeryParams
  isDemoData?: boolean
}

function buildEye(
  eye: ParsedBiometry['OD'],
  surgery: SurgeryParams,
  eyeKey: 'OD' | 'OE'
): GatewayEye {
  const eyeSurgery = surgery[eyeKey]
  return {
    biometry: {
      AL: eye.AL,
      ACD: eye.ACD,
      LT: eye.LT ?? 4.5,         // fallback clínico
      WTW: eye.WTW,
      CCT: eye.CCT,
      method: 'custom_a',
    },
    keratometry: {
      selected: 'anterior',
      K1: eye.K1,
      K2: eye.K2,
      K1Axis: eye.K1Axis,
      K2Axis: eye.K2Axis,
      Cyl: eye.Cyl,
      Axis: eye.Axis,
    },
    surgery: {
      SIA: surgery.SIA,
      SIAAxis: surgery.SIAAxis,
      refTarget: eyeSurgery.refTarget,
      incisionLocation: 180,
    },
    calculatorPreferences: {
      seIOLPower: eyeSurgery.seIOLPower,
      kIndex: '1.3375',
      cylinderConvention: 'plus',
      includePCA: true,
    },
  }
}

function buildLens(iol: IOL): GatewayLens {
  return {
    id: iol.id,
    brand: iol.manufacturer,
    family: iol.model,
    a_constant: iol.aConstant ?? 119.0,
    toric_available: iol.type === 'toric' || iol.type === 'multifocal-toric',
    code: iol.manufacturerCode,
    classification: iol.type,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: HubCalculateRequest = await req.json()
    const { calculatorIds, biometry, iol, surgeryParams, isDemoData } = body

    const requestId = `voiston-hub-${Date.now()}`
    const lens = buildLens(iol)

    const eyes = {
      OD: buildEye(biometry.OD, surgeryParams, 'OD'),
      OE: buildEye(biometry.OE, surgeryParams, 'OE'),
    }

    const base = {
      requestId,
      source: { app: 'jjvisionpro' as const, environment: 'unknown' as const },
      patient: { isDemoData: isDemoData ?? false },
      lens,
      eyes,
    }

    // Bundle (múltiplas calculadoras em paralelo, 1 browser compartilhado)
    if (calculatorIds.length > 1) {
      const bundleRes = await calculateBundle({
        ...base,
        calculators: calculatorIds.map((id) => ({ id })),
      })
      return NextResponse.json(bundleRes)
    }

    // Single
    const singleRes = await calculateSingle({
      ...base,
      calculator: { id: calculatorIds[0] },
    })
    return NextResponse.json({
      bundleId: requestId,
      status: singleRes.status,
      results: { [calculatorIds[0]]: singleRes },
      audit: {
        executedAt: singleRes.audit.executedAt,
        durationMs: 0,
        method: singleRes.audit.method,
        notes: singleRes.audit.notes,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
