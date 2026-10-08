import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, Clock3, FileText, Plus, Search, Truck } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { relatedName } from '../../lib/relations'
import { formatCurrency, formatDate } from '../../lib/utils'

type Purchase = {
  id: string
  supplier: string
  date: string
  items: number
  total: number
  status: 'RECEIVED' | 'PENDING' | 'IN_TRANSIT'
}

const statusLabels = { RECEIVED: 'Recebida', IN_TRANSIT: 'Em trânsito', PENDING: 'Pendente' } as const
const statusStyles = { RECEIVED: 'bg-emerald-100 text-emerald-700', IN_TRANSIT: 'bg-sky-100 text-sky-700', PENDING: 'bg-amber-100 text-amber-700' } as const

function StatusIcon({ status }: { status: Purchase['status'] }) {
  if (status === 'RECEIVED') return <CheckCircle2 size={16} />
  if (status === 'IN_TRANSIT') return <Truck size={16} />
  return <Clock3 size={16} />
}

export function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [remotePageCount, setRemotePageCount] = useState(1)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Purchase | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState({ total: '', status: 'PENDING' as Purchase['status'] })
  const pageSize = 5

  useEffect(() => {
    if (!isSupabaseConfigured) return
    void (async () => {
      try {
        const { data, count, error: queryError } = await supabase.from('purchases').select('id, purchase_date, total, status, supplier:suppliers(name), purchase_items(quantity)', { count: 'exact' }).is('deleted_at', null).or(`id.ilike.%${search}%`).order('purchase_date', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
        if (queryError) throw new Error(queryError.message)
        setPurchases((data ?? []).map((purchase) => ({ id: purchase.id, supplier: relatedName(purchase.supplier, 'Fornecedor não informado'), date: purchase.purchase_date, items: purchase.purchase_items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) ?? 0, total: purchase.total, status: purchase.status === 'RECEIVED' ? 'RECEIVED' : purchase.status === 'IN_TRANSIT' ? 'IN_TRANSIT' : 'PENDING' }))); setRemotePageCount(Math.max(1, Math.ceil((count ?? 0) / pageSize)))
      } catch (queryError) { setError(queryError instanceof Error ? queryError.message : 'Não foi possível carregar as compras.') } finally { setIsLoading(false) }
    })()
  }, [page, search])

  const filteredPurchases = useMemo(() => purchases.filter((purchase) => `${purchase.id} ${purchase.supplier}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())), [purchases, search])
  const pageCount = isSupabaseConfigured ? remotePageCount : Math.max(1, Math.ceil(filteredPurchases.length / pageSize))
  const visiblePurchases = filteredPurchases.slice((page - 1) * pageSize, page * pageSize)
  const total = purchases.reduce((sum, purchase) => sum + purchase.total, 0)
  const received = purchases.filter((purchase) => purchase.status === 'RECEIVED').length
  const pending = purchases.filter((purchase) => purchase.status !== 'RECEIVED').length

  function openPurchaseForm(purchase?: Purchase) { setEditing(purchase ?? null); setForm({ total: String(purchase?.total ?? ''), status: purchase?.status ?? 'PENDING' }); setIsFormOpen(true) }
  async function savePurchase(event: FormEvent) {
    event.preventDefault()
    const total = Number(form.total)
    if (!total) return
    if (isSupabaseConfigured) {
      const query = editing
        ? supabase.from('purchases').update({ total, status: form.status, updated_at: new Date().toISOString() }).eq('id', editing.id)
        : supabase.from('purchases').insert({ total, status: form.status }).select('id, purchase_date').single()
      const { data, error: saveError } = await query
      if (saveError) { setError(saveError.message); return }
      const id = editing?.id ?? (data as { id: string }).id
      setPurchases((current) => editing ? current.map((purchase) => purchase.id === id ? { ...purchase, total, status: form.status } : purchase) : [...current, { id, supplier: 'Fornecedor não informado', date: (data as { purchase_date: string }).purchase_date, items: 0, total, status: form.status }])
    } else {
      setError('Configure o Supabase para registrar compras.')
      return
    }
    setIsFormOpen(false)
  }
  async function removePurchase(purchase: Purchase) {
    if (!window.confirm(`Excluir a compra ${purchase.id}? Ela será removida da listagem.`)) return
    if (isSupabaseConfigured) { const { error: deleteError } = await supabase.from('purchases').update({ deleted_at: new Date().toISOString(), status: 'CANCELLED' }).eq('id', purchase.id); if (deleteError) { setError(deleteError.message); return } }
    setPurchases((current) => current.filter((item) => item.id !== purchase.id))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-brand-600">Abastecimento</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Compras</h1>
        </div>
        <Button className="w-full md:w-auto" onClick={() => openPurchaseForm()}><Plus size={16} />Nova compra</Button>
      </header>
      {isFormOpen ? <Card><CardHeader><CardTitle>{editing ? 'Editar compra' : 'Nova compra'}</CardTitle></CardHeader><CardContent><form onSubmit={savePurchase} className="grid gap-3 md:grid-cols-3"><input aria-label="Total da compra" type="number" step="0.01" placeholder="Total" value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" required /><select aria-label="Status da compra" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Purchase['status'] })} className="rounded-lg border border-slate-200 px-3 py-2"><option value="PENDING">Pendente</option><option value="IN_TRANSIT">Em trânsito</option><option value="RECEIVED">Recebida</option></select><Button type="submit">Salvar</Button><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button></form></CardContent></Card> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Compras no período</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{formatCurrency(total)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Recebidas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{received}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Acompanhar</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{pending}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle>Pedidos de compra</CardTitle><div className="relative w-full md:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input aria-label="Buscar compra" placeholder="Buscar por pedido ou fornecedor" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500" /></div></div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-slate-500">Carregando compras...</p> : null}
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {!isLoading && !error && visiblePurchases.length === 0 ? <p className="text-sm text-slate-500">Nenhuma compra registrada.</p> : null}
          {visiblePurchases.map((purchase) => (
            <div key={purchase.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[0.8fr_1.4fr_0.8fr_0.7fr_1fr] md:items-center">
              <div className="flex items-center gap-2"><FileText size={17} className="text-brand-600" /><span className="font-semibold text-slate-900">{purchase.id}</span></div>
              <div><p className="font-medium text-slate-900">{purchase.supplier}</p><p className="text-sm text-slate-500">{formatDate(purchase.date)}</p></div>
              <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Itens</p><p className="mt-1 text-sm text-slate-900">{purchase.items} unidades</p></div>
              <p className="font-semibold text-slate-900">{formatCurrency(purchase.total)}</p>
              <div className="flex items-center justify-between gap-2 md:justify-end"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[purchase.status]}`}><StatusIcon status={purchase.status} />{statusLabels[purchase.status]}</span><Button variant="outline" size="sm" onClick={() => openPurchaseForm(purchase)}>Editar</Button><Button variant="ghost" size="sm" aria-label={`Excluir ${purchase.id}`} onClick={() => void removePurchase(purchase)}>Excluir</Button></div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm text-slate-500">Página {page} de {pageCount}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Próxima</Button></div></div>
        </CardContent>
      </Card>
    </div>
  )
}
