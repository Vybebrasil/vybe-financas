# Define CRON_SECRET no projeto Supabase (Edge Functions).
# Pré-requisito: supabase login  (ou variável SUPABASE_ACCESS_TOKEN)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root ".env.local"

if (-not (Test-Path $envFile)) {
  Write-Error "Arquivo .env.local não encontrado. Crie com CRON_SECRET=..."
}

$secret = $null
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*CRON_SECRET=(.+)$') {
    $secret = $matches[1].Trim().Trim('"').Trim("'")
  }
}

if (-not $secret) {
  Write-Error "CRON_SECRET não definido em .env.local"
}

$projectRef = "nmqpfvfusyqenexckkvr"
Write-Host "Configurando CRON_SECRET no projeto $projectRef ..."

npx supabase@latest secrets set "CRON_SECRET=$secret" --project-ref $projectRef

if ($LASTEXITCODE -eq 0) {
  Write-Host "OK. Use o mesmo valor no cron (header x-cron-secret) e em npm run recurring:invoke"
} else {
  Write-Host "Falhou. Execute antes: npx supabase login"
  exit $LASTEXITCODE
}
