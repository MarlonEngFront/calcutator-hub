'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { logHubEvent } from '@/app/lib/analytics'

/**
 * Tracks pageviews via hub_pagina_vista whenever the pathname changes.
 * Renders nothing — drop inside any layout.
 */
export function AnalyticsProvider() {
  const pathname = usePathname()

  useEffect(() => {
    logHubEvent('hub_pagina_vista', { path: pathname })
  }, [pathname])

  return null
}
