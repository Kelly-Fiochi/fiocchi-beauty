import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ClipboardList, Package, Plus, Search, TriangleAlert } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { relatedName } from '../../lib/relations'
import { formatDate } from '../../lib/utils'

type Movement = {
  id: string
  product: string
  type: 'ENTRADA_COMPRA' | 'SAIDA_VENDA' | 'SAIDA_PERDA'
  quantity: number
  date: string
  reference: string
  user: string
}

type InventoryItem = { id: string; name: string; sku: string; stock: number; minimum: number; reserved: number }

const movementLabels = {
  ENTRADA_COMPRA: 'Entrada de compra',
  SAIDA_VENDA: 'Saída de venda',
  SAIDA_PERDA: 'Perda',
} as const

function stockStatus(stock: number, minimum: number) {
  if (stock === 0) return { label: 'Sem estoque', className: 'bg-red-100 text-red-700' }
  if (stock < minimum) return { label: 'Estoque baixo', className: 'bg-amber-100 text-amber-700' }
  return { label: 'Normal', className: 'bg-emerald-100 text-emerald-700' }
}

export function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [remotePageCount, setRemotePageCount] = useState(1)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState({ stock: '', minimum: '', reserved: '' })
  const pageSize = 5

  useEffect(() => {
    if (!isSupabaseConfigured) return
    void (async () => {
      try {
        const [productsResult, movementsResult] = await Promise.all([
          supabase.from('products').select('id, name, sku, stock, min_stock, reserved_stock', { count: 'exact' }).eq('active', true).is('deleted_at', null).or(`name.ilike.%${search}%,sku.ilike.%${search}%`).order('name').range((page - 1) * pageSize, page * pageSize - 1),
          supabase.from('stock_movements').select('id, quantity, type, movement_date, reference, reason, product:products(name), user:profiles(full_name)').order('movement_date', { ascending: false }).limit(20),
        ])
        if (productsResult.error) throw new Error(productsResult.error.message)
        if (movementsResult.error) throw new Error(movementsResult.error.message)
        setInventory((productsResult.data ?? []).map((item) => ({ id: item.id, name: item.name, sku: item.sku, stock: item.stock, minimum: item.min_stock, reserved: item.reserved_stock }))); setRemotePageCount(Math.max(1, Math.ceil((productsResult.count ?? 0) / pageSize)))
        setMovements((movementsResult.data ?? []).map((item) => ({ id: item.id, product: relatedName(item.product, 'Produto'), type: item.type, quantity: item.quantity, date: item.movement_date, reference: item.reference ?? item.reason ?? '-', user: relatedName(item.user, 'Sistema') })))
      } catch (queryError) { setError(queryError instanceof Error ? queryError.message : 'Não foi possível carregar o estoque.') } finally { setIsLoading(false) }
    })()
  }, [page, search])

  const filteredInventory = useMemo(() => inventory.filter((item) => `${item.name} ${item.sku}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())), [inventory, search])
  const pageCount = isSupabaseConfigured ? remotePageCount : Math.max(1, Math.ceil(filteredInventory.length / pageSize))
  const visibleInventory = filteredInventory.slice((page - 1) * pageSize, page * pageSize)
  const lowStockCount = inventory.filter((item) => item.stock < item.minimum).length
  const totalUnits = inventory.reduce((total, item) => total + item.stock, 0)
  const reservedUnits = inventory.reduce((total, item) => total + item.reserved, 0)

  function openInventoryForm(item: InventoryItem) { setEditing(item); setForm({ stock: String(item.stock), minimum: String(item.minimum), reserved: String(item.reserved) }); setIsFormOpen(true) }
  async function saveInventory(event: FormEvent) {
    event.preventDefault()
    const stock = Number(form.stock); const minimum = Number(form.minimum); const reserved = Number(form.reserved)
    if (stock < 0 || minimum < 0 || reserved < 0 || !editing) return
    if (isSupabaseConfigured) { const { error: saveError } = await supabase.from('products').update({ stock, min_stock: minimum, reserved_stock: reserved, updated_at: new Date().toISOString() }).eq('id', editing.id); if (saveError) { setError(saveError.message); return } }
    setInventory((current) => current.map((item) => item.id === editing.id ? { ...item, stock, minimum, reserved } : item)); setIsFormOpen(false)
  }
  async function removeInventory(item: InventoryItem) {
    if (!window.confirm(`Excluir o produto ${item.name} do estoque? Essa ação será lógica.`)) return
    if (isSupabaseConfigured) { const { error: deleteError } = await supabase.from('products').update({ active: false, deleted_at: new Date().toISOString() }).eq('id', item.id); if (deleteError) { setError(deleteError.message); return } }
    setInventory((current) => current.filter((entry) => entry.id !== item.id))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-brand-600">Operação</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Controle de estoque</h1>
        </div>
        <Button className="w-full md:w-auto" onClick={() => inventory[0] && openInventoryForm(inventory[0])}>
          <Plus size={16} />
          Registrar movimentação
        </Button>
      </header>
      {isFormOpen && editing ? <Card><CardHeader><CardTitle>Ajustar estoque</CardTitle></CardHeader><CardContent><form onSubmit={saveInventory} className="grid gap-3 md:grid-cols-4"><input aria-label="Estoque atual" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" required /><input aria-label="Estoque mínimo" type="number" value={form.minimum} onChange={(event) => setForm({ ...form, minimum: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" required /><input aria-label="Estoque reservado" type="number" value={form.reserved} onChange={(event) => setForm({ ...form, reserved: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" required /><Button type="submit">Salvar</Button><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button></form></CardContent></Card> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Unidades disponíveis</CardTitle></CardHeader>
          <CardContent><div className="flex items-center justify-between"><span className="text-2xl font-bold text-slate-900">{totalUnits}</span><Package className="text-brand-600" size={18} /></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Reservadas</CardTitle></CardHeader>
          <CardContent><div className="flex items-center justify-between"><span className="text-2xl font-bold text-slate-900">{reservedUnits}</span><ClipboardList className="text-slate-500" size={18} /></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Itens para reposição</CardTitle></CardHeader>
          <CardContent><div className="flex items-center justify-between"><span className="text-2xl font-bold text-slate-900">{lowStockCount}</span><TriangleAlert className="text-amber-500" size={18} /></div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Posição atual</CardTitle>
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input aria-label="Buscar item em estoque" placeholder="Buscar item ou SKU" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-slate-500">Carregando estoque...</p> : null}
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {!isLoading && !error && visibleInventory.length === 0 ? <p className="text-sm text-slate-500">Nenhum produto cadastrado no estoque.</p> : null}
          {visibleInventory.map((item) => {
            const status = stockStatus(item.stock, item.minimum)
            return (
              <div key={item.sku} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.5fr_0.8fr_0.8fr_1fr] md:items-center">
                <div><p className="font-semibold text-slate-900">{item.name}</p><p className="text-sm text-slate-500">{item.sku}</p></div>
                <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Disponível</p><p className="mt-1 font-medium text-slate-900">{item.stock - item.reserved} un</p></div>
                <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mínimo</p><p className="mt-1 font-medium text-slate-900">{item.minimum} un</p></div>
                <div className="flex items-center justify-between md:justify-end"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span><Button variant="outline" size="sm" className="ml-2" onClick={() => openInventoryForm(item)}>Ajustar</Button><Button variant="ghost" size="sm" aria-label={`Excluir ${item.name}`} onClick={() => void removeInventory(item)}>Excluir</Button></div>
              </div>
            )
          })}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm text-slate-500">Página {page} de {pageCount}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Próxima</Button></div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Últimas movimentações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!isLoading && !error && movements.length === 0 ? <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p> : null}
          {movements.map((movement) => {
            const isEntry = movement.quantity > 0
            return (
              <div key={movement.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3"><div className={`mt-0.5 rounded-lg p-2 ${isEntry ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{isEntry ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}</div><div><p className="font-semibold text-slate-900">{movement.product}</p><p className="text-sm text-slate-500">{movementLabels[movement.type]} · {movement.reference}</p></div></div>
                <div className="text-left sm:text-right"><p className={`font-semibold ${isEntry ? 'text-emerald-700' : 'text-red-700'}`}>{isEntry ? '+' : ''}{movement.quantity} un</p><p className="text-sm text-slate-500">{formatDate(movement.date)} · {movement.user}</p></div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
