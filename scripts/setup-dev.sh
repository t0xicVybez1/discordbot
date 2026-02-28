#!/usr/bin/env bash
set -euo pipefail

echo "Setting up development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required"; exit 1; }

# Copy .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — fill in your tokens!"
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build shared workspace packages (required before running bot/api)
echo "Building shared packages..."
pnpm build:deps

# Start infrastructure
echo "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis lavalink

echo "Waiting for database to be ready..."
for i in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -U discordbot -q 2>/dev/null && break
  sleep 1
done

# Generate Prisma client
echo "Generating Prisma client..."
pnpm db:generate

# Push schema (for development)
echo "Pushing database schema..."
pnpm db:push

# Seed
echo "Seeding database..."
pnpm db:seed

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your Discord bot token and client credentials"
echo "  2. Run: pnpm deploy:commands   (deploy slash commands)"
echo "  3. Run: pnpm dev               (start all services)"
echo ""
