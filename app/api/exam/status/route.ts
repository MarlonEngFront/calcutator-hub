/**
 * GET /api/exam/status?examId=X
 * Retorna status atual do exame (uma checagem — browser faz polling).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getExamStatus } from '@/app/lib/voiston-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const examId = parseInt(req.nextUrl.searchParams.get('examId') ?? '', 10)
    if (!examId) return NextResponse.json({ error: 'examId obrigatório' }, { status: 400 })

    const data = await getExamStatus(examId)
    const status = (data as { Status?: number }).Status ?? 0

    return NextResponse.json({
      status,
      done: status === 99 || status === 100,
      error: status >= 90 && status !== 99 && status !== 100,
      unrecognized: status === 11,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[exam/status]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
