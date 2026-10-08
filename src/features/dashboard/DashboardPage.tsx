import { Activity, AlertTriangle, ArrowUpRight, BadgeDollarSign, PackageCheck } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'

type DashboardData = {
  revenue: number
  expenses: number
  inventoryValue: number
  activeProducts: number
  lowStock: number
  pendingSales: number
  history: { month: string; revenue: number }[]
}

const emptyDashboard: DashboardData = { revenue: 0, expenses: 0, inventoryValue: 0, activeProducts: 0, lowStock: 0, pendingSales: 0, history: [] }

async function loadDashboard(): Promise<DashboardData> {
  if (!isSupabaseConfigured) return emptyDashboard
  const [{ data: sales, error: salesError }, { data: products, error: productsError }, { data: transactions, error: transactionsError }] = await Promise.all([
    supabase.from('sales').select('sale_date, total, status').is('deleted_at', null),
    supabase.from('products').select('stock, min_stock, cost').eq('active', true).is('deleted_at', null),
    supabase.from('financial_transactions').select('amount, type').is('deleted_at', null),
  ])
  if (salesError) throw new Error(salesError.message)
  if (productsError) throw new Error(productsError.message)
  if (transactionsError) throw new Error(transactionsError.message)
  const revenue = (sales ?? []).reduce((sum, sale) => sum + Number(sale.total), 0)
  const expenses = (transactions ?? []).filter((transaction) => transaction.type === 'DESPESA').reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  const pendingSales = (sales ?? []).filter((sale) => sale.status === 'PENDING').length
  const historyMap = new Map<string, number>()
  for (const sale of sales ?? []) {
    const month = new Date(sale.sale_date).toLocaleDateString('pt-BR', { month: 'short' })
    historyMap.set(month, (historyMap.get(month) ?? 0) + Number(sale.total))
  }
  return {
    revenue,
    expenses,
    inventoryValue: (products ?? []).reduce((sum, product) => sum + Number(product.stock) * Number(product.cost), 0),
    activeProducts: products?.length ?? 0,
    lowStock: (products ?? []).filter((product) => product.stock <= product.min_stock).length,
    pendingSales,
    history: [...historyMap].map(([month, value]) => ({ month, revenue: value })),
  }
}

export function DashboardPage() {
  const [data, setData] = useState(emptyDashboard)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard().then(setData).catch((loadError: Error) => setError(loadError.message))
  }, [])

  const alerts = [
    data.lowStock ? `${data.lowStock} produto(s) com estoque baixo` : '',
    data.pendingSales ? `${data.pendingSales} venda(s) pendente(s)` : '',
  ].filter(Boolean)
  const margin = data.revenue ? ((data.revenue - data.expenses) / data.revenue) * 100 : 0

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm uppercase tracking-[0.25em] text-brand-600">Fiocchi Beauty</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Dashboard</h1></div><Button>Exportar relatório</Button></header>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar o dashboard: {error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[['Faturamento', formatCurrency(data.revenue)], ['Lucro bruto', formatCurrency(data.revenue - data.expenses)], ['Margem', `${margin.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`], ['Valor do estoque', formatCurrency(data.inventoryValue)]].map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">{label}</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold text-slate-900">{value}</span></CardContent></Card>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity size={18} />Faturamento por período</CardTitle></CardHeader><CardContent><div className="h-64 w-full">{data.history.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data.history} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Faturamento']} /><Line type="monotone" dataKey="revenue" stroke="#e11d48" strokeWidth={3} dot={{ r: 4, fill: '#e11d48', strokeWidth: 0 }} /></LineChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center text-sm text-slate-500">Nenhum dado disponível.</p>}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle size={18} />Alertas</CardTitle></CardHeader><CardContent className="space-y-3">{alerts.length ? alerts.map((alert) => <div key={alert} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{alert}</div>) : <p className="text-sm text-slate-500">Nenhum alerta.</p>}</CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3"><Card><CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck size={18} />Produtos ativos</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-slate-900">{data.activeProducts}</p></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><BadgeDollarSign size={18} />Receita líquida</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-slate-900">{formatCurrency(data.revenue - data.expenses)}</p></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpRight size={18} />Fluxo de caixa</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-slate-900">{formatCurrency(data.revenue - data.expenses)}</p></CardContent></Card></div>
    </div>
  )
}
