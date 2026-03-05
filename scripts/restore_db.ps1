param(
  [string]$PgRestorePath = "pg_restore",
  [string]$DatabaseUrl = $env:PNPI_DATABASE_URL,
  [Parameter(Mandatory = $true)][string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

if (-not $DatabaseUrl) {
  throw "PNPI_DATABASE_URL is required."
}

Write-Host "Restoring backup $BackupFile to target database..."
& $PgRestorePath --clean --if-exists --no-owner --no-privileges --dbname="$DatabaseUrl" "$BackupFile"
Write-Host "Restore completed."
