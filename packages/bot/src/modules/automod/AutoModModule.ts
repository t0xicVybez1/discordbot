import { type Message, type GuildMember } from 'discord.js';
import { prisma } from '../../database.js';
import { redis } from '../../redis.js';
import { REDIS_KEYS } from '@discordbot/shared';
import type { AutoModConfig } from '@discordbot/shared';
import { logger } from '../../logger.js';
import { LoggingModule } from '../logging/LoggingModule.js';

export class AutoModModule {
  private static async getConfig(guildId: string): Promise<AutoModConfig | null> {
    const cached = await redis.get(`automod:config:${guildId}`);
    if (cached) return JSON.parse(cached) as AutoModConfig;

    const config = await prisma.autoModConfig.findUnique({ where: { guildId } });
    if (config) {
      await redis.setex(`automod:config:${guildId}`, 60, JSON.stringify(config));
    }
    return config as AutoModConfig | null;
  }

  static async analyze(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;

    const config = await this.getConfig(message.guild.id);
    if (!config) return;

    const member = message.member as GuildMember;

    // Check exempt roles/channels
    const hasExemptRole = config.exemptRoles.some((r) => member.roles.cache.has(r));
    const isExemptChannel = config.exemptChannels.includes(message.channelId);
    if (hasExemptRole || isExemptChannel) return;

    // Run checks in priority order
    if (config.antiSpamEnabled && await this.checkSpam(message, config)) return;
    if (config.filterEnabled && this.checkWordFilter(message, config)) return;
    if (config.antiLinkEnabled && this.checkLinks(message, config)) return;
    if (config.antiMentionEnabled && this.checkMentions(message, config)) return;
    if (config.antiCapsEnabled && this.checkCaps(message, config)) return;
  }

  private static async checkSpam(message: Message, config: AutoModConfig): Promise<boolean> {
    const key = REDIS_KEYS.SPAM_TRACKER(message.guild!.id, message.author.id);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.ceil(config.antiSpamInterval / 1000));
    }

    if (count >= config.antiSpamThreshold) {
      await this.takeAction(message, config.antiSpamAction, 'Spam detected');
      await redis.del(key);
      return true;
    }
    return false;
  }

  private static checkWordFilter(message: Message, config: AutoModConfig): boolean {
    const content = message.content.toLowerCase();
    const matched = config.filteredWords.some((word) => content.includes(word.toLowerCase()));

    if (matched) {
      this.takeAction(message, config.filterAction, 'Filtered word detected');
      return true;
    }
    return false;
  }

  private static checkLinks(message: Message, config: AutoModConfig): boolean {
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = message.content.match(urlPattern);
    if (!urls) return false;

    const hasBlockedLink = urls.some((url) => {
      const domain = new URL(url).hostname;
      return !config.allowedDomains.includes(domain) && config.allowedDomains.length > 0;
    });

    if (hasBlockedLink) {
      this.takeAction(message, config.linkAction, 'Blocked link detected');
      return true;
    }

    return false;
  }

  private static checkMentions(message: Message, config: AutoModConfig): boolean {
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    if (mentionCount >= config.mentionThreshold) {
      this.takeAction(message, 'delete', 'Mention spam');
      return true;
    }
    return false;
  }

  private static checkCaps(message: Message, config: AutoModConfig): boolean {
    if (message.content.length < 10) return false;
    const letters = message.content.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return false;
    const capsPercent = (message.content.replace(/[^A-Z]/g, '').length / letters.length) * 100;

    if (capsPercent >= config.capsThreshold) {
      this.takeAction(message, 'delete', 'Excessive caps');
      return true;
    }
    return false;
  }

  private static async takeAction(
    message: Message,
    action: string,
    reason: string
  ): Promise<void> {
    try {
      await message.delete().catch(() => null);

      if (action === 'warn' || action === 'mute' || action === 'kick' || action === 'ban') {
        await message.channel
          .send({
            content: `<@${message.author.id}> Your message was removed: **${reason}**`,
          })
          .then((m) => setTimeout(() => m.delete().catch(() => null), 5000))
          .catch(() => null);
      }

      if (action === 'mute' && message.member) {
        await message.member.timeout(60000, `AutoMod: ${reason}`).catch(() => null);
      }

      // Log it
      if (message.guild) {
        await prisma.logEntry.create({
          data: {
            guildId: message.guild.id,
            type: 'automod',
            userId: message.author.id,
            data: { action, reason, channelId: message.channelId },
          },
        });
      }
    } catch (err) {
      logger.error({ err }, 'AutoMod action failed');
    }
  }

  static async checkRaid(guildId: string, config: AutoModConfig): Promise<boolean> {
    const key = REDIS_KEYS.RAID_TRACKER(guildId);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.ceil(config.raidInterval / 1000));
    }

    return count >= config.raidThreshold;
  }
}
