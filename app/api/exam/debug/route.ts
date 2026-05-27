/**
 * GET /api/exam/debug?examId=X
 * Debug endpoint — mostra exatamente o que Voiston API retorna (sem parsing)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getExamRelateds, getExamStatus } from '@/app/lib/voiston-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const examId = parseInt(req.nextUrl.searchParams.get('examId') ?? '', 10)
    if (!examId) return NextResponse.json({ error: 'examId obrigatório' }, { status: 400 })

    const [relateds, fullExam] = await Promise.all([
      getExamRelateds(examId),
      getExamStatus(examId),
    ])

    const gm = (relateds as any)?.GroupedMeasurement
    const firstGM = Array.isArray(gm) ? gm[0] : null
    const examObj = (fullExam as any)?.Exam || fullExam

    const examFiles = examObj?.ExamFiles as any[] | undefined

    return NextResponse.json({
      examId,
      exam_status: examObj?.Status,
      exam_status_info: examObj?.Status === 99 || examObj?.Status === 100 ? 'DONE' : examObj?.Status === 11 ? 'UNRECOGNIZED' : 'PROCESSING',
      exam_measurement_count: examObj?.MeasurementCount,
      exam_type: examObj?.ExamType?.Name,
      exam_files: Array.isArray(examFiles) ? examFiles.map((f: any) => ({
        ID: f.ID,
        FileType: f.FileType,
        OCRStatus: f.OCRStatus,
        MimeType: f.FileMimeType,
      })) : null,
      relateds_keys: relateds && typeof relateds === 'object' ? Object.keys(relateds as any) : null,
      relateds_has_GroupedMeasurement: Array.isArray(gm),
      grouped_measurement_count: Array.isArray(gm) ? gm.length : 0,
      first_grouped_measurement: firstGM ? {
        Side: firstGM.Side,
        LabelGroups_count: Array.isArray(firstGM.LabelGroups) ? firstGM.LabelGroups.length : 0,
        first_label_group: Array.isArray(firstGM.LabelGroups) ? {
          TypeGroups_count: Array.isArray(firstGM.LabelGroups[0]?.TypeGroups) ? firstGM.LabelGroups[0].TypeGroups.length : 0,
          first_type_group: firstGM.LabelGroups[0]?.TypeGroups?.[0] ? {
            MeasurementType: firstGM.LabelGroups[0].TypeGroups[0].MeasurementType,
            Measurements_count: Array.isArray(firstGM.LabelGroups[0].TypeGroups[0].Measurements) ? firstGM.LabelGroups[0].TypeGroups[0].Measurements.length : 0,
            first_measurement: firstGM.LabelGroups[0].TypeGroups[0].Measurements?.[0],
          } : null,
        } : null,
      } : null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[exam/debug]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
