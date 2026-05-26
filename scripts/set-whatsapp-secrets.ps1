# Define secrets da Edge Function send-whatsapp no Supabase.
# Lê COBRANCA_WEBHOOK_TOKEN e URL do .env do projeto n8n (irmão) se existir.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/set-whatsapp-secrets.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$n8nEnv = Join-Path (Split-Path -Parent $root) 'n8n\.env'

$token = $env:COBRANCA_WEBHOOK_TOKEN
$webhookUrl = $env:N8N_WHATSAPP_WEBHOOK_URL

if (Test-Path $n8nEnv) {
  Get-Content $n8nEnv | ForEach-Object {
    if ($_ -match '^\s*COBRANCA_WEBHOOK_TOKEN\s*=\s*(.+)$' -and -not $token) {
      $token = $matches[1].Trim().Trim('"').Trim("'")
    }
    if ($_ -match '^\s*COBRANCA_WEBHOOK_URL\s*=\s*(.+)$' -and -not $webhookUrl) {
      $webhookUrl = $matches[1].Trim().Trim('"').Trim("'")
    }
    if ($_ -match '^\s*N8N_URL\s*=\s*(.+)$' -and -not $webhookUrl) {
      $base = $matches[1].Trim().Trim('"').Trim("'")
      $webhookUrl = "$base/webhook/cobranca-whatsapp"
    }
  }
}

if (-not $webhookUrl) {
  $webhookUrl = 'https://n8n.srv1704092.hstgr.cloud/webhook/cobranca-whatsapp'
}

if (-not $token) {
  Write-Host 'COBRANCA_WEBHOOK_TOKEN nao encontrado. Defina no .env do n8n ou na variavel de ambiente.' -ForegroundColor Red
  exit 1
}

Write-Host 'Configurando secrets send-whatsapp...' -ForegroundColor Cyan
npx supabase@latest secrets set `
  "N8N_WHATSAPP_WEBHOOK_URL=$webhookUrl" `
  "COBRANCA_WEBHOOK_TOKEN=$token" `
  --project-ref nmqpfvfusyqenexckkvr

if ($LASTEXITCODE -ne 0) {
  Write-Host 'Falhou. Execute antes: npx supabase login' -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host 'OK. Rode: npm run whatsapp:deploy' -ForegroundColor Green
