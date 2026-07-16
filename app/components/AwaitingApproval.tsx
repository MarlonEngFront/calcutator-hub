'use client'

export default function AwaitingApproval({
  email,
  onSignOut,
}: {
  email: string | null
  onSignOut: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="text-3xl mb-3">⏳</div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Conta criada!</h1>
        <p className="text-sm text-gray-500 mb-6">
          {email && (
            <>
              <strong className="text-gray-700">{email}</strong>
              <br />
            </>
          )}
          Seu acesso está aguardando aprovação do administrador. Você será liberado assim que
          suas permissões forem configuradas.
        </p>
        <button
          onClick={onSignOut}
          className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
