#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── Root check ───────────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  error "Please run as root: sudo bash scripts/install.sh"
fi

REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(eval echo "~$REAL_USER")

echo ""
echo "  Discord Bot — Installer"
echo "  Installing for user: $REAL_USER"
echo ""

# ─── OS Detection ─────────────────────────────────────────────────────────────
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  error "Cannot detect OS. Only Debian/Ubuntu are supported."
fi

case "$OS" in
  ubuntu|debian|linuxmint|pop) PKG="apt-get" ;;
  *) error "Unsupported OS: $OS. Supported: Ubuntu, Debian." ;;
esac

# ─── System packages ──────────────────────────────────────────────────────────
info "Updating package lists..."
apt-get update -qq

info "Installing base dependencies..."
apt-get install -y -qq curl gnupg ca-certificates lsb-release git

# ─── Node.js 20 ───────────────────────────────────────────────────────────────
if command -v node >/dev/null 2>&1 && node -e "process.exit(parseInt(process.version.slice(1)) >= 20 ? 0 : 1)" 2>/dev/null; then
  success "Node.js $(node --version) already installed"
else
  info "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs
  success "Node.js $(node --version) installed"
fi

# ─── pnpm ─────────────────────────────────────────────────────────────────────
if command -v pnpm >/dev/null 2>&1; then
  success "pnpm $(pnpm --version) already installed"
else
  info "Installing pnpm..."
  npm install -g pnpm --quiet
  success "pnpm $(pnpm --version) installed"
fi

# ─── Docker ───────────────────────────────────────────────────────────────────
if command -v docker >/dev/null 2>&1; then
  success "Docker $(docker --version | awk '{print $3}' | tr -d ',') already installed"
else
  info "Installing Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/$OS/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/$OS $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker --quiet
  systemctl start docker
  success "Docker $(docker --version | awk '{print $3}' | tr -d ',') installed"
fi

# ─── Docker group ─────────────────────────────────────────────────────────────
if ! groups "$REAL_USER" | grep -q docker; then
  info "Adding $REAL_USER to docker group..."
  usermod -aG docker "$REAL_USER"
  success "$REAL_USER added to docker group"
  DOCKER_GROUP_ADDED=true
else
  DOCKER_GROUP_ADDED=false
fi

# ─── Docker Compose v2 check ──────────────────────────────────────────────────
if ! docker compose version >/dev/null 2>&1; then
  info "Installing Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
fi
success "Docker Compose $(docker compose version --short) ready"

# ─── Project setup (run as real user) ─────────────────────────────────────────
info "Running project setup as $REAL_USER..."

sudo -u "$REAL_USER" bash <<SETUP
set -euo pipefail

cd "$REAL_HOME/discordbot" 2>/dev/null || cd "$(pwd)"

# .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}[WARN]${NC}  Created .env — edit it with your tokens before starting!"
else
  echo -e "${GREEN}[OK]${NC}    .env already exists"
fi

# Install dependencies
echo -e "${BLUE}[INFO]${NC}  Installing npm dependencies..."
pnpm install --silent

# Start infra
echo -e "${BLUE}[INFO]${NC}  Starting PostgreSQL, Redis, Lavalink..."
docker compose up -d postgres redis lavalink

echo -e "${BLUE}[INFO]${NC}  Waiting for database to be ready..."
for i in \$(seq 1 15); do
  if docker compose exec -T postgres pg_isready -U discordbot -q 2>/dev/null; then
    break
  fi
  sleep 1
done

# Prisma
echo -e "${BLUE}[INFO]${NC}  Generating Prisma client..."
pnpm db:generate --silent 2>/dev/null || pnpm db:generate

echo -e "${BLUE}[INFO]${NC}  Pushing database schema..."
pnpm db:push

echo -e "${BLUE}[INFO]${NC}  Seeding database..."
pnpm db:seed
SETUP

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Next steps:"
echo ""
echo "  1. Edit .env with your credentials:"
echo "     nano .env"
echo ""
echo "  2. Deploy slash commands:"
echo "     pnpm deploy:commands"
echo ""
echo "  3. Start all services:"
echo "     pnpm dev"
echo ""

if [ "$DOCKER_GROUP_ADDED" = true ]; then
  echo -e "${YELLOW}  NOTE: Log out and back in (or run 'newgrp docker')${NC}"
  echo -e "${YELLOW}  so your user can run Docker without sudo.${NC}"
  echo ""
fi
