param(
  [string]$PythonVersion = "3.12",
  [string]$VenvPath = "backend/.venv312",
  [switch]$RunMigrations = $true,
  [switch]$SeedData = $true
)

$ErrorActionPreference = "Stop"

Write-Host "Creating virtual environment at $VenvPath using Python $PythonVersion..."
py -$PythonVersion -m venv $VenvPath

$pythonExe = (Resolve-Path (Join-Path $VenvPath "Scripts/python.exe")).Path

Write-Host "Upgrading pip..."
& $pythonExe -m pip install --upgrade pip

Write-Host "Installing backend requirements..."
& $pythonExe -m pip install -r backend/requirements.txt

if ($RunMigrations) {
  Write-Host "Applying Alembic migrations..."
  Push-Location backend
  try {
    & $pythonExe -m alembic -c alembic.ini upgrade head
  } finally {
    Pop-Location
  }
}

if ($SeedData) {
  Write-Host "Seeding PNPI demo data..."
  & $pythonExe backend/scripts/seed_db.py
}

Write-Host "Backend Python environment is ready."
Write-Host "Start API with:"
Write-Host "$VenvPath\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload"
