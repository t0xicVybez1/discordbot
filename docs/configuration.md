# Configuration Guide

This guide walks through every variable in `.env` and exactly where to find each value.

---

## Step 1 — Discord Application

All Discord-related variables come from the **Discord Developer Portal**.

### 1.1 Create an Application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** (top right)
3. Give it a name (e.g. `MyBot`) and click **Create**

You are now on the application's **General Information** page.

---

### `DISCORD_CLIENT_ID`
### `NEXT_PUBLIC_DISCORD_CLIENT_ID`

Both of these are the same value — your application's ID.

**Where to find it:**
- Developer Portal → your app → **General Information**
- Copy the **Application ID** field

```env
DISCORD_CLIENT_ID=1234567890123456789
NEXT_PUBLIC_DISCORD_CLIENT_ID=1234567890123456789
```

---

### `DISCORD_CLIENT_SECRET`

**Where to find it:**
- Developer Portal → your app → **OAuth2** → **General**
- Under **Client Secret**, click **Reset Secret**
- Copy the secret immediately — it is only shown once

```env
DISCORD_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

---

### `DISCORD_TOKEN`

**Where to find it:**
- Developer Portal → your app → **Bot** (left sidebar)
- If you haven't created a bot yet, click **Add Bot**
- Click **Reset Token** → confirm → copy the token

> **Keep this secret.** Anyone with this token controls your bot.

```env
DISCORD_TOKEN=paste_your_bot_token_here
```

**Required Bot Settings (on the same Bot page):**

Scroll down to **Privileged Gateway Intents** and enable all three:
- ✅ Presence Intent
- ✅ Server Members Intent
- ✅ Message Content Intent

---

### `DISCORD_REDIRECT_URI`

This is the URL Discord sends users back to after OAuth2 login.

**You must register it in the portal:**
- Developer Portal → your app → **OAuth2** → **General**
- Under **Redirects**, click **Add Redirect**
- For local dev, add: `http://localhost:3000/auth/callback`
- For production, add: `https://yourdomain.com/auth/callback`

```env
# Development
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback

# Production
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/callback
```

---

### `DISCORD_GUILD_ID` *(Optional)*

The ID of your **development Discord server**. When set, slash commands are deployed instantly to this server instead of globally (global deployment takes up to 1 hour).

**How to get a Server ID:**
1. Open Discord
2. Go to **Settings → Advanced → Enable Developer Mode**
3. Right-click your server name in the sidebar → **Copy Server ID**

```env
DISCORD_GUILD_ID=987654321098765432
```

Leave blank to deploy commands globally:
```env
DISCORD_GUILD_ID=
```

---

### `BOT_OWNER_IDS`

Your personal Discord user ID(s). Owners bypass all permission checks and can use owner-only commands.

**How to get your User ID:**
1. Enable Developer Mode (Settings → Advanced → Developer Mode)
2. Click on your own profile picture → **Copy User ID**

For multiple owners, separate with commas:
```env
BOT_OWNER_IDS=111111111111111111,222222222222222222
```

---

### `STAFF_GUILD_ID` *(Optional)*

The ID of the Discord server used for internal staff. Staff portal access is granted to members of this server with specific roles. Get the ID the same way as `DISCORD_GUILD_ID`.

```env
STAFF_GUILD_ID=987654321098765432
```

---

## Step 2 — Database

The default `DATABASE_URL` is pre-configured for the Docker container defined in `docker-compose.yml`. **You do not need to change it for local development.**

```env
DATABASE_URL=postgresql://discordbot:secret@localhost:5432/discordbot
```

| Part | Value | Meaning |
|------|-------|---------|
| `discordbot` | username | Postgres user (set in docker-compose) |
| `secret` | password | Postgres password (set in docker-compose) |
| `localhost` | host | DB host |
| `5432` | port | Default Postgres port |
| `discordbot` | database | Database name |

**For production**, change the password in both `docker-compose.yml` and `DATABASE_URL`:
```env
DATABASE_URL=postgresql://discordbot:STRONG_PASSWORD@localhost:5432/discordbot
```

---

## Step 3 — Redis

Also pre-configured for the Docker container. No changes needed for local development.

```env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
```

For production with a password, set `REDIS_PASSWORD` and update the URL:
```env
REDIS_URL=redis://:STRONG_PASSWORD@localhost:6379
REDIS_PASSWORD=STRONG_PASSWORD
```

---

## Step 4 — API Server

### `API_PORT`

The port the Fastify API listens on. Default is `4000`. Only change this if port 4000 is already in use.

```env
API_PORT=4000
```

### `API_SECRET`

A random string used to sign JWT access and refresh tokens. **Must be at least 32 characters.**

Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# or
openssl rand -hex 32
```

```env
API_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

---

## Step 5 — Web Portal

### `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`

URLs the browser uses to talk to the API. For local development these stay as-is.

```env
# Development
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Production (replace with your domain)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

### `NEXTAUTH_SECRET`

A separate random secret for the Next.js session layer. Generate it the same way as `API_SECRET`:

```bash
openssl rand -hex 32
```

```env
NEXTAUTH_SECRET=f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5
```

### `NEXTAUTH_URL`

The public URL of the web portal. Must match exactly.

```env
# Development
NEXTAUTH_URL=http://localhost:3000

# Production
NEXTAUTH_URL=https://yourdomain.com
```

---

## Step 6 — Music (Optional)

Lavalink is already included as a Docker service. The defaults below match the `docker-compose.yml` and `docker/lavalink/application.yml` config — no changes needed unless you run your own Lavalink server.

```env
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
```

---

## Step 7 — Environment & Logging

```env
NODE_ENV=development   # Change to "production" for prod deploys
LOG_LEVEL=info         # Options: fatal, error, warn, info, debug, trace
```

---

## Complete Example (.env for local dev)

```env
# Discord
DISCORD_TOKEN=paste_your_bot_token_here
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz123456
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback
DISCORD_GUILD_ID=987654321098765432
BOT_OWNER_IDS=111111111111111111

# Database
DATABASE_URL=postgresql://discordbot:secret@localhost:5432/discordbot

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# API
API_PORT=4000
API_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2

# Web Portal
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_DISCORD_CLIENT_ID=1234567890123456789
NEXTAUTH_SECRET=f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5
NEXTAUTH_URL=http://localhost:3000

# Music (optional)
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

---

## Quick Reference

| Variable | Required | Source |
|----------|----------|--------|
| `DISCORD_TOKEN` | ✅ | Developer Portal → Bot → Reset Token |
| `DISCORD_CLIENT_ID` | ✅ | Developer Portal → General Information → Application ID |
| `DISCORD_CLIENT_SECRET` | ✅ | Developer Portal → OAuth2 → General → Reset Secret |
| `DISCORD_REDIRECT_URI` | ✅ | Set by you, must be registered in Developer Portal |
| `DISCORD_GUILD_ID` | — | Right-click server in Discord → Copy Server ID |
| `BOT_OWNER_IDS` | ✅ | Right-click your profile in Discord → Copy User ID |
| `STAFF_GUILD_ID` | — | Right-click server in Discord → Copy Server ID |
| `DATABASE_URL` | ✅ | Pre-configured for Docker, no change needed |
| `REDIS_URL` | ✅ | Pre-configured for Docker, no change needed |
| `API_SECRET` | ✅ | Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:4000` for dev |
| `NEXT_PUBLIC_WS_URL` | ✅ | `ws://localhost:4000` for dev |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | ✅ | Same as `DISCORD_CLIENT_ID` |
| `NEXTAUTH_SECRET` | ✅ | Generate: `openssl rand -hex 32` |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` for dev |
| `LAVALINK_PASSWORD` | — | Default: `youshallnotpass` (matches docker-compose) |
