/**
 * POST /api/exam/init
 * Solicita signed URL para upload direto ao storage.
 * Sem criação de paciente — hub é ferramenta de cálculo, não de cadastro.
 * Token de serviço gerenciado server-side (auto-login via env).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requestUpload } from '@/app/lib/voiston-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = (await req.json()) as {
      filename: string
      contentType: string
    }

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'filename e contentType são obrigatórios' },
        { status: 400 }
      )
    }

    const upload = await requestUpload(filename, contentType)

    return NextResponse.json({
      signedUrl: upload.SignedUrl,
      signedHeaders: upload.Headers,
      examId: upload.ExamId,
      examFileId: upload.ExamFileId,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[exam/init]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
