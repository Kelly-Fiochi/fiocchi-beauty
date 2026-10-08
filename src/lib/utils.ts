import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function calculateProfit(price: number, cost: number) {
  return price - cost
}

export function calculateMargin(profit: number, revenue: number) {
  if (!revenue) return 0
  return (profit / revenue) * 100
}

export function calculateAverageTicket(revenue: number, salesCount: number) {
  if (!salesCount) return 0
  return revenue / salesCount
}

export function getInventoryStatus(stock: number, reservedStock: number) {
  const available = stock - reservedStock

  if (available <= 0) return 'OUT_OF_STOCK'
  if (available <= 3) return 'LOW_STOCK'
  return 'NORMAL'
}
