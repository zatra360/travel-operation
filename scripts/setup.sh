#!/bin/bash
# Quick setup script for Travel Operation

set -e

echo "🚀 Setting up Travel Operation..."

# 1. Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Installing pnpm..."; npm install -g pnpm; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required. Install from https://docker.com"; exit 1; }

# 2. Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# 3. Setup environment files
echo "🔧 Setting up environment..."
[ ! -f apps/api/.env ] && cp apps/api/.env.example apps/api/.env && echo "  Created apps/api/.env"
[ ! -f apps/web/.env ] && cp apps/web/.env.example apps/web/.env && echo "  Created apps/web/.env"

# 4. Start Docker services
echo "🐳 Starting Docker services..."
docker compose -f infra/docker/docker-compose.yml up -d
echo "  Waiting for PostgreSQL to be ready..."
sleep 3

# 5. Generate Prisma client
echo "🗄️  Generating Prisma client..."
pnpm db:generate

# 6. Run migrations
echo "📊 Running database migrations..."
pnpm db:migrate

# 7. Seed database
echo "🌱 Seeding database..."
pnpm db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "   Start development servers:"
echo "   pnpm dev"
echo ""
echo "   API:      http://localhost:3900"
echo "   Web:      http://localhost:3901"
echo "   Swagger:  http://localhost:3900/api/v1/docs"
echo ""
echo "   Login:    admin@travelo.com / Admin@123"
