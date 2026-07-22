'use client'

export default function LoginGate({
  onSignIn,
  error,
}: {
  onSignIn: () => void
  error: string | null
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow mx-auto mb-4">
          V
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Voiston Calculator Hub</h1>
        <p className="text-sm text-gray-500 mb-6">Entre com sua conta Google para acessar</p>
        <button
          onClick={onSignIn}
          className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          Entrar com Google
        </button>
        <p className="text-xs text-gray-400 mt-4">
          Contas <strong>@voiston.com</strong> têm acesso automático. Contas externas passam por
          aprovação do administrador.
        </p>
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  )
}
