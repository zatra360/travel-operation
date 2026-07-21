# Dev startup — starts everything you need and never leaves you with a broken connection
Write-Host "Travel Operation — Dev Mode" -ForegroundColor Cyan

# 1. Ensure .env exists
if (-not (Test-Path "apps/api/.env")) {
  if (Test-Path "apps/api/.env.example") {
    Copy-Item "apps/api/.env.example" "apps/api/.env"
    Write-Host "  Created apps/api/.env (copy from .env.example)" -ForegroundColor Green
  } else {
    Write-Host "  WARNING: No apps/api/.env or .env.example found" -ForegroundColor Yellow
  }
}
if (-not (Test-Path "apps/web/.env.local")) {
  if (Test-Path "apps/web/.env.example") {
    Copy-Item "apps/web/.env.example" "apps/web/.env.local"
    Write-Host "  Created apps/web/.env.local" -ForegroundColor Green
  }
}

# 2. Ensure PostgreSQL is running
$pgRunning = docker ps --filter "name=postgres" --filter "status=running" --format "{{.Names}}" 2>$null
if (-not $pgRunning) {
  Write-Host "  Starting Docker services..." -ForegroundColor Yellow
  docker compose -f infra/docker/docker-compose.yml up -d 2>&1 | Out-Null
  Write-Host "  Waiting for PostgreSQL..." -ForegroundColor Yellow
  Start-Sleep -Seconds 3
}

# 3. Generate Prisma client and seed if needed
Write-Host "  Generating Prisma client..." -ForegroundColor Yellow
pnpm db:generate 2>&1 | Out-Null

# 4. Start dev servers (API + Web)
Write-Host "  Starting API (port 3900) + Web (port 3901)..." -ForegroundColor Green
Write-Host ""
pnpm dev
