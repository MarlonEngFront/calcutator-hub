import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import { Barlow } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import AppShell from '@/app/components/AppShell'
import { AnalyticsProvider } from '@/app/components/AnalyticsProvider'
import AuthGate from '@/app/components/AuthGate'
import PwaRegister from '@/app/components/PwaRegister'
import AdminNotifications from '@/app/components/AdminNotifications'
import { AuthProvider } from '@/app/lib/useAuth'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-barlow',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Voiston Calculator Hub',
  description: '6 calculadoras de LIO em um só lugar',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Voiston Hub',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={barlow.variable}>
      <body className="bg-slate-50 text-gray-900 antialiased">
        <AnalyticsProvider />
        <PwaRegister />
        <Toaster richColors position="top-right" />
        <AuthProvider>
          <AdminNotifications />
          <AuthGate>
            <AppShell>{children}</AppShell>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  )
}
