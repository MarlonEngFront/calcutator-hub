import type { Metadata } from 'next'
import { ReactNode } from 'react'
import './globals.css'
import AppShell from '@/app/components/AppShell'

export const metadata: Metadata = {
  title: 'Voiston Calculator Hub',
  description: '6 calculadoras de LIO em um só lugar',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-gray-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
