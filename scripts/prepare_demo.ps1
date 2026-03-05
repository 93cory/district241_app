param(
  [string]$BackendDir = "backend"
)

$ErrorActionPreference = "Stop"

Write-Host "Preparing PNPI demo scenario..."

Push-Location $BackendDir
try {
  .\.venv312\Scripts\python.exe -m alembic -c alembic.ini upgrade head
  .\.venv312\Scripts\python.exe scripts\load_demo_scenario.py
} finally {
  Pop-Location
}

Write-Host "Demo data ready."
Write-Host "Next steps:"
Write-Host "1) Start backend: backend\.venv312\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload"
Write-Host "2) Start frontend: cd frontend; npm run dev"
Write-Host "3) Open briefing page: http://localhost:3000/briefing"

