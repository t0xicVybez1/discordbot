import { type Guild, type User, type TextChannel } from 'discord.js';
import { prisma } from '../../database.js';
import { redis } from '../../redis.js';
import { REDIS_KEYS, xpForLevel, levelFromXp, formatTemplate } from '@discordbot/shared';
import { getGuildSettings } from '../../utils/settings.js';
import { logger } from '../../logger.js';

export class LevelingModule {
  static async processMessage(guild: Guild, user: User): Promise<void> {
    if (user.bot) return;

    const settings = await getGuildSettings(guild.id);
    if (!settings?.levelingEnabled) return;

    const cooldownKey = REDIS_KEYS.USER_XP_COOLDOWN(guild.id, user.id);
    const onCooldown = await redis.exists(cooldownKey);
    if (onCooldown) return;

    // Set cooldown
    await redis.setex(cooldownKey, settings.xpCooldown, '1');

    // Random XP: base ± 25%
    const xpGain = Math.floor(settings.xpPerMessage * (0.75 + Math.random() * 0.5));

    // Get or create user level record
    const existing = await prisma.userLevel.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId: user.id } },
    });

    const currentXp = (existing?.xp ?? 0) + xpGain;
    const currentLevel = existing?.level ?? 0;
    const newLevel = levelFromXp(currentXp);

    await prisma.userLevel.upsert({
      where: { guildId_userId: { guildId: guild.id, userId: user.id } },
      update: {
        xp: currentXp,
        level: newLevel,
        userTag: user.tag,
        totalMessages: { increment: 1 },
      },
      create: {
        guildId: guild.id,
        userId: user.id,
        userTag: user.tag,
        xp: currentXp,
        level: newLevel,
        totalMessages: 1,
      },
    });

    // Check for level up
    if (newLevel > currentLevel) {
      await this.handleLevelUp(guild, user, newLevel, settings.levelUpMessage, settings.levelUpChannelId);
    }
  }

  private static async handleLevelUp(
    guild: Guild,
    user: User,
    level: number,
    messageTemplate: string,
    channelId: string | undefined | null
  ): Promise<void> {
    try {
      const message = formatTemplate(messageTemplate, {
        user: `<@${user.id}>`,
        username: user.username,
        level,
        server: guild.name,
      });

      let channel: TextChannel | null = null;

      if (channelId) {
        const ch = guild.channels.cache.get(channelId);
        if (ch?.isTextBased()) channel = ch as TextChannel;
      }

      if (channel) {
        await channel.send({ content: message }).catch(() => null);
      }

      logger.debug(`${user.tag} leveled up to ${level} in ${guild.name}`);
    } catch (err) {
      logger.error({ err }, 'Failed to handle level up');
    }
  }
}
