import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Barlow } from 'next/font/google'
import './globals.css'
import AppShell from '@/app/components/AppShell'
import { AnalyticsProvider } from '@/app/components/AnalyticsProvider'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-barlow',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Voiston Calculator Hub',
  description: '6 calculadoras de LIO em um só lugar',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={barlow.variable}>
      <body className="bg-slate-50 text-gray-900 antialiased">
        <AnalyticsProvider />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
