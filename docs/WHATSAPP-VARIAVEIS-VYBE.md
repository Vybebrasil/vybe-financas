# Variáveis Vybe no WhatsApp e IA

## Configuração no app

Em **Configurações do Sistema** → templates / WhatsApp:

1. **Pagamentos (PIX e links)** — chave PIX, tipo, link e instruções (usados na IA e nos templates `{{pixKey}}`, `{{paymentLink}}`).
2. **Templates de mensagem** — mesmas variáveis de sempre + PIX e link.
3. **Régua de cobrança** — o envio passa pelo `send-whatsapp` com contexto completo do cliente.

## Atendimento automático (cliente manda mensagem)

Fluxo (sem IA):

```
WhatsApp → Evolution → n8n → whatsapp-context (telefone da agência) → mensagem fallback → Evolution
```

Quando alguém responde no WhatsApp, o n8n envia uma **mensagem fixa** direcionando ao setor responsável, com **telefone e e-mail da agência** cadastrados em Configurações da empresa (não usa Gemini).

A Edge Function `whatsapp-context` ainda busca dados da agência (e cliente, se identificado por telefone ou texto):

- Cliente completo (`clients`)
- Empresa (`company_settings`)
- PIX / link (`integrations.payment`)
- Cobrança do mês + **histórico dos últimos 6 meses**
- **Contratos** do cliente
- **Transações** recentes
- **Templates** WhatsApp da régua (com valores já preenchidos)
- **Planos** disponíveis
- **Catálogo de variáveis** (`catalogo_variaveis`) — todas as chaves do sistema com `label`, `grupo` e `valor_atual` (vazio = não preenchido)
- **Guia para IA** (`guia_ia`) — sinônimos (PIX, vencimento, plano…) e regras para não inventar dados
- **Busca por texto** — se o telefone não identificar o cliente, CNPJ ou nome na mensagem disparam `findClientByTextHint`

**Auth:** header `X-Cobranca-Token` (mesmo secret `COBRANCA_WEBHOOK_TOKEN` no Supabase e no n8n).

## Secrets Supabase

| Secret | Uso |
|--------|-----|
| `COBRANCA_WEBHOOK_TOKEN` | `send-whatsapp`, `whatsapp-context`, n8n |
| `N8N_WHATSAPP_WEBHOOK_URL` | URL webhook cobrança (opcional) |

Deploy das functions:

```bash
supabase functions deploy send-whatsapp
supabase functions deploy whatsapp-context
```

## Variáveis n8n (container VPS)

| Variável | Descrição |
|----------|-----------|
| `VYBE_CONTEXT_URL` | `https://<projeto>.supabase.co/functions/v1/whatsapp-context` |
| `VYBE_WEBHOOK_TOKEN` | Igual ao `COBRANCA_WEBHOOK_TOKEN` |
| `GEMINI_API_KEY` | Google AI Studio |

Atualizar VPS:

```powershell
cd g:\desenvolvimento\n8n
.\scripts\hostinger\Set-Gemini-Env.ps1
.\scripts\hostinger\Deploy-WhatsApp-IA.ps1
```

## Payload de cobrança (app → n8n)

Campos enviados além dos básicos:

- `chave_pix`, `tipo_pix`, `link_pagamento`
- `plano`, `status_cobranca`, `cnpj_cliente`, `email_cliente`
- `instrucoes_pagamento`
- `contexto` — JSON completo do Vybe (para a IA)

## Templates

| Variável | Origem |
|----------|--------|
| `{{contactPerson}}` | Cliente |
| `{{clientName}}` | Cliente |
| `{{activePlan}}` | Cliente |
| `{{amount}}` | Mensalidade formatada |
| `{{dueDay}}` | Dia de vencimento |
| `{{companyName}}` | Empresa |
| `{{pixKey}}` | Configurações → Pagamentos |
| `{{paymentLink}}` | Configurações → Pagamentos |
