#!/usr/bin/env bash
set -euo pipefail

# ─── Discord Bot Deployment Script ────────────────────────────────────────────
# Usage: ./scripts/deploy.sh [--pull] [--build] [--seed] [--commands]

PULL=false
BUILD=false
SEED=false
COMMANDS=false

for arg in "$@"; do
  case $arg in
    --pull) PULL=true ;;
    --build) BUILD=true ;;
    --seed) SEED=true ;;
    --commands) COMMANDS=true ;;
  esac
done

echo "======================================="
echo "  Discord Bot System Deployment"
echo "======================================="

# Check .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example to .env and fill in values."
  exit 1
fi

# Pull latest changes
if [ "$PULL" = true ]; then
  echo "[1/5] Pulling latest changes..."
  git pull origin main
fi

# Build Docker images
if [ "$BUILD" = true ]; then
  echo "[2/5] Building Docker images..."
  docker compose build --parallel
else
  echo "[2/5] Skipping build (use --build to rebuild)"
fi

# Start infrastructure (DB + Redis)
echo "[3/5] Starting infrastructure services..."
docker compose up -d postgres redis lavalink
echo "Waiting for services to be healthy..."
sleep 5

# Run database migrations
echo "[4/5] Running database migrations..."
docker compose run --rm api sh -c "prisma migrate deploy --schema=/app/prisma/schema.prisma"

# Seed database
if [ "$SEED" = true ]; then
  echo "    Seeding database..."
  docker compose run --rm api sh -c "tsx /app/prisma/seed.ts"
fi

# Start all services
echo "[5/5] Starting all services..."
docker compose up -d

# Deploy slash commands
if [ "$COMMANDS" = true ]; then
  echo "[+] Deploying Discord slash commands..."
  docker compose exec bot node packages/bot/dist/scripts/deployCommands.js
fi

echo ""
echo "======================================="
echo "  Deployment Complete!"
echo "======================================="
echo ""
echo "  Web Portal:    http://localhost:3000"
echo "  API Server:    http://localhost:4000"
echo "  API Health:    http://localhost:4000/health"
echo ""
echo "  View logs: docker compose logs -f"
echo "  Stop:      docker compose down"
echo ""
