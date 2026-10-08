import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Search, ShoppingCart, Sparkles, TrendingUp } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { relatedName } from '../../lib/relations'
import { formatCurrency } from '../../lib/utils'

type ProductItem = {
  id: string
  sku: string
  name: string
  category: string
  stock: number
  price: number
  cost: number
  status: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK'
}

async function loadProducts(search: string, page: number, pageSize: number) {
  if (!isSupabaseConfigured) return { products: [], count: 0 }

  const { data, count, error } = await supabase
    .from('products')
    .select('id, sku, name, stock, price, cost, min_stock, category:categories(name)', { count: 'exact' })
    .eq('active', true)
    .is('deleted_at', null)
    .or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    .order('name')
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) throw new Error(error.message)

  return { products: (data ?? []).map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: relatedName(product.category, 'Sem categoria'),
    stock: product.stock,
    price: product.price,
    cost: product.cost,
    status: product.stock === 0 ? 'OUT_OF_STOCK' : product.stock <= product.min_stock ? 'LOW_STOCK' : 'NORMAL',
  })) as ProductItem[], count: count ?? 0 }
}

const statusStyles = {
  NORMAL: 'bg-emerald-100 text-emerald-700',
  LOW_STOCK: 'bg-amber-100 text-amber-700',
  OUT_OF_STOCK: 'bg-red-100 text-red-700',
} as const

const statusLabels = {
  NORMAL: 'Em estoque',
  LOW_STOCK: 'Estoque baixo',
  OUT_OF_STOCK: 'Sem estoque',
} as const

export function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [remotePageCount, setRemotePageCount] = useState(1)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [loadError, setLoadError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ sku: '', name: '', category: '', stock: '0', cost: '', price: '', minStock: '0' })

  useEffect(() => {
    if (!isSupabaseConfigured) return

    loadProducts(search, page, 5)
      .then(({ products: loadedProducts, count }) => { setProducts(loadedProducts); setRemotePageCount(Math.max(1, Math.ceil(count / 5))) })
      .catch((error: Error) => setLoadError(error.message))
      .finally(() => setIsLoading(false))
  }, [page, search])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    if (!normalizedSearch) return products
    return products.filter((product) => `${product.name} ${product.sku} ${product.category}`.toLocaleLowerCase().includes(normalizedSearch))
  }, [products, search])
  const pageCount = isSupabaseConfigured ? remotePageCount : Math.max(1, Math.ceil(filteredProducts.length / 5))
  const visibleProducts = isSupabaseConfigured ? filteredProducts : filteredProducts.slice((page - 1) * 5, page * 5)

  const totalProducts = products.length
  const lowStock = products.filter((product) => product.status !== 'NORMAL').length
  const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.cost, 0)

  function openCreateForm() {
    setFormError('')
    setIsFormOpen(true)
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setFormError('')

    const stock = Number(form.stock)
    const cost = Number(form.cost)
    const price = Number(form.price)
    const minStock = Number(form.minStock)

    if (!form.sku.trim() || !form.name.trim() || !cost || !price) {
      setFormError('Preencha SKU, nome, custo e preço.')
      setIsSaving(false)
      return
    }

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('products').insert({
          sku: form.sku.trim(), name: form.name.trim(), cost, price, stock, min_stock: minStock, active: true,
        }).select('id, sku, name, stock, price, cost, min_stock').single()
        if (error) throw new Error(error.message)
        setProducts((current) => [...current, { id: data.id, sku: data.sku, name: data.name, category: 'Sem categoria', stock: data.stock, price: data.price, cost: data.cost, status: data.stock === 0 ? 'OUT_OF_STOCK' : data.stock <= data.min_stock ? 'LOW_STOCK' : 'NORMAL' }])
      } else {
        throw new Error('Configure o Supabase para cadastrar produtos.')
      }
      setForm({ sku: '', name: '', category: '', stock: '0', cost: '', price: '', minStock: '0' })
      setIsFormOpen(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar o produto.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-brand-600">Catálogo</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Catálogo de produtos</h1>
        </div>

        <Button className="w-full md:w-auto" onClick={openCreateForm}>
          <Plus size={16} />
          Novo produto
        </Button>
      </header>

      {isFormOpen ? (
        <Card>
          <CardHeader><CardTitle>Novo produto</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProduct} className="grid gap-4 md:grid-cols-2">
              {([['sku', 'SKU'], ['name', 'Nome do produto'], ['category', 'Categoria'], ['stock', 'Estoque inicial'], ['minStock', 'Estoque mínimo'], ['cost', 'Custo'], ['price', 'Preço']] as const).map(([field, label]) => (
                <label key={field} className="text-sm font-medium text-slate-700">
                  {label}
                  <input required={['sku', 'name', 'cost', 'price'].includes(field)} type={['stock', 'minStock', 'cost', 'price'].includes(field) ? 'number' : 'text'} step={['cost', 'price'].includes(field) ? '0.01' : undefined} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </label>
              ))}
              {formError ? <p className="md:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
              <div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar produto'}</Button><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900">{totalProducts}</span>
              <ShoppingCart className="text-brand-600" size={18} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Estoque baixo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900">{lowStock}</span>
              <TrendingUp className="text-amber-500" size={18} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Valor do estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(inventoryValue)}</span>
              <Sparkles className="text-emerald-500" size={18} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Lista de itens</CardTitle>
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar produto ou SKU"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Carregando produtos...</p> : null}
          {loadError ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Não foi possível carregar os produtos: {loadError}</p> : null}
          {!isLoading && !loadError && filteredProducts.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nenhum produto encontrado.</p> : null}
          {visibleProducts.map((product) => (
            <div
              key={product.id}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.9fr] md:items-center"
            >
              <div>
                <p className="font-semibold text-slate-900">{product.name}</p>
                <p className="text-sm text-slate-500">{product.sku} · {product.category}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estoque</p>
                <p className="mt-1 font-medium text-slate-900">{product.stock} un</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Preço</p>
                <p className="mt-1 font-medium text-slate-900">{formatCurrency(product.price)}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Custo</p>
                <p className="mt-1 font-medium text-slate-900">{formatCurrency(product.cost)}</p>
              </div>

              <div className="flex items-center justify-between gap-2 md:justify-end">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[product.status]}`}>
                  {statusLabels[product.status]}
                </span>
                <Button variant="outline" size="sm">
                  Editar
                </Button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm text-slate-500">Página {page} de {pageCount}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Próxima</Button></div></div>
        </CardContent>
      </Card>
    </div>
  )
}
