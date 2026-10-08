import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDownRight, ArrowUpRight, CalendarDays, Plus, Search, WalletCards } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { relatedName } from '../../lib/relations'
import { formatCurrency, formatDate } from '../../lib/utils'

type Transaction = { id: string; description: string; category: string; date: string; amount: number; type: 'RECEITA' | 'DESPESA' }

export function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [remotePageCount, setRemotePageCount] = useState(1)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', type: 'DESPESA' as 'RECEITA' | 'DESPESA' })
  const pageSize = 5

  useEffect(() => {
    if (!isSupabaseConfigured) return
    void (async () => {
      try {
        const { data, count, error: queryError } = await supabase.from('financial_transactions').select('id, description, amount, type, transaction_date, category:financial_categories(name)', { count: 'exact' }).is('deleted_at', null).or(`description.ilike.%${search}%`).order('transaction_date', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
        if (queryError) throw new Error(queryError.message)
        setTransactions((data ?? []).map((item) => ({ id: item.id, description: item.description, category: relatedName(item.category, 'Sem categoria'), date: item.transaction_date, amount: item.amount, type: item.type }))); setRemotePageCount(Math.max(1, Math.ceil((count ?? 0) / pageSize)))
      } catch (queryError) { setError(queryError instanceof Error ? queryError.message : 'Não foi possível carregar o financeiro.') } finally { setIsLoading(false) }
    })()
  }, [page, search])

  const filteredTransactions = useMemo(() => transactions.filter((item) => `${item.description} ${item.category}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())), [transactions, search])
  const pageCount = isSupabaseConfigured ? remotePageCount : Math.max(1, Math.ceil(filteredTransactions.length / pageSize))
  const visibleTransactions = filteredTransactions.slice((page - 1) * pageSize, page * pageSize)
  const revenue = transactions.filter((item) => item.type === 'RECEITA').reduce((sum, item) => sum + item.amount, 0)
  const expenses = transactions.filter((item) => item.type === 'DESPESA').reduce((sum, item) => sum + item.amount, 0)

  function openFinanceForm(transaction?: Transaction) { setEditing(transaction ?? null); setForm({ description: transaction?.description ?? '', amount: String(transaction?.amount ?? ''), type: transaction?.type ?? 'DESPESA' }); setIsFormOpen(true) }
  async function saveFinance(event: FormEvent) {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.description.trim() || !amount) return
    if (isSupabaseConfigured) {
      const query = editing
        ? supabase.from('financial_transactions').update({ description: form.description, amount, type: form.type, updated_at: new Date().toISOString() }).eq('id', editing.id)
        : supabase.from('financial_transactions').insert({ description: form.description, amount, type: form.type }).select('id, transaction_date').single()
      const { data, error: saveError } = await query
      if (saveError) { setError(saveError.message); return }
      const id = editing?.id ?? (data as { id: string }).id
      setTransactions((current) => editing ? current.map((item) => item.id === id ? { ...item, description: form.description, amount, type: form.type } : item) : [...current, { id, description: form.description, category: 'Outros', date: (data as { transaction_date: string }).transaction_date, amount, type: form.type }])
    } else {
      setError('Configure o Supabase para registrar movimentações financeiras.')
      return
    }
    setIsFormOpen(false)
  }
  async function removeFinance(transaction: Transaction) {
    if (!window.confirm(`Excluir a movimentação ${transaction.description}?`)) return
    if (isSupabaseConfigured) { const { error: deleteError } = await supabase.from('financial_transactions').update({ deleted_at: new Date().toISOString() }).eq('id', transaction.id); if (deleteError) { setError(deleteError.message); return } }
    setTransactions((current) => current.filter((item) => item.id !== transaction.id))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><p className="text-sm uppercase tracking-[0.25em] text-brand-600">Gestão</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Financeiro</h1></div>
        <Button className="w-full md:w-auto" onClick={() => openFinanceForm()}><Plus size={16} />Nova movimentação</Button>
      </header>
      {isFormOpen ? <Card><CardHeader><CardTitle>{editing ? 'Editar movimentação' : 'Nova movimentação'}</CardTitle></CardHeader><CardContent><form onSubmit={saveFinance} className="grid gap-3 md:grid-cols-4"><input aria-label="Descrição financeira" placeholder="Descrição" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" required /><input aria-label="Valor financeiro" type="number" step="0.01" placeholder="Valor" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" required /><select aria-label="Tipo financeiro" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as 'RECEITA' | 'DESPESA' })} className="rounded-lg border border-slate-200 px-3 py-2"><option value="RECEITA">Receita</option><option value="DESPESA">Despesa</option></select><Button type="submit">Salvar</Button><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button></form></CardContent></Card> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Receitas</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><p className="text-2xl font-bold text-emerald-700">{formatCurrency(revenue)}</p><ArrowUpRight className="text-emerald-600" size={18} /></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Despesas</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><p className="text-2xl font-bold text-red-700">{formatCurrency(expenses)}</p><ArrowDownRight className="text-red-600" size={18} /></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Fluxo de caixa</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><p className="text-2xl font-bold text-slate-900">{formatCurrency(revenue - expenses)}</p><WalletCards className="text-brand-600" size={18} /></div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle>Movimentações financeiras</CardTitle><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input aria-label="Buscar movimentação financeira" placeholder="Buscar movimentação" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-500" /></div><Button variant="outline" size="sm"><CalendarDays size={15} />Este mês</Button></div></div></CardHeader>
        <CardContent className="space-y-3">{isLoading ? <p className="text-sm text-slate-500">Carregando movimentações...</p> : null}{error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}{!isLoading && !error && visibleTransactions.length === 0 ? <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p> : null}{visibleTransactions.map((transaction) => { const isRevenue = transaction.type === 'RECEITA'; return <div key={transaction.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{transaction.description}</p><p className="text-sm text-slate-500">{transaction.category} · {formatDate(transaction.date)}</p></div><div className="flex items-center gap-2"><p className={`font-semibold ${isRevenue ? 'text-emerald-700' : 'text-red-700'}`}>{isRevenue ? '+' : '-'}{formatCurrency(transaction.amount)}</p><Button size="sm" variant="outline" onClick={() => openFinanceForm(transaction)}>Editar</Button><Button size="sm" variant="ghost" aria-label={`Excluir ${transaction.description}`} onClick={() => void removeFinance(transaction)}>Excluir</Button></div></div> })}<div className="flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm text-slate-500">Página {page} de {pageCount}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Próxima</Button></div></div></CardContent>
      </Card>
    </div>
  )
}
