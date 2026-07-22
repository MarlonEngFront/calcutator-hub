import { cornealAstigmatism, TORIC_INDICATION_THRESHOLD_D } from '@/app/lib/astigmatism'

interface EyeK { K1?: number; K2?: number }

const EYE_LABEL: Record<'OD' | 'OE', string> = { OD: 'Olho Direito', OE: 'Olho Esquerdo' }

/**
 * Aviso clínico: astigmatismo corneano (|K2 − K1|) ≥ 1,00 D por olho indica
 * benefício de LIO tórica. Não renderiza nada se nenhum olho estiver acima do limiar.
 */
export default function ToricIndicationBanner({
  od,
  oe,
  className = '',
}: {
  od: EyeK
  oe: EyeK
  className?: string
}) {
  const eyes = (['OD', 'OE'] as const)
    .map((eye) => ({ eye, data: eye === 'OD' ? od : oe }))
    .map(({ eye, data }) => ({ eye, ast: cornealAstigmatism(data.K1, data.K2) }))
    .filter((e): e is { eye: 'OD' | 'OE'; ast: number } => e.ast != null)

  const indicated = eyes.filter((e) => e.ast >= TORIC_INDICATION_THRESHOLD_D)
  if (indicated.length === 0) return null

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3 ${className}`}>
      <span className="text-xl leading-none" aria-hidden>🔶</span>
      <div className="text-sm">
        <p className="font-semibold text-amber-900">
          Indicação de LIO tórica —{' '}
          {indicated
            .map((e) => `${EYE_LABEL[e.eye]} (${e.eye}): ${e.ast.toFixed(2)} D`)
            .join(' · ')}
        </p>
        <p className="text-amber-700 mt-0.5">
          Astigmatismo corneano ≥ {TORIC_INDICATION_THRESHOLD_D.toFixed(2)} D (|K2 − K1|) — considere
          uma LIO tórica para reduzir a dependência de óculos para longe no pós-operatório.
        </p>
      </div>
    </div>
  )
}
