export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER'

export type Permission = 'read' | 'write' | 'delete'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  permissions: Permission[]
}

export interface Product {
  id: string
  sku: string
  name: string
  brand: string
  category: string
  line: string
  supplier: string
  cost: number
  price: number
  minStock: number
  stock: number
  reservedStock: number
  active: boolean
  image?: string
}

export interface InventoryMovement {
  id: string
  productId: string
  productName: string
  quantity: number
  type: 'ENTRADA_COMPRA' | 'ENTRADA_AJUSTE' | 'SAIDA_VENDA' | 'SAIDA_PERDA' | 'SAIDA_AJUSTE' | 'DEVOLUCAO'
  user: string
  date: string
  reason: string
  reference: string
}

export interface SaleRecord {
  id: string
  customer: string
  amount: number
  profit: number
  date: string
  status: 'PAID' | 'PENDING' | 'CANCELLED'
}

export interface FinanceSummary {
  revenue: number
  expenses: number
  cashFlow: number
  grossProfit: number
  margin: number
}
