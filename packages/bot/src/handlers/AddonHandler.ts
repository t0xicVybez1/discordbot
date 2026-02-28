import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { BotClient } from '../client.js';
import type { BotCommand } from '../types.js';
import type { AddonDefinition } from '@discordbot/addon-sdk';
import { AddonContext } from '@discordbot/addon-sdk';
import { AddonEventBus } from '@discordbot/addon-sdk';
import { prisma } from '../database.js';
import { redis } from '../redis.js';
import { logger } from '../logger.js';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

class AddonStorage {
  constructor(private addonName: string) {}

  async get<T>(key: string, guildId?: string): Promise<T | null> {
    const record = await prisma.addonData.findUnique({
      where: {
        guildId_addonId_key: {
          guildId: guildId ?? '',
          addonId: this.addonName,
          key,
        },
      },
    });
    return record ? (record.value as T) : null;
  }

  async set<T>(key: string, value: T, guildId?: string): Promise<void> {
    await prisma.addonData.upsert({
      where: {
        guildId_addonId_key: {
          guildId: guildId ?? '',
          addonId: this.addonName,
          key,
        },
      },
      update: { value: value as object },
      create: {
        guildId,
        addonId: this.addonName,
        key,
        value: value as object,
      },
    });
  }

  async delete(key: string, guildId?: string): Promise<void> {
    await prisma.addonData.deleteMany({
      where: { guildId: guildId ?? '', addonId: this.addonName, key },
    });
  }

  async keys(guildId?: string): Promise<string[]> {
    const records = await prisma.addonData.findMany({
      where: { guildId: guildId ?? '', addonId: this.addonName },
      select: { key: true },
    });
    return records.map((r) => r.key);
  }
}

class AddonLogger {
  constructor(private addonName: string) {}

  info(message: string, ...args: unknown[]) {
    logger.info({ addon: this.addonName }, message, ...args);
  }
  warn(message: string, ...args: unknown[]) {
    logger.warn({ addon: this.addonName }, message, ...args);
  }
  error(message: string, ...args: unknown[]) {
    logger.error({ addon: this.addonName }, message, ...args);
  }
  debug(message: string, ...args: unknown[]) {
    logger.debug({ addon: this.addonName }, message, ...args);
  }
}

interface LoadedAddon {
  definition: AddonDefinition;
  context: AddonContext;
  eventBus: AddonEventBus;
  unsubscribers: Array<() => void>;
}

export class AddonHandler {
  private client: BotClient;
  private loadedAddons = new Map<string, LoadedAddon>();
  private sharedEventBus = new AddonEventBus();

  constructor(client: BotClient) {
    this.client = client;
  }

  async loadAddons(): Promise<void> {
    const addonsDir = resolve(__dirname, '..', '..', '..', '..', 'addons');

    if (!existsSync(addonsDir)) {
      logger.info('No addons directory found, skipping');
      return;
    }

    const addonFolders = readdirSync(addonsDir).filter((dir) =>
      statSync(join(addonsDir, dir)).isDirectory()
    );

    for (const folder of addonFolders) {
      await this.loadAddon(join(addonsDir, folder));
    }

    logger.info(`Loaded ${this.loadedAddons.size} addons`);
  }

  async loadAddon(addonPath: string): Promise<void> {
    try {
      const indexPath = join(addonPath, 'dist', 'index.js');
      const fallbackPath = join(addonPath, 'src', 'index.ts');
      const entryPath = existsSync(indexPath) ? indexPath : fallbackPath;

      const fileUrl = pathToFileURL(entryPath).href;
      const module = await import(fileUrl);
      const definition: AddonDefinition = module.default;

      if (!definition?.manifest?.name) {
        logger.warn(`Addon at ${addonPath} has no manifest`);
        return;
      }

      const { name } = definition.manifest;

      // Check if enabled in DB
      const dbAddon = await prisma.addon.findUnique({ where: { name } });
      if (dbAddon && !dbAddon.enabled) {
        logger.info(`Addon ${name} is disabled, skipping`);
        return;
      }

      await this.activateAddon(definition);
    } catch (err) {
      logger.error({ err, addonPath }, 'Failed to load addon');
    }
  }

  async activateAddon(definition: AddonDefinition): Promise<void> {
    const { name } = definition.manifest;
    const eventBus = new AddonEventBus();

    const context = new AddonContext({
      addonName: name,
      client: this.client,
      storage: new AddonStorage(name),
      logger: new AddonLogger(name),
      events: eventBus,
      getSettings: async (guildId: string) => {
        const guildAddon = await prisma.guildAddon.findUnique({
          where: { guildId_addonId: { guildId, addonId: name } },
        });
        return (guildAddon?.settings as Record<string, unknown>) ?? {};
      },
    });

    const unsubscribers: Array<() => void> = [];

    // Register commands
    if (definition.commands) {
      for (const cmd of definition.commands) {
        const botCommand: BotCommand = {
          data: cmd.data as BotCommand['data'],
          category: `addon:${name}`,
          execute: (interaction, _client) => cmd.execute(interaction, context),
          autocomplete: cmd.autocomplete
            ? (interaction, _client) => cmd.autocomplete!(interaction, context)
            : undefined,
        };
        this.client.commands.set(cmd.data.name, botCommand);
        logger.debug(`Registered addon command: ${cmd.data.name} from ${name}`);
      }
    }

    // Register event handlers
    if (definition.events) {
      for (const eventDef of definition.events) {
        const handler = (...args: unknown[]) => eventDef.handler(context, ...(args as Parameters<typeof eventDef.handler>));

        if (eventDef.once) {
          this.client.once(eventDef.event, handler as (...args: unknown[]) => void);
          unsubscribers.push(() => this.client.off(eventDef.event, handler as (...args: unknown[]) => void));
        } else {
          this.client.on(eventDef.event, handler as (...args: unknown[]) => void);
          unsubscribers.push(() => this.client.off(eventDef.event, handler as (...args: unknown[]) => void));
        }
      }
    }

    // Run lifecycle hook
    if (definition.hooks?.onLoad) {
      await definition.hooks.onLoad(context);
    }

    this.loadedAddons.set(name, { definition, context, eventBus, unsubscribers });
    logger.info(`Activated addon: ${name} v${definition.manifest.version}`);
  }

  async deactivateAddon(name: string): Promise<void> {
    const loaded = this.loadedAddons.get(name);
    if (!loaded) return;

    // Run unload hook
    if (loaded.definition.hooks?.onUnload) {
      await loaded.definition.hooks.onUnload(loaded.context);
    }

    // Unsubscribe all event listeners
    for (const unsub of loaded.unsubscribers) {
      unsub();
    }

    // Remove commands
    if (loaded.definition.commands) {
      for (const cmd of loaded.definition.commands) {
        this.client.commands.delete(cmd.data.name);
      }
    }

    this.loadedAddons.delete(name);
    logger.info(`Deactivated addon: ${name}`);
  }

  getLoadedAddons(): string[] {
    return Array.from(this.loadedAddons.keys());
  }

  async notifySettingsUpdate(addonName: string, guildId: string, settings: Record<string, unknown>): Promise<void> {
    const loaded = this.loadedAddons.get(addonName);
    if (loaded?.definition.hooks?.onSettingsUpdate) {
      await loaded.definition.hooks.onSettingsUpdate(loaded.context, guildId, settings);
    }
  }
}
