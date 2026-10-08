create extension if not exists "pgcrypto";

create type public.user_role as enum ('ADMIN', 'OPERATOR', 'VIEWER');
create type public.inventory_status as enum ('NORMAL', 'LOW_STOCK', 'OUT_OF_STOCK');
create type public.stock_movement_type as enum (
  'ENTRADA_COMPRA',
  'ENTRADA_AJUSTE',
  'SAIDA_VENDA',
  'SAIDA_PERDA',
  'SAIDA_AJUSTE',
  'DEVOLUCAO'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'VIEWER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'Usuário'), '@', 1)),
    'VIEWER'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.product_lines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  phone text,
  email text,
  website text,
  contact_name text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  instagram text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  brand_id uuid references public.brands(id),
  category_id uuid references public.categories(id),
  line_id uuid references public.product_lines(id),
  supplier_id uuid references public.suppliers(id),
  cost numeric(12,2) not null check (cost >= 0),
  price numeric(12,2) not null check (price >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  stock integer not null default 0 check (stock >= 0),
  reserved_stock integer not null default 0 check (reserved_stock >= 0),
  active boolean default true,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id),
  purchase_date timestamptz not null default now(),
  payment_method text,
  status text not null default 'PENDING',
  total numeric(12,2) not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  sale_date timestamptz not null default now(),
  payment_method text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'PAID',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity != 0),
  type public.stock_movement_type not null,
  user_id uuid references public.profiles(id),
  movement_date timestamptz not null default now(),
  reason text,
  reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null default 'expense',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.financial_categories(id),
  cost_center_id uuid references public.cost_centers(id),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  type text not null check (type in ('RECEITA', 'DESPESA')),
  transaction_date timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  supplier_id uuid references public.suppliers(id),
  category_id uuid references public.financial_categories(id),
  cost_center_id uuid references public.cost_centers(id),
  amount numeric(12,2) not null check (amount >= 0),
  due_date timestamptz not null,
  payment_date timestamptz,
  payment_method text,
  status text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  sale_id uuid references public.sales(id),
  amount numeric(12,2) not null check (amount >= 0),
  due_date timestamptz not null,
  receipt_date timestamptz,
  payment_method text,
  status text not null default 'PENDING' check (status in ('PENDING', 'RECEIVED', 'OVERDUE', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  previous_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now(),
  ip_address text
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_products_supplier on public.products(supplier_id);
create index if not exists idx_sales_date on public.sales(sale_date);
create index if not exists idx_purchases_date on public.purchases(purchase_date);
create index if not exists idx_stock_movements_product on public.stock_movements(product_id);
create index if not exists idx_accounts_payable_status on public.accounts_payable(status);
create index if not exists idx_accounts_receivable_status on public.accounts_receivable(status);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;
alter table public.stock_movements enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.product_lines enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sale_items enable row level security;
alter table public.financial_categories enable row level security;
alter table public.cost_centers enable row level security;
alter table public.accounts_payable enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_are_viewable_by_authenticated_users" on public.profiles
for select using (auth.role() = 'authenticated');

create policy "products_are_viewable_by_authenticated_users" on public.products
for select using (auth.role() = 'authenticated');

create policy "products_are_manageable_by_authenticated_users" on public.products
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "sales_are_viewable_by_authenticated_users" on public.sales
for select using (auth.role() = 'authenticated');

create policy "sales_are_manageable_by_authenticated_users" on public.sales
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "purchases_are_viewable_by_authenticated_users" on public.purchases
for select using (auth.role() = 'authenticated');

create policy "purchases_are_manageable_by_authenticated_users" on public.purchases
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "stock_movements_are_viewable_by_authenticated_users" on public.stock_movements
for select using (auth.role() = 'authenticated');

create policy "financial_transactions_are_viewable_by_authenticated_users" on public.financial_transactions
for select using (auth.role() = 'authenticated');

create policy "financial_transactions_are_manageable_by_authenticated_users" on public.financial_transactions
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "catalog_and_operations_are_manageable_by_authenticated_users" on public.categories
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "brands_are_manageable_by_authenticated_users" on public.brands
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "product_lines_are_manageable_by_authenticated_users" on public.product_lines
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "suppliers_are_manageable_by_authenticated_users" on public.suppliers
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "customers_are_manageable_by_authenticated_users" on public.customers
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "purchase_items_are_manageable_by_authenticated_users" on public.purchase_items
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "sale_items_are_manageable_by_authenticated_users" on public.sale_items
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "financial_categories_are_manageable_by_authenticated_users" on public.financial_categories
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "cost_centers_are_manageable_by_authenticated_users" on public.cost_centers
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "accounts_payable_are_manageable_by_authenticated_users" on public.accounts_payable
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "accounts_receivable_are_manageable_by_authenticated_users" on public.accounts_receivable
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "audit_logs_are_viewable_by_authenticated_users" on public.audit_logs
for select using (auth.role() = 'authenticated');

create policy "audit_logs_are_insertable_by_authenticated_users" on public.audit_logs
for insert with check (auth.uid() = user_id);
