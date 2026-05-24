/**
 * POST /api/exam/confirm
 * Confirma que o upload do arquivo foi concluído.
 */
import { NextRequest, NextResponse } from 'next/server'
import { confirmUpload } from '@/app/lib/voiston-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { examId, examFileId, fileSize } = await req.json() as {
      examId: number
      examFileId: number
      fileSize: number
    }
    await confirmUpload(examFileId, examId, fileSize)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[exam/confirm]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
