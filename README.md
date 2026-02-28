# Discord Bot System

A production-ready, multi-purpose Discord bot system with a web dashboard, addon marketplace, and real-time settings.

## Architecture

```
discordbot/
├── packages/
│   ├── bot/          # Discord.js v14 bot (TypeScript)
│   ├── api/          # Fastify REST API + WebSocket gateway
│   ├── web/          # Next.js 14 dual web portal
│   ├── shared/       # Shared TypeScript types and utilities
│   └── addon-sdk/    # SDK for building addons/plugins
├── addons/
│   ├── example-greeting/   # Example greeting addon
│   └── example-economy/    # Example economy addon
├── prisma/
│   └── schema.prisma       # PostgreSQL database schema
├── docker/                 # Dockerfiles
├── scripts/                # Deployment scripts
└── docker-compose.yml
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Bot | Discord.js v14, TypeScript |
| API | Fastify, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis + ioredis |
| Queue | BullMQ |
| Frontend | Next.js 14, React, Tailwind CSS |
| Real-time | WebSocket (native WS via Fastify) |
| Auth | Discord OAuth2 + JWT |
| Music | play-dl + @discordjs/voice |
| Container | Docker + docker-compose |

---

## Quick Start (Development)

### Prerequisites
- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker + Docker Compose

### 1. Clone & Setup
```bash
git clone <your-repo>
cd discordbot

# Install dependencies & setup infrastructure
bash scripts/setup-dev.sh
```

### 2. Configure Environment
Edit `.env` with your credentials:

```bash
# Required
DISCORD_TOKEN=         # Bot token from Discord Developer Portal
DISCORD_CLIENT_ID=     # Application ID
DISCORD_CLIENT_SECRET= # OAuth2 client secret
API_SECRET=            # Random 32+ char string (JWT signing)
BOT_OWNER_IDS=         # Your Discord user ID

# Database & Redis are pre-configured for Docker
DATABASE_URL=postgresql://discordbot:secret@localhost:5432/discordbot
REDIS_URL=redis://localhost:6379
```

### 3. Deploy Slash Commands
```bash
pnpm deploy:commands
```

### 4. Start Development
```bash
pnpm dev
```

Services:
- **Web Portal**: http://localhost:3000
- **API**: http://localhost:4000
- **DB Studio**: `pnpm db:studio`

---

## Production Deployment

```bash
# Full Docker deployment
cp .env.example .env
# ... fill in .env ...

bash scripts/deploy.sh --build --seed --commands
```

Individual options:
```bash
--pull      # git pull before deploying
--build     # rebuild Docker images
--seed      # seed the database with example addons
--commands  # deploy Discord slash commands
```

### View logs:
```bash
docker compose logs -f bot    # Bot logs
docker compose logs -f api    # API logs
docker compose logs -f web    # Web logs
```

---

## Bot Commands

### Moderation
| Command | Description |
|---------|-------------|
| `/ban <user> [reason] [duration] [delete_messages]` | Ban a user |
| `/kick <user> [reason]` | Kick a member |
| `/mute <user> <duration> [reason]` | Timeout a member |
| `/warn <user> <reason>` | Warn a member |
| `/warnings <user>` | View user warnings |
| `/unban <user_id> [reason]` | Unban a user |
| `/case <number>` | Look up a moderation case |

### Leveling
| Command | Description |
|---------|-------------|
| `/rank [user]` | View your or someone's rank card |
| `/leaderboard [page]` | View XP leaderboard |

### Music
| Command | Description |
|---------|-------------|
| `/play <query>` | Play a song from YouTube/search |
| `/skip` | Skip the current song |
| `/stop` | Stop music and clear queue |
| `/queue` | View the queue |
| `/volume <1-100>` | Set playback volume |

### Utility
| Command | Description |
|---------|-------------|
| `/ping` | Check bot latency |
| `/serverinfo` | Server statistics |
| `/userinfo [user]` | User information |
| `/avatar [user]` | Get avatar |

---

## Web Portals

### Guild Admin Portal
Access at `/dashboard` — requires Discord OAuth2 login.

- Only shows servers where you have Administrator permission
- Real-time settings (changes apply instantly to the bot without restart)
- Full feature configuration: moderation, auto-mod, leveling, welcome, music, reaction roles
- Addon marketplace for installing community plugins
- Moderation case viewer and warning management
- Audit log viewer with filtering

### Staff Portal
Access at `/staff` — requires Staff or Bot Owner role.

- System-wide analytics dashboard
- Browse all guilds using the bot
- Manage portal user permissions (grant/revoke staff)
- Addon registry management (register, enable, disable, verify)
- System log viewer with full filtering
- Prometheus metrics and memory usage charts

---

## Real-time Settings

Settings changes in the web portal take effect **immediately** without restarting the bot:

1. Portal → PATCH `/guilds/:guildId/settings`
2. API invalidates Redis cache via `REDIS_KEYS.GUILD_SETTINGS`
3. API publishes `settings:reload` event to Redis pub/sub
4. Bot subscribes to Redis, invalidates its local cache
5. Next command invocation fetches fresh settings from DB

---

## Auto-Mod Features

Configure in Dashboard → Auto-Mod:

- **Anti-Spam**: Configurable message threshold per time window
- **Word Filter**: Blocked word list with configurable action (delete/warn/mute)
- **Link Filter**: Block all links except whitelisted domains
- **Anti-Mention**: Maximum mentions per message
- **Caps Filter**: Minimum caps percentage threshold
- **Anti-Raid**: Join rate threshold with lockdown action
- **Exempt Roles/Channels**: Bypass auto-mod for specific roles/channels

---

## Addon Development Guide

### Quick Start

```bash
# Create your addon folder
mkdir addons/my-addon
cd addons/my-addon
```

Create `package.json`:
```json
{
  "name": "my-addon",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": { "build": "tsc" },
  "dependencies": {
    "@discordbot/addon-sdk": "workspace:*"
  },
  "peerDependencies": { "discord.js": "^14.0.0" }
}
```

Create `src/index.ts`:
```typescript
import { defineAddon } from '@discordbot/addon-sdk';
import { SlashCommandBuilder } from 'discord.js';

export default defineAddon({
  manifest: {
    name: 'my-addon',
    displayName: 'My Addon',
    version: '1.0.0',
    description: 'Does something awesome.',
    author: 'Your Name',
    commands: ['hello'],
    settings: [
      {
        key: 'message',
        type: 'string',
        label: 'Hello Message',
        default: 'Hello, World!',
      },
    ],
  },

  commands: [
    {
      data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Say hello'),
      async execute(interaction, ctx) {
        const message = await ctx.getSetting(
          interaction.guildId!,
          'message',
          'Hello, World!'
        );
        await interaction.reply({ content: message });
      },
    },
  ],

  hooks: {
    async onLoad(ctx) {
      ctx.logger.info('My addon loaded!');
    },
  },
});
```

### AddonContext API

```typescript
ctx.client          // Discord.js Client
ctx.logger          // { info, warn, error, debug }
ctx.events          // AddonEventBus for custom events
ctx.storage         // Per-addon, per-guild key-value store

// Get guild-specific settings
await ctx.getSettings(guildId)
await ctx.getSetting(guildId, 'key', defaultValue)

// Storage operations
await ctx.storage.get('key', guildId?)
await ctx.storage.set('key', value, guildId?)
await ctx.storage.delete('key', guildId?)
await ctx.storage.keys(guildId?)
```

### Lifecycle Hooks

```typescript
hooks: {
  onLoad(ctx)                                    // Addon loaded
  onUnload(ctx)                                  // Addon unloaded/disabled
  onSettingsUpdate(ctx, guildId, settings)       // Guild settings changed
  onGuildInstall(ctx, guildId)                   // Guild installed addon
  onGuildUninstall(ctx, guildId)                 // Guild uninstalled addon
}
```

### Event Bus

```typescript
// Emit custom events
ctx.events.emit('my:event', { data: 'value' });

// Subscribe to events
ctx.events.on('my:event', (data) => {
  console.log(data);
});
```

### Register in Database

```bash
# Use the Staff Portal → Addons → Register Addon
# Or via API:
curl -X POST http://localhost:4000/admin/addons \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "my-addon", "displayName": "My Addon", ... }'
```

---

## Database Schema Overview

| Table | Description |
|-------|-------------|
| `guilds` | Discord servers using the bot |
| `guild_settings` | Per-guild feature configuration |
| `automod_configs` | Auto-mod rules per guild |
| `welcome_configs` | Welcome/leave message config |
| `moderation_cases` | Full moderation case history |
| `warnings` | Member warnings |
| `user_levels` | XP and level data |
| `reaction_roles` | Reaction role mappings |
| `custom_commands` | Guild-specific text commands |
| `addons` | Registered addons |
| `guild_addons` | Per-guild addon installations |
| `addon_data` | Addon key-value storage |
| `portal_users` | Web portal users (Discord OAuth) |
| `user_sessions` | JWT refresh token tracking |
| `log_entries` | Audit log entries |
| `system_metrics` | Performance metrics |

---

## API Reference

Base URL: `http://localhost:4000`

### Authentication
```
GET  /auth/url              → Get Discord OAuth2 URL
POST /auth/callback         → Exchange code for tokens
POST /auth/refresh          → Refresh access token
POST /auth/logout           → Logout
GET  /auth/me               → Get current user
```

### Guilds
```
GET  /guilds                → List admin guilds
GET  /guilds/:id            → Get guild details
GET  /guilds/:id/analytics  → 24h analytics
GET  /guilds/:id/channels   → List channels
GET  /guilds/:id/roles      → List roles
```

### Settings (instant bot update)
```
GET   /guilds/:id/settings          → Get settings
PATCH /guilds/:id/settings          → Update settings
GET   /guilds/:id/settings/automod  → Get auto-mod config
PATCH /guilds/:id/settings/automod  → Update auto-mod config
GET   /guilds/:id/settings/welcome  → Get welcome config
PATCH /guilds/:id/settings/welcome  → Update welcome config
```

### Moderation
```
GET   /guilds/:id/cases             → List cases (paginated)
GET   /guilds/:id/cases/:num        → Get specific case
PATCH /guilds/:id/cases/:num        → Update case reason
GET   /guilds/:id/warnings          → List warnings
DELETE /guilds/:id/warnings/:id     → Clear warning
GET   /guilds/:id/logs              → View log entries
```

### Addons
```
GET    /addons                          → All available addons
GET    /guilds/:id/addons              → Guild's installed addons
POST   /guilds/:id/addons/:addonId     → Install addon
DELETE /guilds/:id/addons/:addonId     → Uninstall addon
GET    /guilds/:id/addons/:id/settings → Get addon settings
PATCH  /guilds/:id/addons/:id/settings → Update addon settings
```

### Staff (requires staff role)
```
GET   /admin/guilds     → All guilds (paginated, filterable)
GET   /admin/stats      → System statistics
GET   /admin/users      → Portal users
PATCH /admin/users/:id  → Update user permissions
GET   /admin/logs       → System-wide logs
GET   /admin/metrics    → Prometheus metrics
POST  /admin/addons     → Register new addon
PATCH /admin/addons/:id → Update addon
```

### WebSocket Gateway
```
ws://localhost:4000/ws

# Client messages:
{ type: 'auth', token: 'jwt...', guildIds: ['123', '456'] }
{ type: 'subscribe:guilds', guildIds: ['789'] }
{ type: 'ping' }

# Server events:
{ type: 'settings:updated', guildId, data }
{ type: 'moderation:action', guildId, data }
{ type: 'member:join', guildId, data }
{ type: 'member:leave', guildId, data }
{ type: 'level:up', guildId, data }
{ type: 'bot:stats', data }
{ type: 'log:entry', guildId, data }
```

---

## Environment Variables

See `.env.example` for the complete list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | ✅ | Bot token from Developer Portal |
| `DISCORD_CLIENT_ID` | ✅ | Application/Client ID |
| `DISCORD_CLIENT_SECRET` | ✅ | OAuth2 client secret |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `API_SECRET` | ✅ | JWT signing secret (32+ chars) |
| `REDIS_URL` | ✅ | Redis connection URL |
| `BOT_OWNER_IDS` | ✅ | Comma-separated owner Discord IDs |
| `DISCORD_REDIRECT_URI` | ✅ | OAuth2 callback URL |
| `LAVALINK_HOST` | - | Lavalink server host for music |
| `DISCORD_GUILD_ID` | - | Dev guild for instant command deploy |

---

## Security

- JWT access tokens expire in 15 minutes with refresh token rotation
- All API endpoints require authentication
- Guild admin routes verify Discord permissions in real-time
- Staff routes require explicit staff role assignment
- Rate limiting on all routes (100 req/min per user)
- CORS restricted to configured origin
- Helmet.js security headers in production
- SQL injection prevention via Prisma ORM
- Input validation on all endpoints

---

## License

MIT — See LICENSE for details.
