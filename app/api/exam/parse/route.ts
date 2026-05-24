/**
 * GET /api/exam/parse?examId=X
 * Busca Relateds + full exam, parseia biometria e retorna dados estruturados.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getExamStatus, getExamRelateds, getPatient } from '@/app/lib/voiston-server'
import { parseExamRelateds, normalizeEyeData } from '@/app/lib/exam-relateds-parser'

export const runtime = 'nodejs'

// Mapa de gênero da Voiston API (0=Masculino, 1=Feminino, 100=Outro)
const GENDER_MAP: Record<string, string> = {
  '0': 'Masculino', '1': 'Feminino', '100': 'Outro',
  'm': 'Masculino', 'f': 'Feminino',
  'male': 'Masculino', 'female': 'Feminino',
  'masculino': 'Masculino', 'feminino': 'Feminino',
}

export async function GET(req: NextRequest) {
  try {
    const examId = parseInt(req.nextUrl.searchParams.get('examId') ?? '', 10)
    if (!examId) return NextResponse.json({ error: 'examId obrigatório' }, { status: 400 })

    const [relateds, fullExam] = await Promise.all([
      getExamRelateds(examId),
      getExamStatus(examId),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const examObj = (fullExam as any)?.Exam || fullExam
    const examTypeId: number | undefined = examObj?.ExamType?.ID
    const examTypeName: string | undefined =
      typeof examObj?.ExamType?.Name === 'string' ? examObj.ExamType.Name.trim() : undefined

    let session = parseExamRelateds(relateds, examId, examTypeId)
    if (!session) {
      session = {
        OD: normalizeEyeData({}),
        OE: normalizeEyeData({}),
        examId,
        examTypeId,
      }
    }

    // Enriquece metadados do paciente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const relData = relateds as any
    let name: string | undefined = examObj?.PatientName
    let gender: unknown = undefined
    let birthDate: string | undefined = examObj?.PossiblePatientDOB

    const embeddedPatient = examObj?.Patient || relData?.Patient
    if (embeddedPatient) {
      if (!name) name = embeddedPatient.Name
      if (embeddedPatient.Gender != null) gender = embeddedPatient.Gender
      if (!birthDate) birthDate = embeddedPatient.Birthday || embeddedPatient.BirthDate
    }

    // Busca registro completo do paciente
    const resolvedPatientId = examObj?.PatientID || embeddedPatient?.ID
    if (resolvedPatientId) {
      try {
        const pData = await getPatient(resolvedPatientId) as Record<string, unknown>
        const pName = pData?.Name as string | undefined
        if (pName && !pName.toLowerCase().startsWith('paciente hub')) {
          if (!name) name = pName
        }
        if (gender == null && pData?.Gender != null) gender = pData.Gender
        if (!birthDate) birthDate = pData?.Birthday as string || pData?.BirthDate as string
      } catch { /* noop */ }
    }

    // Ignora nomes temporários
    if (typeof name === 'string' && name.toLowerCase().startsWith('paciente hub')) name = undefined

    let genderLabel: string | undefined
    if (gender != null && String(gender).trim()) {
      genderLabel = GENDER_MAP[String(gender).toLowerCase().trim()]
    }

    if (name || genderLabel || birthDate) {
      session.patientMetadata = { name, gender: genderLabel, birthDate }
    }
    if (examTypeName) session.examTypeName = examTypeName
    if (typeof examTypeId === 'number') session.examTypeId = examTypeId

    return NextResponse.json(session)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[exam/parse]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
