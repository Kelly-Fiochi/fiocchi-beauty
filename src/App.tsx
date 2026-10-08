import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  Warehouse,
} from 'lucide-react'

import { AuthPage } from './features/auth/AuthPage'
import { useAuth } from './hooks/auth-context'
import { AuthProvider } from './hooks/useAuth'
import { Button } from './components/ui/button'

const AuditPage = lazy(() => import('./features/audit/AuditPage').then(({ AuditPage }) => ({ default: AuditPage })))
const CustomersPage = lazy(() => import('./features/customers/CustomersPage').then(({ CustomersPage }) => ({ default: CustomersPage })))
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })))
const FinancePage = lazy(() => import('./features/finance/FinancePage').then(({ FinancePage }) => ({ default: FinancePage })))
const InventoryPage = lazy(() => import('./features/inventory/InventoryPage').then(({ InventoryPage }) => ({ default: InventoryPage })))
const ProductsPage = lazy(() => import('./features/products/ProductsPage').then(({ ProductsPage }) => ({ default: ProductsPage })))
const PurchasesPage = lazy(() => import('./features/purchases/PurchasesPage').then(({ PurchasesPage }) => ({ default: PurchasesPage })))
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then(({ ReportsPage }) => ({ default: ReportsPage })))
const SalesPage = lazy(() => import('./features/sales/SalesPage').then(({ SalesPage }) => ({ default: SalesPage })))
const UsersPage = lazy(() => import('./features/users/UsersPage').then(({ UsersPage }) => ({ default: UsersPage })))

const queryClient = new QueryClient()

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Estoque', href: '/inventory', icon: Warehouse },
  { label: 'Produtos', href: '/products', icon: Package },
  { label: 'Compras', href: '/purchases', icon: ShoppingBag },
  { label: 'Vendas', href: '/sales', icon: ShoppingCart },
  { label: 'Clientes', href: '/customers', icon: Users },
  { label: 'Financeiro', href: '/finance', icon: CreditCard },
  { label: 'Relatórios', href: '/reports', icon: BarChart3 },
  { label: 'Usuários', href: '/users', icon: Settings },
  { label: 'Auditoria', href: '/audit', icon: ClipboardList },
]

function ProtectedRoute() {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">Carregando sessão...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 p-4 md:p-6">
        <aside className="hidden min-h-[calc(100vh-3rem)] w-64 flex-col rounded-2xl bg-slate-900 p-4 text-slate-100 md:flex">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 font-bold text-white">
              F
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Loja</p>
              <h2 className="text-lg font-semibold">Fiocchi Beauty</h2>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ label, href, icon: Icon }) => (
              <NavLink
                key={href}
                to={href}
                end={href === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="mb-6 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-soft md:px-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Bem-vindo</p>
              <h1 className="text-xl font-bold text-slate-900">{user?.name ?? 'Administrador'}</h1>
            </div>
            <Button variant="secondary" onClick={signOut}>
              Sair
            </Button>
          </header>

          <Suspense fallback={<div className="rounded-2xl bg-white p-8 text-sm text-slate-500 shadow-soft">Carregando módulo...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AuthPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/purchases" element={<PurchasesPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
