# Recorrência mensal no servidor

O Vybe Finanças gera lançamentos pendentes (mensalidades, salários, assinaturas) automaticamente.

## Cliente (fallback)

Ao abrir o app, `ensureMonthlyRecurringTransactions` roda uma vez por mês e grava em `recurring_generation_log`.

## Servidor (recomendado)

### 1. Tabela no Supabase

Execute no SQL Editor o bloco `recurring_generation_log` do arquivo `supabase_schema.sql`.

### 2. Edge Function

Requisitos: [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e projeto linkado.

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
# Gere uma senha forte (já existe em .env.local como CRON_SECRET) e publique:
npm run recurring:secret
# ou manualmente, após `npx supabase login`:
# npx supabase secrets set CRON_SECRET=<valor-do-.env.local> --project-ref nmqpfvfusyqenexckkvr
supabase functions deploy monthly-recurring
```

### 3. Agendar (Cron) — já configurado no projeto

O job **`vybe-monthly-recurring`** usa `pg_cron` + `pg_net` e roda:

- **Agenda:** `0 8 1 * *` → dia **1** de cada mês, **08:00 UTC** (05:00 em Brasília no horário padrão)
- **Função:** `POST /functions/v1/monthly-recurring`
- **Secrets no Vault:** `vybe_project_url`, `vybe_anon_key`, `vybe_cron_secret`

Verificar no Dashboard: **Integrations** → **Cron** (ou SQL: `SELECT * FROM cron.job WHERE jobname = 'vybe-monthly-recurring'`).

Para reinstalar em outro ambiente, execute as migrations em `supabase/migrations/` e crie os secrets no Vault com os mesmos nomes.

### 4. Teste manual

**Via npm (recomendado):**

```bash
npm run recurring:invoke
```

**Via curl:**

```bash
curl -X POST "https://SEU_PROJECT.supabase.co/functions/v1/monthly-recurring" \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "x-cron-secret: SUA_CRON_SECRET"
```

**Execução local (sem Edge Function):** adicione `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` e rode:

```bash
npm run recurring:run
```

Resposta esperada: JSON com `monthKey`, `usersProcessed` e `results`.
