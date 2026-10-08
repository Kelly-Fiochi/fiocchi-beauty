import { useEffect, useState } from 'react'
import { KeyRound, Plus, ShieldCheck, UserRound } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

type UserRecord = { id: string; name: string; email: string; role: 'ADMIN' | 'OPERATOR' | 'VIEWER'; status: 'Ativo' | 'Pendente' }
const roleLabels = { ADMIN: 'Administrador', OPERATOR: 'Operador', VIEWER: 'Visualizador' } as const

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.from('profiles').select('id, full_name, email, role').is('deleted_at', null).order('full_name').then(({ data, error: queryError }) => {
      if (queryError) setError(queryError.message)
      else setUsers((data ?? []).map((user) => ({ id: user.id, name: user.full_name, email: user.email, role: user.role, status: 'Ativo' })))
    })
  }, [])
  return <div className="space-y-6"><header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm uppercase tracking-[0.25em] text-brand-600">Acesso</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Usuários</h1></div><Button className="w-full md:w-auto"><Plus size={16} />Convidar usuário</Button></header><Card><CardHeader><CardTitle>Equipe e permissões</CardTitle></CardHeader><CardContent className="space-y-3">{error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar os usuários: {error}</p> : null}{!error && users.length === 0 ? <p className="text-sm text-slate-500">Nenhum usuário cadastrado.</p> : null}{users.map((user) => <div key={user.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.4fr_1.4fr_1fr_0.8fr_0.8fr] md:items-center"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700"><UserRound size={18} /></div><div><p className="font-semibold text-slate-900">{user.name}</p><p className="text-sm text-slate-500">{user.email}</p></div></div><div className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck size={16} className="text-brand-600" />{roleLabels[user.role]}</div><div className="flex items-center gap-2 text-sm text-slate-600"><KeyRound size={15} />{user.role === 'ADMIN' ? 'Acesso total' : user.role === 'OPERATOR' ? 'Operação' : 'Somente leitura'}</div><span className="w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{user.status}</span><Button variant="outline" size="sm">Editar acesso</Button></div>)}</CardContent></Card></div>
}
