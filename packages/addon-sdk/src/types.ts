import type {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  ContextMenuCommandInteraction,
  Client,
  GuildMember,
  Message,
} from 'discord.js';
import type { AddonManifest, AddonSettingSchema } from '@discordbot/shared';
import type { AddonContext } from './AddonContext.js';

export interface AddonCommandDefinition {
  data: SlashCommandBuilder | ContextMenuCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  execute: (interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction, ctx: AddonContext) => Promise<void>;
  autocomplete?: (interaction: import('discord.js').AutocompleteInteraction, ctx: AddonContext) => Promise<void>;
}

export interface AddonEventHandler<EventName extends keyof import('discord.js').ClientEvents = keyof import('discord.js').ClientEvents> {
  event: EventName;
  once?: boolean;
  handler: (ctx: AddonContext, ...args: import('discord.js').ClientEvents[EventName]) => Promise<void> | void;
}

export interface AddonLifecycleHooks {
  /** Called when the addon is first loaded */
  onLoad?: (ctx: AddonContext) => Promise<void> | void;
  /** Called when the addon is unloaded/disabled */
  onUnload?: (ctx: AddonContext) => Promise<void> | void;
  /** Called when addon settings are updated for a guild */
  onSettingsUpdate?: (ctx: AddonContext, guildId: string, settings: Record<string, unknown>) => Promise<void> | void;
  /** Called when a new guild installs the addon */
  onGuildInstall?: (ctx: AddonContext, guildId: string) => Promise<void> | void;
  /** Called when a guild uninstalls the addon */
  onGuildUninstall?: (ctx: AddonContext, guildId: string) => Promise<void> | void;
}

export interface AddonDefinition {
  manifest: AddonManifest;
  commands?: AddonCommandDefinition[];
  events?: AddonEventHandler[];
  hooks?: AddonLifecycleHooks;
}

export interface AddonStorage {
  get<T = unknown>(key: string, guildId?: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, guildId?: string): Promise<void>;
  delete(key: string, guildId?: string): Promise<void>;
  keys(guildId?: string): Promise<string[]>;
}

export interface AddonLogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}
