# Secrets Resend para régua automática (billing-dispatch).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/set-resend-secrets.ps1
# Ou defina antes: $env:RESEND_API_KEY = 're_...'; $env:RESEND_FROM_EMAIL = 'cobranca@suaagencia.com.br'

$ErrorActionPreference = 'Stop'

$apiKey = $env:RESEND_API_KEY
$fromEmail = $env:RESEND_FROM_EMAIL

if (-not $apiKey) {
  Write-Host 'RESEND_API_KEY nao definida. Obtenha em https://resend.com/api-keys' -ForegroundColor Red
  exit 1
}

if (-not $fromEmail) {
  Write-Host 'RESEND_FROM_EMAIL nao definido (ex.: cobranca@seudominio.com.br).' -ForegroundColor Red
  exit 1
}

Write-Host 'Configurando secrets Resend (billing-dispatch)...' -ForegroundColor Cyan
npx supabase@latest secrets set `
  "RESEND_API_KEY=$apiKey" `
  "RESEND_FROM_EMAIL=$fromEmail" `
  --project-ref nmqpfvfusyqenexckkvr

if ($LASTEXITCODE -ne 0) {
  Write-Host 'Falhou. Execute antes: npx supabase login' -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host 'OK. Rode: npm run billing:deploy' -ForegroundColor Green
