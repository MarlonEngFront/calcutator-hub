'use client'

import { useEffect, useState } from 'react'
import { getExamFile } from './exam-file-store'

export type ExamPreviewStatus = 'live' | 'checking' | 'restored' | 'unavailable'

/**
 * Resolve a URL de preview do exame original em 3 camadas:
 *  1. 'live'   — fileDataUrl (blob: da sessão de upload atual) já disponível.
 *  2. 'restored' — blob: reconstruído a partir do File salvo em IndexedDB
 *     (sobrevive a reload/nova aba, ao contrário do blob original).
 *  3. 'unavailable' — nem um nem outro; caller deve cair pro fallback só-dados.
 */
export function useExamPreviewUrl(fileDataUrl: string | null): { url: string | null; status: ExamPreviewStatus } {
  const [restoredUrl, setRestoredUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<ExamPreviewStatus>(fileDataUrl ? 'live' : 'checking')

  useEffect(() => {
    if (fileDataUrl) {
      setStatus('live')
      return
    }
    let cancelled = false
    setStatus('checking')
    getExamFile().then((file) => {
      if (cancelled) return
      if (file) {
        setRestoredUrl(URL.createObjectURL(file))
        setStatus('restored')
      } else {
        setStatus('unavailable')
      }
    })
    return () => { cancelled = true }
  }, [fileDataUrl])

  // Libera o blob reconstruído quando trocar de exame ou desmontar
  useEffect(() => {
    return () => { if (restoredUrl) URL.revokeObjectURL(restoredUrl) }
  }, [restoredUrl])

  return { url: fileDataUrl ?? restoredUrl, status }
}
