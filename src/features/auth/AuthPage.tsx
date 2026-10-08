import { useState } from 'react'
import { LockKeyhole, Mail, Sparkles } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { useAuth } from '../../hooks/auth-context'

export function AuthPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await signIn(email, password)
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Não foi possível entrar na plataforma.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <Card className="w-full max-w-md overflow-hidden border-slate-200 bg-white/90 shadow-soft backdrop-blur">
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-5 text-white">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Fiocchi Beauty</p>
          <h1 className="mt-2 text-2xl font-bold">Acesso ao sistema</h1>
        </div>

        <CardHeader className="pb-3">
          <CardTitle>Entrar</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              E-mail
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="w-full bg-transparent py-2.5 text-sm outline-none"
                  placeholder="nome@fiocchi.com"
                  required
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Senha
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                <LockKeyhole className="h-4 w-4 text-slate-400" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="w-full bg-transparent py-2.5 text-sm outline-none"
                  placeholder="Sua senha"
                  required
                />
              </div>
            </label>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>

            <p className="text-center text-xs text-slate-500">Acesso protegido pelo Supabase Auth</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
