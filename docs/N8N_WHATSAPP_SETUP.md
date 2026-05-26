# WhatsApp via n8n + Evolution (Hostinger)

Integração com o workflow **`cobranca-whatsapp`** já publicado no seu n8n.

## Fluxo

```
Vybe (Cobrança) → Edge Function send-whatsapp → POST /webhook/cobranca-whatsapp → Evolution → WhatsApp
```

## 1. Secrets no Supabase

No dashboard ou via script local:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/set-whatsapp-secrets.ps1
```

| Secret | Valor |
|--------|--------|
| `N8N_WHATSAPP_WEBHOOK_URL` | `https://n8n.srv1704092.hstgr.cloud/webhook/cobranca-whatsapp` |
| `COBRANCA_WEBHOOK_TOKEN` | Mesmo valor de `COBRANCA_WEBHOOK_TOKEN` no `.env` do projeto **n8n** |

Depois:

```bash
npm run whatsapp:deploy
```

## 2. Workflow n8n

Arquivo: `../n8n/workflows/cobranca-whatsapp.json`

Publicar/atualizar:

```powershell
cd ..\n8n
.\scripts\hostinger\Deploy-Cobranca.ps1
```

O workflow valida o header **`X-Cobranca-Token`** e envia pela Evolution:

`POST https://evo.srv1704092.hstgr.cloud/message/sendText/whatsapp`

Se o body incluir **`mensagem`**, o Vybe usa o texto dos templates da régua. Caso contrário, o n8n monta a mensagem padrão de cobrança.

## 3. No app Vybe

1. **Configurações do Sistema**
2. Ative **“Enviar automático pelo servidor”**
3. Salve
4. Em **Cobrança** → **Enviar via WhatsApp**

## Payload enviado ao n8n

```json
{
  "telefone": "5511999999999",
  "valor": "1.499,90",
  "nome": "Maria Silva",
  "vencimento": "Dia 10",
  "mensagem": "Texto do template Vybe já renderizado",
  "id_fatura": "uuid-do-cliente"
}
```

Documentação completa da API: `../n8n/COBRANCA-API.md`

## Segurança

- **Nunca** coloque `EVOLUTION_API_KEY` ou `COBRANCA_WEBHOOK_TOKEN` em variáveis `VITE_*`.
- Se credenciais vazaram em chat ou commit, **gire** token e API key no painel.

## Troubleshooting

| Erro | Ação |
|------|------|
| `COBRANCA_WEBHOOK_TOKEN não configurado` | Rode `set-whatsapp-secrets.ps1` |
| HTTP 401 no n8n | Token diferente entre Supabase e workflow n8n |
| HTTP 502 | WhatsApp desconectado na Evolution ou instância `whatsapp` offline |
| `telefone e valor sao obrigatorios` | Cliente sem telefone ou mensalidade zerada |
