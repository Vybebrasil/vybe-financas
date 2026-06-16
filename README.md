# Vybe Finanças

ERP financeiro para agências de marketing — MRR, fluxo de caixa, régua de cobrança, contratos e relatórios.

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Deploy:** Vercel

## Funcionalidades

- Dashboard com KPIs, previsões e lucratividade por cliente
- Financeiro: extrato, baixa com data real, conciliação bancária (CSV)
- Clientes: régua de cobrança manual e **automática** (WhatsApp / e-mail)
- Contratos Vybe OS (DOCX + PDF)
- Despesas: folha, assinaturas, gastos rápidos
- Relatórios exportáveis (CSV/PDF)
- Webhook PIX para baixa automática
- Rotas URL (`/financeiro`, `/clientes`, etc.)
- Equipe compartilhada (workspace)

## Desenvolvimento

```bash
cp .env.example .env.local   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Testes

```bash
npm test
npm run test:e2e
```

## Edge Functions

| Função | Descrição |
|--------|-----------|
| `monthly-recurring` | Lançamentos recorrentes (cron mensal) |
| `billing-dispatch` | Régua automática diária |
| `send-whatsapp` | Cobrança via n8n → Evolution |
| `payment-webhook` | Baixa automática ao confirmar PIX |

```bash
npm run recurring:deploy
npm run billing:deploy
npm run payment-webhook:deploy
npm run whatsapp:deploy
```

Secrets Supabase: `CRON_SECRET`, `COBRANCA_WEBHOOK_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Operações](docs/OPERATIONS.md)
- [WhatsApp / n8n](docs/N8N_WHATSAPP_SETUP.md)
- [Recorrência](docs/RECURRING_SETUP.md)

## Migrations

Execute as migrations em `supabase/migrations/` no SQL Editor do Supabase (ou `supabase db push`).
