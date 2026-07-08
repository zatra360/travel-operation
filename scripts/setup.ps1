# Quick setup script for Travel Operation (PowerShell)

Write-Host "🚀 Setting up Travel Operation..." -ForegroundColor Cyan

# 1. Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) { Write-Host "Node.js is required. Install from https://nodejs.org" -ForegroundColor Red; exit 1 }

$pnpmCheck = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCheck) { Write-Host "Installing pnpm..."; npm install -g pnpm }

$dockerCheck = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCheck) { Write-Host "Docker is required for local database" -ForegroundColor Yellow }

# 2. Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install

# 3. Setup environment files
Write-Host "🔧 Setting up environment..." -ForegroundColor Yellow
if (-not (Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env; Write-Host "  Created apps/api/.env" }
if (-not (Test-Path apps/web/.env)) { Copy-Item apps/web/.env.example apps/web/.env; Write-Host "  Created apps/web/.env" }

# 4. Start Docker services
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
docker compose -f infra/docker/docker-compose.yml up -d
Write-Host "  Waiting for PostgreSQL..."
Start-Sleep -Seconds 3

# 5. Generate Prisma client
Write-Host "🗄️  Generating Prisma client..." -ForegroundColor Yellow
pnpm db:generate

# 6. Run migrations
Write-Host "📊 Running database migrations..." -ForegroundColor Yellow
pnpm db:migrate

# 7. Seed database
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
pnpm db:seed

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "   Start development servers:" -ForegroundColor Cyan
Write-Host "   pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "   API:      http://localhost:3900"
Write-Host "   Web:      http://localhost:3901"
Write-Host "   Swagger:  http://localhost:3900/api/v1/docs"
Write-Host ""
Write-Host "   Login:    admin@travelo.com / Admin@123"
