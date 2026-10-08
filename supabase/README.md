# Integração Supabase

## Variáveis necessárias

Configure estas variáveis no arquivo `.env` local e no ambiente de deploy:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-anon-key>
VITE_APP_NAME=Fiocchi Beauty
```

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são os únicos valores necessários para o cliente frontend. Use a chave pública `anon`/publishable key do projeto. Nunca coloque `service_role`, database password ou qualquer segredo em uma variável `VITE_*`.

## Migrations disponíveis

- `migrations/001_initial_schema.sql`: extensões, enums, tabelas, índices, trigger de perfil e políticas RLS.
- `seed.sql`: arquivo intencionalmente vazio; o projeto não inclui dados demonstrativos.
- `config.toml`: configuração local opcional da Supabase CLI.

A migration deve ser aplicada uma única vez por projeto usando Supabase CLI ou SQL Editor. O `seed.sql` não cadastra dados.

## Estrutura esperada

### Enums

- `user_role`: `ADMIN`, `OPERATOR`, `VIEWER`
- `stock_movement_type`: `ENTRADA_COMPRA`, `ENTRADA_AJUSTE`, `SAIDA_VENDA`, `SAIDA_PERDA`, `SAIDA_AJUSTE`, `DEVOLUCAO`

### Tabelas

- `profiles`: `id`, `email`, `full_name`, `role`, timestamps e `deleted_at`; `id` referencia `auth.users(id)`.
- `categories`: `id`, `name`, timestamps e `deleted_at`.
- `brands`: `id`, `name`, timestamps e `deleted_at`.
- `product_lines`: `id`, `name`, timestamps e `deleted_at`.
- `suppliers`: dados cadastrais, contato, `active`, timestamps e `deleted_at`.
- `customers`: nome, contato, `active`, timestamps e `deleted_at`.
- `products`: `sku`, `name`, descrição, relações de marca/categoria/linha/fornecedor, custo, preço, estoque, mínimo, reservado, `active`, imagem, timestamps e `deleted_at`.
- `purchases`: fornecedor, data, forma de pagamento, status, total, criador, timestamps e `deleted_at`.
- `purchase_items`: compra, produto, quantidade, custo unitário, desconto e total.
- `sales`: cliente, data, forma de pagamento, subtotal, desconto, total, status, criador, timestamps e `deleted_at`.
- `sale_items`: venda, produto, quantidade, preço unitário, desconto e total.
- `stock_movements`: produto, quantidade, tipo, usuário, data, motivo e referência.
- `financial_categories`: nome, tipo, timestamps e `deleted_at`.
- `cost_centers`: nome, timestamps e `deleted_at`.
- `financial_transactions`: categoria, centro de custo, descrição, valor, tipo, data, criador, timestamps e `deleted_at`.
- `accounts_payable`: descrição, fornecedor, categoria, centro de custo, valor, vencimento, pagamento, status, observações, timestamps e `deleted_at`.
- `accounts_receivable`: cliente, venda, valor, vencimento, recebimento, forma de pagamento, status, timestamps e `deleted_at`.
- `audit_logs`: usuário, ação, entidade, entidade relacionada, valores anterior/novo, data e IP.

### Relações principais

- `products.brand_id -> brands.id`
- `products.category_id -> categories.id`
- `products.line_id -> product_lines.id`
- `products.supplier_id -> suppliers.id`
- `purchases.supplier_id -> suppliers.id`
- `purchase_items.purchase_id -> purchases.id`
- `purchase_items.product_id -> products.id`
- `sales.customer_id -> customers.id`
- `sales.created_by -> profiles.id`
- `sale_items.sale_id -> sales.id`
- `sale_items.product_id -> products.id`
- `stock_movements.product_id -> products.id`
- `stock_movements.user_id -> profiles.id`
- `financial_transactions.category_id -> financial_categories.id`
- `financial_transactions.cost_center_id -> cost_centers.id`
- `financial_transactions.created_by -> profiles.id`
- `accounts_payable.supplier_id -> suppliers.id`
- `accounts_receivable.customer_id -> customers.id`
- `accounts_receivable.sale_id -> sales.id`
- `audit_logs.user_id -> profiles.id`

### Índices

A migration cria índices para e-mail de perfil, SKU, fornecedor de produto, datas de vendas/compras, produto em movimentações e status de contas a pagar/receber.

## Auth e perfil

A função `public.handle_new_user()` e o trigger `on_auth_user_created` criam um registro em `profiles` após a criação de um usuário no Supabase Auth. O frontend consulta `profiles` pelo mesmo `auth.users.id`.

No primeiro acesso administrativo, altere o `role` do perfil criado no SQL Editor:

```sql
update public.profiles
set role = 'ADMIN'
where email = 'seu-email@dominio.com';
```

## RLS esperado

A migration habilita RLS em todas as tabelas públicas. Usuários autenticados podem:

- consultar perfis, produtos, vendas, compras, movimentações de estoque, transações financeiras e logs;
- gerenciar catálogo, fornecedores, clientes, itens de compras/vendas, categorias financeiras, centros de custo, contas a pagar/receber;
- inserir, atualizar e excluir logicamente produtos, vendas, compras e transações financeiras;
- inserir logs de auditoria somente quando `auth.uid() = user_id`.

A política de escrita atual é baseada em autenticação. A aplicação ainda não aplica restrição de escrita por papel (`ADMIN`/`OPERATOR`/`VIEWER`) no banco.

## Procedimento para conectar um projeto novo

1. Crie um projeto no Supabase.
2. Em **Project Settings > API**, copie a **Project URL** e a chave pública **anon/publishable**.
3. Crie `.env` na raiz copiando `.env.example`.
4. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` sem alterar os nomes.
5. No SQL Editor, execute `supabase/migrations/001_initial_schema.sql`.
6. Não é necessário executar seed: cadastre os dados pela aplicação.
7. Em **Authentication > Providers**, habilite Email e defina as opções de confirmação conforme o ambiente.
8. Crie o primeiro usuário em **Authentication > Users** ou pelo fluxo de cadastro configurado no projeto.
9. Promova esse usuário para `ADMIN` usando o SQL de atualização acima.
10. Execute localmente:

```bash
npm install
npm run dev
```

11. Para produção, configure as mesmas três variáveis no provedor de deploy. Nunca publique a `service_role` key no frontend.

## Validação pendente sem projeto real

Sem um projeto Supabase conectado não é possível confirmar a execução SQL, os relacionamentos PostgREST, as respostas de joins, as permissões RLS, inserts/updates remotos ou paginação `.range()` contra dados reais. A ausência da Supabase CLI é uma dependência do ambiente, não um erro da aplicação.
