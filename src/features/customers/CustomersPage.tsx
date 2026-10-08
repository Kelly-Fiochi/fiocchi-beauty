import { useEffect, useMemo, useState } from 'react'
import { Mail, Pencil, Plus, Search, Star, Trash2, UserRound, UsersRound } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'

type Customer = { id: string; name: string; contact: string; phone: string; purchases: number; total: number; lastPurchase: string }

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [remotePageCount, setRemotePageCount] = useState(1)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const pageSize = 5

  useEffect(() => {
    if (!isSupabaseConfigured) return
    void (async () => {
      try {
        const { data, count, error: queryError } = await supabase.from('customers').select('id, name, email, phone, created_at', { count: 'exact' }).eq('active', true).is('deleted_at', null).or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`).order('name').range((page - 1) * pageSize, page * pageSize - 1)
        if (queryError) setError(queryError.message)
        else { setCustomers((data ?? []).map((customer) => ({ id: customer.id, name: customer.name, contact: customer.email ?? 'Sem e-mail', phone: customer.phone ?? 'Sem telefone', purchases: 0, total: 0, lastPurchase: new Date(customer.created_at).toLocaleDateString('pt-BR') }))); setRemotePageCount(Math.max(1, Math.ceil((count ?? 0) / pageSize))) }
      } catch (queryError) {
        setError(queryError instanceof Error ? queryError.message : 'Não foi possível carregar os clientes.')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [page, search])

  const filteredCustomers = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.contact} ${customer.phone}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())), [customers, search])
  const pageCount = isSupabaseConfigured ? remotePageCount : Math.max(1, Math.ceil(filteredCustomers.length / pageSize))
  const visibleCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize)
  const totalSpent = customers.reduce((sum, customer) => sum + customer.total, 0)

  function openNew() { setEditing(null); setForm({ name: '', email: '', phone: '' }); setIsFormOpen(true) }
  function openEdit(customer: Customer) { setEditing(customer); setForm({ name: customer.name, email: customer.contact, phone: customer.phone }); setIsFormOpen(true) }
  async function saveCustomer(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) return
    if (isSupabaseConfigured) {
      const query = editing ? supabase.from('customers').update({ name: form.name, email: form.email, phone: form.phone, updated_at: new Date().toISOString() }).eq('id', editing.id) : supabase.from('customers').insert({ name: form.name, email: form.email, phone: form.phone }).select('id').single()
      const { data, error: saveError } = await query
      if (saveError) { setError(saveError.message); return }
      const id = editing?.id ?? (data as { id: string }).id
      setCustomers((current) => editing ? current.map((customer) => customer.id === id ? { ...customer, name: form.name, contact: form.email, phone: form.phone } : customer) : [...current, { id, name: form.name, contact: form.email, phone: form.phone, purchases: 0, total: 0, lastPurchase: new Date().toLocaleDateString('pt-BR') }])
    } else {
      setError('Configure o Supabase para cadastrar clientes.')
      return
    }
    setEditing(null)
    setIsFormOpen(false)
  }
  async function removeCustomer(customer: Customer) {
    if (!window.confirm(`Excluir o cliente ${customer.name}? Essa ação será registrada como exclusão lógica.`)) return
    if (isSupabaseConfigured) { const { error: deleteError } = await supabase.from('customers').update({ deleted_at: new Date().toISOString(), active: false }).eq('id', customer.id); if (deleteError) { setError(deleteError.message); return } }
    setCustomers((current) => current.filter((item) => item.id !== customer.id))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><p className="text-sm uppercase tracking-[0.25em] text-brand-600">Relacionamento</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Clientes</h1></div>
        <Button className="w-full md:w-auto" onClick={openNew}><Plus size={16} />Novo cliente</Button>
      </header>

      {isFormOpen ? <Card><CardHeader><CardTitle>{editing ? 'Editar cliente' : 'Novo cliente'}</CardTitle></CardHeader><CardContent><form onSubmit={saveCustomer} className="grid gap-3 md:grid-cols-3"><input aria-label="Nome do cliente" placeholder="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" required /><input aria-label="E-mail do cliente" placeholder="E-mail" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /><input aria-label="Telefone do cliente" placeholder="Telefone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /><Button type="submit">Salvar</Button><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button></form></CardContent></Card> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Clientes ativos</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><p className="text-2xl font-bold text-slate-900">{customers.length}</p><UsersRound className="text-brand-600" size={18} /></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Clientes recorrentes</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><p className="text-2xl font-bold text-slate-900">{customers.filter((customer) => customer.purchases > 1).length}</p><Star className="text-amber-500" size={18} /></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Valor comprado</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle>Base de clientes</CardTitle><div className="relative w-full md:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input aria-label="Buscar cliente" placeholder="Buscar por nome ou contato" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500" /></div></div></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-slate-500">Carregando clientes...</p> : null}
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {visibleCustomers.map((customer) => (
            <div key={customer.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.4fr_1.1fr_0.7fr_0.9fr_0.8fr] md:items-center">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700"><UserRound size={18} /></div><div><p className="font-semibold text-slate-900">{customer.name}</p><p className="text-sm text-slate-500">{customer.phone}</p></div></div>
              <div className="flex items-center gap-2 text-sm text-slate-600"><Mail size={15} className="text-slate-400" />{customer.contact}</div>
              <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Compras</p><p className="mt-1 font-medium text-slate-900">{customer.purchases}</p></div>
              <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</p><p className="mt-1 font-medium text-slate-900">{formatCurrency(customer.total)}</p></div>
              <div className="flex items-center justify-between gap-2 md:justify-end"><span className="text-xs text-slate-500">{customer.lastPurchase}</span><Button size="sm" variant="outline" onClick={() => openEdit(customer)}><Pencil size={14} />Editar</Button><Button size="sm" variant="ghost" aria-label={`Excluir ${customer.name}`} onClick={() => void removeCustomer(customer)}><Trash2 size={14} /></Button></div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm text-slate-500">Página {page} de {pageCount}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Próxima</Button></div></div>
        </CardContent>
      </Card>
    </div>
  )
}
