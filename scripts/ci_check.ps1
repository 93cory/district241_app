param(
  [switch]$SkipBackend = $false,
  [switch]$SkipFrontend = $false,
  [switch]$SkipFlutter = $false,
  [switch]$RunFrontendE2E = $false
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "PNPI CI check started..."

if (-not $SkipBackend) {
  Write-Host "1/3 Backend tests"
  & "$root\backend\.venv312\Scripts\python.exe" -m pytest "$root\backend\tests" -q
}

if (-not $SkipFrontend) {
  Write-Host "2/3 Frontend lint"
  Push-Location "$root\frontend"
  try {
    npm run lint
  } finally {
    Pop-Location
  }
}

if (-not $SkipFlutter) {
  Write-Host "3/3 Flutter analyze"
  Push-Location $root
  try {
    flutter analyze
  } finally {
    Pop-Location
  }
}

if ($RunFrontendE2E) {
  Write-Host "4/4 Frontend E2E (Playwright)"
  Push-Location "$root\frontend"
  try {
    npm run test:e2e
  } finally {
    Pop-Location
  }
}

Write-Host "PNPI CI check completed successfully."
