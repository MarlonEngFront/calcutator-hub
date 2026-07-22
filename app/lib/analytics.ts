/**
 * Firebase Analytics — Voiston Calculator Hub
 *
 * Lazy singleton: initialized on first logHubEvent call (client-side only).
 * isSupported() guard covers browsers that block analytics (cookie consent, incognito).
 */
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics'
import type { Analytics } from 'firebase/analytics'
import { getFirebaseApp } from './firebase-client'

let analyticsPromise: Promise<Analytics | null> | null = null

function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => {
        if (!supported) return null
        return getAnalytics(getFirebaseApp())
      })
      .catch(() => null)
  }
  return analyticsPromise
}

// ── Typed event catalogue ─────────────────────────────────────────────────────

export type HubEventName =
  | 'hub_pagina_vista'          // pageview por pathname
  | 'hub_demo_usado'            // clicou "Usar demo"
  | 'hub_upload_iniciado'       // selecionou arquivo (pdf | imagem)
  | 'hub_parse_concluido'       // OCR + parse OK
  | 'hub_parse_erro'            // OCR/parse falhou
  | 'hub_calculo_iniciado'      // clicou Calcular (pós preflight OK)
  | 'hub_calculo_resultado'     // resultados recebidos do gateway
  | 'hub_validacao_preflight_erro' // campos fora de range bloquearam calculo

export type HubEventParams = Record<string, string | number | boolean>

/**
 * Fire a typed hub event. Fire-and-forget — never throws.
 */
export async function logHubEvent(
  eventName: HubEventName,
  params?: HubEventParams,
): Promise<void> {
  try {
    const analytics = await getAnalyticsInstance()
    if (!analytics) return
    logEvent(analytics, eventName, params)
  } catch {
    // Analytics must never crash the app
  }
}
