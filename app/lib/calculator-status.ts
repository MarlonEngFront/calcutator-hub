/**
 * Verificador de status online das calculadoras externas.
 * Como os sites (TECNIS, APACRS, BRASCRS, ESCRS) não habilitam CORS pro nosso
 * domínio, fazemos um fetch em modo 'no-cors': a resposta vem opaca (não dá pra
 * ler status HTTP), mas se o host estiver fora do ar / inacessível o fetch
 * rejeita — o que já é suficiente para detectar "fora do ar" vs "no ar".
 */

export type CalcOnlineStatus = 'checking' | 'online' | 'offline' | 'unknown'

const CHECK_TIMEOUT_MS = 6000

async function pingUrl(url: string, timeoutMs = CHECK_TIMEOUT_MS): Promise<CalcOnlineStatus> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: controller.signal })
    return 'online'
  } catch {
    return 'offline'
  } finally {
    clearTimeout(timer)
  }
}

export interface CalculatorStatusTarget {
  id: string
  url: string
}

export async function checkCalculatorsStatus(
  targets: CalculatorStatusTarget[],
): Promise<Record<string, CalcOnlineStatus>> {
  const entries = await Promise.all(
    targets.map(async (t) => [t.id, await pingUrl(t.url)] as const),
  )
  return Object.fromEntries(entries)
}
