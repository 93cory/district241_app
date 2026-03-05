param(
  [string]$PgDumpPath = "pg_dump",
  [string]$DatabaseUrl = $env:PNPI_DATABASE_URL,
  [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
  throw "PNPI_DATABASE_URL is required."
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outfile = Join-Path $OutputDir "pnpi-$timestamp.dump"

Write-Host "Creating backup: $outfile"
& $PgDumpPath --format=custom --file="$outfile" "$DatabaseUrl"

Write-Host "Backup completed: $outfile"
