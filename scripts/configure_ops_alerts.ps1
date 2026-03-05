param(
  [string]$WebhookUrl = "",
  [int]$OverdueThreshold = 25,
  [int]$UnreadCriticalThreshold = 5,
  [double]$ErrorRateThreshold = 0.10,
  [switch]$RunCheck = $false
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "backend/.env"
$exampleFile = Join-Path $root "backend/.env.example"

if (-not (Test-Path $envFile)) {
  if (-not (Test-Path $exampleFile)) {
    throw "Missing backend/.env.example"
  }
  Copy-Item $exampleFile $envFile
}

$content = Get-Content $envFile -Raw

function Set-Or-AddEnvValue {
  param(
    [string]$Text,
    [string]$Key,
    [string]$Value
  )
  $pattern = "(?m)^$Key=.*$"
  $replacement = "$Key=$Value"
  if ($Text -match $pattern) {
    return [regex]::Replace($Text, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $replacement })
  }
  if ($Text.Trim().Length -eq 0) {
    return $replacement
  }
  return "$Text`r`n$replacement"
}

$content = Set-Or-AddEnvValue -Text $content -Key "PNPI_ALERT_WEBHOOK_URL" -Value $WebhookUrl
$content = Set-Or-AddEnvValue -Text $content -Key "PNPI_ALERT_OVERDUE_DOSSIERS_THRESHOLD" -Value "$OverdueThreshold"
$content = Set-Or-AddEnvValue -Text $content -Key "PNPI_ALERT_UNREAD_CRITICAL_THRESHOLD" -Value "$UnreadCriticalThreshold"
$content = Set-Or-AddEnvValue -Text $content -Key "PNPI_ALERT_ERROR_RATE_THRESHOLD" -Value "$ErrorRateThreshold"

Set-Content -Path $envFile -Value $content -Encoding UTF8

Write-Host "Ops alerts configured in backend/.env"
Write-Host "  PNPI_ALERT_WEBHOOK_URL=$WebhookUrl"
Write-Host "  PNPI_ALERT_OVERDUE_DOSSIERS_THRESHOLD=$OverdueThreshold"
Write-Host "  PNPI_ALERT_UNREAD_CRITICAL_THRESHOLD=$UnreadCriticalThreshold"
Write-Host "  PNPI_ALERT_ERROR_RATE_THRESHOLD=$ErrorRateThreshold"

if ($RunCheck) {
  Write-Host "Running ops alert check..."
  & powershell -ExecutionPolicy Bypass -File (Join-Path $root "scripts/check_ops_alerts.ps1")
}
