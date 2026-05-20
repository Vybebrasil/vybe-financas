# Operações — Vybe Finanças

## Recorrência mensal

Lançamentos de mensalidades (clientes), salários e assinaturas são gerados no início de cada mês.

### Componentes

| Item | Caminho |
|------|---------|
| Lógica no cliente | `src/services/recurringLogic.ts`, `recurringTransactions.ts` |
| Edge Function | `supabase/functions/monthly-recurring/` |
| Cron Postgres | `supabase/migrations/20260520000001_schedule_monthly_recurring_cron.sql` |
| Log | tabela `recurring_generation_log` |

### Deploy da Edge Function

```bash
npx supabase functions deploy monthly-recurring --project-ref SEU_PROJECT_REF
```

Defina o secret `CRON_SECRET` no projeto Supabase (Settings → Edge Functions → Secrets) e use o mesmo valor no cron ou no script local.

### Invocar manualmente (teste)

```bash
node scripts/invoke-monthly-recurring.mjs
```

### Verificar log

No SQL Editor:

```sql
SELECT * FROM recurring_generation_log ORDER BY created_at DESC LIMIT 10;
```

### Contas bancárias

Execute `supabase_schema.sql` ou a migration `20260520000003_bank_accounts.sql` no Supabase. Cadastre contas em **Configurações → Contas bancárias**.
