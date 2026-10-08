# Fiocchi Beauty

Aplicação web de gestão para uma loja de beleza, construída com React, TypeScript, Vite, Tailwind CSS e Supabase.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Supabase

Copie `.env.example` para `.env` e preencha somente os valores públicos do projeto:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-anon-key>
VITE_APP_NAME=Fiocchi Beauty
```

Nunca use `service_role`, senha do banco ou outro segredo em variáveis `VITE_*`.

O procedimento completo de conexão, o schema esperado, relacionamentos, índices, RLS e seed estão documentados em [supabase/README.md](supabase/README.md).

Para aplicar o schema, execute [001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) no SQL Editor do projeto Supabase. O [seed.sql](supabase/seed.sql) não cadastra dados.

## Validação

```bash
npm run test:run
npm run lint
npm run build
```

Sem as variáveis Supabase, a aplicação permanece sem sessão e sem dados; configure um projeto Supabase para entrar e cadastrar registros.
