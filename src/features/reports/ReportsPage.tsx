import { BarChart3, Download, FileBarChart, TrendingUp } from 'lucide-react'

import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'

type ReportData = { revenue: number; soldItems: number; grossMargin: number; topProduct: string }
const emptyReport: ReportData = { revenue: 0, soldItems: 0, grossMargin: 0, topProduct: '' }

async function loadReport(): Promise<ReportData> {
  if (!isSupabaseConfigured) return emptyReport
  const [{ data: sales, error: salesError }] = await Promise.all([
    supabase.from('sales').select('total, sale_items(quantity, product:products(name, cost))').is('deleted_at', null),
  ])
  if (salesError) throw new Error(salesError.message)
  const revenue = (sales ?? []).reduce((sum, sale) => sum + Number(sale.total), 0)
  const itemTotals = new Map<string, { name: string; quantity: number; cost: number }>()
  for (const sale of sales ?? []) for (const item of sale.sale_items ?? []) {
    const product = Array.isArray(item.product) ? item.product[0] : item.product
    const name = product?.name ?? 'Produto'
    const current = itemTotals.get(name) ?? { name, quantity: 0, cost: Number(product?.cost ?? 0) }
    current.quantity += Number(item.quantity)
    itemTotals.set(name, current)
  }
  const soldItems = [...itemTotals.values()].reduce((sum, item) => sum + item.quantity, 0)
  const cost = [...itemTotals.values()].reduce((sum, item) => sum + item.quantity * item.cost, 0)
  const topProduct = [...itemTotals.values()].sort((left, right) => right.quantity - left.quantity)[0]?.name ?? ''
  return { revenue, soldItems, grossMargin: revenue ? ((revenue - cost) / revenue) * 100 : 0, topProduct }
}

export function ReportsPage() {
  const [data, setData] = useState(emptyReport)
  const [error, setError] = useState('')
  useEffect(() => { loadReport().then(setData).catch((loadError: Error) => setError(loadError.message)) }, [])
  const cards = [{ title: 'Faturamento', value: formatCurrency(data.revenue), detail: data.revenue ? 'Dados de vendas' : 'Nenhum dado disponível', icon: TrendingUp }, { title: 'Produto mais vendido', value: data.topProduct || 'Nenhum produto vendido', detail: data.soldItems ? `${data.soldItems} unidades` : 'Nenhum dado disponível', icon: BarChart3 }, { title: 'Margem bruta', value: `${data.grossMargin.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`, detail: data.revenue ? 'Calculada pelas vendas' : 'Nenhum dado disponível', icon: FileBarChart }]
  function exportReport() {
    const rows = [['Indicador', 'Valor', 'Detalhe'], ...cards.map((card) => [card.title, card.value, card.detail])]
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })); const link = document.createElement('a'); link.href = url; link.download = `fiocchi-relatorio-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
  }
  return <div className="space-y-6"><header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm uppercase tracking-[0.25em] text-brand-600">Análise</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Relatórios</h1></div><Button className="w-full md:w-auto" onClick={exportReport}><Download size={16} />Exportar relatório</Button></header>{error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar os relatórios: {error}</p> : null}<div className="grid gap-4 md:grid-cols-3">{cards.map(({ title, value, detail, icon: Icon }) => <Card key={title}><CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-sm text-slate-500">{title}<Icon size={18} className="text-brand-600" /></CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{value}</p><p className="mt-2 text-sm text-emerald-600">{detail}</p></CardContent></Card>)}</div></div>
}
