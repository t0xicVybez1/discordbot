# Addon Development Guide

## Overview

The addon system allows you to extend the Discord bot with custom commands, event handlers,
web portal pages, and persistent storage — all without modifying the core bot code.

## Creating Your First Addon

### 1. Scaffold the addon

```bash
mkdir addons/my-addon
cd addons/my-addon
```

### 2. package.json

```json
{
  "name": "my-addon",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@discordbot/addon-sdk": "workspace:*",
    "@discordbot/shared": "workspace:*"
  },
  "peerDependencies": {
    "discord.js": "^14.0.0"
  },
  "devDependencies": {
    "discord.js": "^14.18.0",
    "typescript": "^5.7.0"
  }
}
```

### 3. tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 4. src/index.ts — Full Example

```typescript
import { defineAddon } from '@discordbot/addon-sdk';
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '@discordbot/shared';

export default defineAddon({
  // ─── Manifest ────────────────────────────────────────
  manifest: {
    name: 'my-addon',                     // Unique package name
    displayName: 'My Addon',             // Shown in the portal
    version: '1.0.0',
    description: 'An example addon',
    author: 'Your Name',
    homepage: 'https://github.com/you/my-addon',

    // Commands this addon registers
    commands: ['hello'],

    // Discord events this addon listens to
    events: ['guildMemberAdd'],

    // Settings shown in the guild admin portal
    settings: [
      {
        key: 'message',
        type: 'string',           // string | number | boolean | channel | role | color | select
        label: 'Greeting Message',
        description: 'Message sent on /hello',
        default: 'Hello, World!',
        required: false,
      },
      {
        key: 'maxUses',
        type: 'number',
        label: 'Max Daily Uses',
        default: 10,
        min: 1,
        max: 100,
      },
    ],
  },

  // ─── Commands ─────────────────────────────────────────
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Say hello to the server'),
      async execute(interaction, ctx) {
        // Get guild-specific setting (falls back to default)
        const message = await ctx.getSetting<string>(
          interaction.guildId!,
          'message',
          'Hello, World!'
        );

        const embed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setDescription(message);

        await interaction.reply({ embeds: [embed] });
      },
    },
  ],

  // ─── Event Handlers ───────────────────────────────────
  events: [
    {
      event: 'guildMemberAdd',
      async handler(ctx, member) {
        const message = await ctx.getSetting<string>(
          member.guild.id,
          'message',
          'Welcome!'
        );
        ctx.logger.info(`New member in ${member.guild.name}: ${member.user.tag}`);
      },
    },
  ],

  // ─── Lifecycle Hooks ──────────────────────────────────
  hooks: {
    async onLoad(ctx) {
      ctx.logger.info(`${ctx.addonName} loaded`);
    },

    async onUnload(ctx) {
      ctx.logger.info(`${ctx.addonName} unloaded`);
    },

    async onSettingsUpdate(ctx, guildId, settings) {
      ctx.logger.info(`Settings updated for ${guildId}`, settings);
    },

    async onGuildInstall(ctx, guildId) {
      // Initialize default data for this guild
      await ctx.storage.set('installDate', Date.now(), guildId);
    },

    async onGuildUninstall(ctx, guildId) {
      // Cleanup guild data
      const keys = await ctx.storage.keys(guildId);
      for (const key of keys) {
        await ctx.storage.delete(key, guildId);
      }
    },
  },
});
```

---

## AddonContext API Reference

The `ctx` object is injected into every command, event handler, and lifecycle hook.

### Discord Client

```typescript
ctx.client  // discord.js Client instance
ctx.getGuild(guildId)  // Shortcut for ctx.client.guilds.cache.get(guildId)
```

### Logger

```typescript
ctx.logger.info('Message', ...args)
ctx.logger.warn('Message', ...args)
ctx.logger.error('Message', ...args)
ctx.logger.debug('Message', ...args)
```

### Settings

```typescript
// Get all settings for a guild
const settings = await ctx.getSettings(guildId);

// Get a specific setting with a default
const value = await ctx.getSetting<string>(guildId, 'key', 'default');
```

### Storage (Persistent Key-Value)

```typescript
// Guild-scoped data (most common)
await ctx.storage.set('key', value, guildId);
await ctx.storage.get<MyType>('key', guildId);
await ctx.storage.delete('key', guildId);
await ctx.storage.keys(guildId);

// Global data (not guild-scoped)
await ctx.storage.set('global-key', value);
await ctx.storage.get('global-key');
```

### Event Bus

```typescript
// Emit a custom event
await ctx.events.emit('my:custom-event', { payload: 'data' });

// Subscribe (within onLoad hook)
const unsub = ctx.events.on('my:custom-event', async (data) => {
  console.log(data.payload);
});

// Unsubscribe (in onUnload)
unsub();
```

---

## Setting Types

| Type | UI Component | Value Type |
|------|-------------|------------|
| `string` | Text input | `string` |
| `number` | Number input | `number` |
| `boolean` | Toggle | `boolean` |
| `channel` | Channel selector | `string` (channel ID) |
| `role` | Role selector | `string` (role ID) |
| `color` | Color picker | `string` (#hex) |
| `select` | Dropdown | `string` |

---

## Registering Your Addon

### Development (auto-loaded from `/addons`)
Build your addon with `pnpm build`, and it's automatically loaded next time the bot starts.

### Production (register in database)
```bash
# Via Staff Portal → Addons → Register Addon
# Or via API:
curl -X POST http://localhost:4000/admin/addons \
  -H "Authorization: Bearer <staff-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-addon",
    "displayName": "My Addon",
    "version": "1.0.0",
    "description": "Description",
    "author": "Author Name",
    "manifest": { "commands": ["hello"], "events": [], "settings": [] }
  }'
```

---

## Best Practices

1. **Always check guildId**: Many interactions can come from DMs. Check `interaction.guildId` before using guild-specific features.

2. **Handle errors gracefully**: Wrap storage and API calls in try/catch.

3. **Clean up in onUnload**: Remove timers, close connections, clear in-memory state.

4. **Use settings for configurability**: Don't hardcode values that servers might want to customize.

5. **Log meaningful events**: Use `ctx.logger.info` for important events, `ctx.logger.debug` for verbose output.

6. **Namespace your storage keys**: Use `feature:userId` format to avoid collisions.

```typescript
// Good
await ctx.storage.set(`economy:balance:${userId}`, balance, guildId);

// Bad
await ctx.storage.set(userId, balance, guildId);
```
