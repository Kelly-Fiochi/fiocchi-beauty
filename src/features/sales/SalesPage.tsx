import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, CircleDollarSign, Plus, Search, ShoppingBag, UserRound } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { relatedName } from '../../lib/relations'
import { formatCurrency, formatDate } from '../../lib/utils'

type Sale = {
  id: string
  customer: string
  date: string
  items: number
  total: number
  payment: string
  status: 'PAID' | 'PENDING'
}

export function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [remotePageCount, setRemotePageCount] = useState(1)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Sale | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState({ total: '', payment: '', status: 'PAID' as Sale['status'] })
  const pageSize = 5

  useEffect(() => {
    if (!isSupabaseConfigured) return
    void (async () => {
      try {
        const { data, count, error: queryError } = await supabase.from('sales').select('id, sale_date, total, payment_method, status, customer:customers(name), sale_items(quantity)', { count: 'exact' }).is('deleted_at', null).or(`id.ilike.%${search}%`).order('sale_date', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
        if (queryError) throw new Error(queryError.message)
        setSales((data ?? []).map((sale) => ({ id: sale.id, customer: relatedName(sale.customer, 'Cliente balcão'), date: sale.sale_date, items: sale.sale_items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) ?? 0, total: sale.total, payment: sale.payment_method ?? 'Não informado', status: sale.status === 'PAID' ? 'PAID' : 'PENDING' }))); setRemotePageCount(Math.max(1, Math.ceil((count ?? 0) / pageSize)))
      } catch (queryError) { setError(queryError instanceof Error ? queryError.message : 'Não foi possível carregar as vendas.') } finally { setIsLoading(false) }
    })()
  }, [page, search])

  const filteredSales = useMemo(() => sales.filter((sale) => `${sale.id} ${sale.customer} ${sale.payment}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())), [sales, search])
  const pageCount = isSupabaseConfigured ? remotePageCount : Math.max(1, Math.ceil(filteredSales.length / pageSize))
  const visibleSales = filteredSales.slice((page - 1) * pageSize, page * pageSize)
  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  const paidSales = sales.filter((sale) => sale.status === 'PAID').length
  const averageTicket = sales.length ? revenue / sales.length : 0

  function openSaleForm(sale?: Sale) { setEditing(sale ?? null); setForm({ total: String(sale?.total ?? ''), payment: sale?.payment ?? '', status: sale?.status ?? 'PAID' }); setIsFormOpen(true) }
  async function saveSale(event: FormEvent) {
    event.preventDefault()
    const total = Number(form.total)
    if (!total || !form.payment.trim()) return
    if (isSupabaseConfigured) {
      const query = editing
        ? supabase.from('sales').update({ total, payment_method: form.payment, status: form.status, updated_at: new Date().toISOString() }).eq('id', editing.id)
        : supabase.from('sales').insert({ total, payment_method: form.payment, status: form.status }).select('id, sale_date').single()
      const { data, error: saveError } = await query
      if (saveError) { setError(saveError.message); return }
      const id = editing?.id ?? (data as { id: string }).id
      setSales((current) => editing ? current.map((sale) => sale.id === id ? { ...sale, total, payment: form.payment, status: form.status } : sale) : [...current, { id, customer: 'Cliente balcão', date: (data as { sale_date: string }).sale_date, items: 0, total, payment: form.payment, status: form.status }])
    } else {
      setError('Configure o Supabase para registrar vendas.')
      return
    }
    setIsFormOpen(false)
  }
  async function removeSale(sale: Sale) {
    if (!window.confirm(`Excluir a venda ${sale.id}? Ela será cancelada e removida da listagem.`)) return
    if (isSupabaseConfigured) { const { error: deleteError } = await supabase.from('sales').update({ deleted_at: new Date().toISOString(), status: 'CANCELLED' }).eq('id', sale.id); if (deleteError) { setError(deleteError.message); return } }
    setSales((current) => current.filter((item) => item.id !== sale.id))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><p className="text-sm uppercase tracking-[0.25em] text-brand-600">Operação</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Vendas</h1></div>
        <Button className="w-full md:w-auto" onClick={() => openSaleForm()}><Plus size={16} />Registrar venda</Button>
      </header>
      {isFormOpen ? <Card><CardHeader><CardTitle>{editing ? 'Editar venda' : 'Registrar venda'}</CardTitle></CardHeader><CardContent><form onSubmit={saveSale} className="grid gap-3 md:grid-cols-3"><input aria-label="Total da venda" type="number" step="0.01" placeholder="Total" value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" required /><input aria-label="Pagamento da venda" placeholder="Forma de pagamento" value={form.payment} onChange={(event) => setForm({ ...form, payment: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" required /><select aria-label="Status da venda" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Sale['status'] })} className="rounded-lg border border-slate-200 px-3 py-2"><option value="PAID">Pago</option><option value="PENDING">Pendente</option></select><Button type="submit">Salvar</Button><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button></form></CardContent></Card> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Faturamento do período</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><p className="text-2xl font-bold text-slate-900">{formatCurrency(revenue)}</p><CircleDollarSign className="text-emerald-600" size={18} /></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Vendas pagas</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><p className="text-2xl font-bold text-slate-900">{paidSales}</p><CheckCircle2 className="text-emerald-600" size={18} /></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Ticket médio</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{formatCurrency(averageTicket)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle>Vendas recentes</CardTitle><div className="relative w-full md:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input aria-label="Buscar venda" placeholder="Buscar por venda ou cliente" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500" /></div></div></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-slate-500">Carregando vendas...</p> : null}
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {!isLoading && !error && visibleSales.length === 0 ? <p className="text-sm text-slate-500">Nenhuma venda registrada.</p> : null}
          {visibleSales.map((sale) => (
            <div key={sale.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[0.8fr_1.4fr_0.7fr_0.8fr_1fr] md:items-center">
              <div className="flex items-center gap-2"><ShoppingBag size={17} className="text-brand-600" /><span className="font-semibold text-slate-900">{sale.id}</span></div>
              <div className="flex items-center gap-2"><UserRound size={16} className="text-slate-400" /><div><p className="font-medium text-slate-900">{sale.customer}</p><p className="text-sm text-slate-500">{formatDate(sale.date)} · {sale.payment}</p></div></div>
              <p className="text-sm text-slate-600">{sale.items} itens</p><p className="font-semibold text-slate-900">{formatCurrency(sale.total)}</p>
              <div className="flex items-center justify-between gap-2 md:justify-end"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sale.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{sale.status === 'PAID' ? 'Pago' : 'Pendente'}</span><Button size="sm" variant="outline" onClick={() => openSaleForm(sale)}>Editar</Button><Button size="sm" variant="ghost" aria-label={`Excluir ${sale.id}`} onClick={() => void removeSale(sale)}>Excluir</Button></div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm text-slate-500">Página {page} de {pageCount}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Próxima</Button></div></div>
        </CardContent>
      </Card>
    </div>
  )
}
