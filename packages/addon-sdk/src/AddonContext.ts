import type { Client } from 'discord.js';
import type { AddonStorage, AddonLogger } from './types.js';
import type { AddonEventBus } from './AddonEventBus.js';

/**
 * Context object injected into every addon command, event handler, and lifecycle hook.
 * Provides access to the Discord client, storage, logger, event bus, and settings.
 */
export class AddonContext {
  public readonly addonName: string;
  public readonly client: Client;
  public readonly storage: AddonStorage;
  public readonly logger: AddonLogger;
  public readonly events: AddonEventBus;

  private _getSettings: (guildId: string) => Promise<Record<string, unknown>>;

  constructor(options: {
    addonName: string;
    client: Client;
    storage: AddonStorage;
    logger: AddonLogger;
    events: AddonEventBus;
    getSettings: (guildId: string) => Promise<Record<string, unknown>>;
  }) {
    this.addonName = options.addonName;
    this.client = options.client;
    this.storage = options.storage;
    this.logger = options.logger;
    this.events = options.events;
    this._getSettings = options.getSettings;
  }

  /**
   * Get the addon settings for a specific guild.
   * Returns an empty object if no settings are configured.
   */
  async getSettings(guildId: string): Promise<Record<string, unknown>> {
    return this._getSettings(guildId);
  }

  /**
   * Get a specific setting value with a default fallback
   */
  async getSetting<T = unknown>(guildId: string, key: string, defaultValue?: T): Promise<T> {
    const settings = await this._getSettings(guildId);
    return (settings[key] ?? defaultValue) as T;
  }

  /**
   * Get a guild by ID (shortcut to client.guilds.cache.get)
   */
  getGuild(guildId: string) {
    return this.client.guilds.cache.get(guildId);
  }
}
