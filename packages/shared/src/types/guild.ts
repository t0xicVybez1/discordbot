export interface GuildData {
  id: string;
  name: string;
  iconUrl?: string;
  ownerId: string;
  joinedAt: Date;
  isActive: boolean;
  memberCount?: number;
  settings?: GuildSettings;
}

export interface GuildSettings {
  guildId: string;
  prefix: string;
  locale: string;
  timezone: string;

  // Feature toggles
  moderationEnabled: boolean;
  autoModEnabled: boolean;
  levelingEnabled: boolean;
  welcomeEnabled: boolean;
  loggingEnabled: boolean;
  musicEnabled: boolean;
  reactionRolesEnabled: boolean;

  // Channels
  logChannelId?: string;
  modLogChannelId?: string;
  welcomeChannelId?: string;
  leaveChannelId?: string;
  levelUpChannelId?: string;

  // Roles
  muteRoleId?: string;
  autoRoleId?: string;
  memberRoleId?: string;

  // Leveling
  xpPerMessage: number;
  xpCooldown: number;
  levelUpMessage: string;

  extended: Record<string, unknown>;
}

export interface AutoModConfig {
  guildId: string;
  antiSpamEnabled: boolean;
  antiSpamThreshold: number;
  antiSpamInterval: number;
  antiSpamAction: AutoModAction;
  filterEnabled: boolean;
  filteredWords: string[];
  filterAction: AutoModAction;
  antiLinkEnabled: boolean;
  allowedDomains: string[];
  linkAction: AutoModAction;
  antiMentionEnabled: boolean;
  mentionThreshold: number;
  antiCapsEnabled: boolean;
  capsThreshold: number;
  antiRaidEnabled: boolean;
  raidThreshold: number;
  raidInterval: number;
  raidAction: string;
  exemptRoles: string[];
  exemptChannels: string[];
}

export type AutoModAction = 'delete' | 'warn' | 'mute' | 'kick' | 'ban';

export interface WelcomeConfig {
  guildId: string;
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeMessage: string;
  welcomeEmbed: boolean;
  welcomeColor: string;
  welcomeDMEnabled: boolean;
  welcomeDMMessage: string;
  leaveEnabled: boolean;
  leaveChannelId?: string;
  leaveMessage: string;
}

export interface ReactionRole {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  emoji: string;
  roleId: string;
  type: 'toggle' | 'add' | 'remove';
}

export interface CustomCommand {
  id: string;
  guildId: string;
  name: string;
  response: string;
  embed: boolean;
  enabled: boolean;
  uses: number;
}
