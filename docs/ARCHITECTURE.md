# Arquitetura Vybe Finanças

## Stack principal (produção)

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + Vite + TypeScript |
| Backend / dados | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Deploy | Vercel |

O app **não utiliza** o backend NestJS em `src/modules/` em produção. Esse código é legado/boilerplate e pode ser removido em um refactor futuro.

## Persistência

- **Transações, clientes, funcionários, assinaturas:** tabelas Postgres com RLS por `user_id`
- **Configurações da empresa:** tabela `company_settings` (planos, templates, logo, etc.)
- **Recorrência mensal:** Edge Function `monthly-recurring` + cron `pg_cron` + log `recurring_generation_log`
- **Arquivos:** Storage buckets `receipts` e `logos` (pasta por usuário)

## Migração de configurações

Na primeira carga após a fase 3, se não houver linha em `company_settings`, os dados são lidos de `auth.users` metadata e gravados na tabela automaticamente.

## Testes e CI

- Testes unitários: Vitest (`npm test`) — recorrência, inadimplência, datas e resumo do dashboard
- CI: `.github/workflows/ci.yml` — test + build em cada PR/push

## Fase 4 — arquitetura do frontend

- **`App.tsx`**: autenticação e gate de configuração Supabase
- **`src/context/AppDataContext.tsx`**: estado global e handlers CRUD
- **`components/AppShell.tsx`**: layout, abas e modais
- **Lazy loading**: `ExpensesView`, `ReportsView` e `SettingsView` carregam sob demanda
- **`src/services/summary.ts`**: cálculo dos KPIs do dashboard
- **Nest legado**: arquivado em `legacy/nest-backend/` (não usado em produção)

## Testes E2E (fase 5)

- **Playwright** (`npm run test:e2e`) — smoke da tela de login e aviso de Supabase não configurado
- Teste autenticado opcional: copie `.env.e2e.example` → `.env.e2e.local` com `E2E_EMAIL` / `E2E_PASSWORD`
- CI: job `e2e` no GitHub Actions (secrets: `E2E_EMAIL`, `E2E_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

## Dashboard e relatórios

- **`components/DashboardView.tsx`**: cockpit com período, KPIs, régua resumida, MRR vs recebido
- **`src/services/dashboardMetrics.ts`**: métricas por período
- Período do dashboard → Relatórios: `openReportsWithDateRange` no `AppDataContext`

## Contas bancárias

- Tabela `bank_accounts`; transações com `bank_account_id` opcional
- Gestão em Configurações; filtro no extrato e relatórios

## Operações

Ver `docs/OPERATIONS.md` (recorrência mensal, deploy da Edge Function).
