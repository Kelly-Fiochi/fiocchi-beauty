export function calculateProfit(price: number, cost: number) {
  return price - cost
}

export function calculateMargin(profit: number, revenue: number) {
  if (revenue === 0) return 0
  return (profit / revenue) * 100
}

export function calculateAverageTicket(revenue: number, salesCount: number) {
  if (salesCount === 0) return 0
  return revenue / salesCount
}

export function calculateCashFlow(incoming: number, outgoing: number) {
  return incoming - outgoing
}

export function getInventoryStatus(stock: number, reservedStock: number) {
  const available = stock - reservedStock

  if (available <= 0) return 'OUT_OF_STOCK'
  if (available <= 3) return 'LOW_STOCK'
  return 'NORMAL'
}
