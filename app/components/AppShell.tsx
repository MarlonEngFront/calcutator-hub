'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/useAuth'

const STEPS = [
  { label: 'Upload',    path: '/',              description: 'Envie o exame' },
  { label: 'Validar',   path: '/validate',      description: 'Confirme os dados' },
  { label: 'Lentes',    path: '/selecaolentes', description: 'Selecione a lente' },
  { label: 'Calcular',  path: '/calculators',   description: 'Selecione a calculadora' },
  { label: 'Resultados',path: '/results',       description: 'Veja o LIO ideal' },
]

function getStepIndex(pathname: string) {
  if (pathname.startsWith('/results'))        return 4
  if (pathname.startsWith('/calculators'))    return 3
  if (pathname.startsWith('/selecaolentes')) return 2
  if (pathname.startsWith('/validate'))       return 1
  return 0
}

function UserMenu() {
  const { user, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!user) return null

  const name = profile?.displayName || user.displayName || user.email || 'Usuário'
  const photo = profile?.photoURL || user.photoURL
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-slate-100 transition-colors"
        aria-label="Menu do usuário"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar externo do Google, sem next/image
          <img
            src={photo}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
            {initials}
          </span>
        )}
        <span className="hidden md:inline text-sm font-medium text-gray-700 max-w-[140px] truncate">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
            {user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
          </div>
          <button
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const currentStep = getStepIndex(pathname)
  const { profile } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow">
                V
              </div>
              <div>
                <span className="font-bold text-gray-900 text-lg leading-none">Voiston</span>
                <span className="block text-xs text-blue-600 font-medium leading-none mt-0.5">Calculator Hub</span>
              </div>
            </Link>

            {/* Badge */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                6 calculadoras disponíveis
              </span>
              {profile?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  Admin
                </Link>
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps (escondido fora do fluxo das calculadoras, ex.: /admin) */}
      {!pathname.startsWith('/admin') && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between max-w-2xl">
              {STEPS.map((step, index) => {
                const isActive = index === currentStep
                const isDone = index < currentStep
                const isLast = index === STEPS.length - 1

                return (
                  <div key={step.path} className="flex items-center flex-1">
                    <div className="flex items-center gap-2.5">
                      {/* Circle */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          isDone
                            ? 'bg-blue-600 text-white'
                            : isActive
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isDone ? '✓' : index + 1}
                      </div>
                      {/* Label */}
                      <div className="hidden sm:block">
                        <div className={`text-sm font-semibold ${isActive ? 'text-blue-600' : isDone ? 'text-gray-700' : 'text-gray-400'}`}>
                          {step.label}
                        </div>
                        <div className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                          {step.description}
                        </div>
                      </div>
                    </div>
                    {/* Connector */}
                    {!isLast && (
                      <div className={`flex-1 h-0.5 mx-3 rounded ${index < currentStep ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={
          pathname.startsWith('/validate')
            ? 'flex-1 w-full max-w-[1800px] mx-auto px-4 sm:px-6 py-8'
            : 'flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8'
        }
      >
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <span>Voiston Calculator Hub — Ferramenta de apoio para cálculo de LIO</span>
            <span className="text-orange-600 font-medium">⚠️ Uso exclusivo por profissionais de saúde habilitados</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
