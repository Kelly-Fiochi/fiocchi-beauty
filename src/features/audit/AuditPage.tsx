import { useEffect, useState } from 'react'
import { ClipboardList, Filter, Search } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { relatedName } from '../../lib/relations'
import { formatDate } from '../../lib/utils'

type AuditRecord = { id: string; user: string; action: string; entity: string; description: string; date: string }
const actionLabels: Record<string, string> = { CREATE: 'Criação', UPDATE: 'Alteração', DELETE: 'Exclusão', LOGIN: 'Login' }
const actionStyles: Record<string, string> = { CREATE: 'bg-emerald-100 text-emerald-700', UPDATE: 'bg-sky-100 text-sky-700', DELETE: 'bg-red-100 text-red-700', LOGIN: 'bg-slate-200 text-slate-700' }

export function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.from('audit_logs').select('id, action, entity, entity_id, created_at, user:profiles(full_name)').order('created_at', { ascending: false }).limit(50).then(({ data, error: queryError }) => {
      if (queryError) setError(queryError.message)
      else setRecords((data ?? []).map((record) => ({ id: record.id, user: relatedName(record.user, 'Sistema'), action: record.action, entity: record.entity, description: `${actionLabels[record.action] ?? record.action} ${record.entity}`, date: record.created_at })))
    })
  }, [])
  return <div className="space-y-6"><header><p className="text-sm uppercase tracking-[0.25em] text-brand-600">Governança</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Auditoria</h1><p className="mt-2 text-sm text-slate-500">Histórico de ações realizadas no sistema.</p></header><Card><CardHeader className="pb-3"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle className="flex items-center gap-2"><ClipboardList size={18} />Registro de atividades</CardTitle><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input aria-label="Buscar auditoria" placeholder="Buscar atividade" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 sm:w-56" /></div><Button variant="outline" size="sm"><Filter size={15} />Filtros</Button></div></div></CardHeader><CardContent className="space-y-3">{error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar a auditoria: {error}</p> : null}{!error && records.length === 0 ? <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p> : null}{records.map((record) => <div key={record.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_0.8fr_0.8fr_1.8fr_0.9fr] md:items-center"><div><p className="font-semibold text-slate-900">{record.description}</p><p className="text-sm text-slate-500">{record.user}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${actionStyles[record.action] ?? 'bg-slate-200 text-slate-700'}`}>{actionLabels[record.action] ?? record.action}</span><p className="text-sm text-slate-600">{record.entity}</p><p className="text-sm text-slate-600">ID da atividade: {record.id}</p><p className="text-sm text-slate-500 md:text-right">{formatDate(record.date)}</p></div>)}</CardContent></Card></div>
}
