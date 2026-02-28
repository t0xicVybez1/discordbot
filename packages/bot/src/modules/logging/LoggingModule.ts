import {
  type Guild,
  type TextChannel,
  EmbedBuilder,
  type GuildMember,
  type Message,
} from 'discord.js';
import { COLORS, LOG_TYPES, type LogType } from '@discordbot/shared';
import type { ModerationAction } from '@discordbot/shared';
import { prisma } from '../../database.js';
import { getGuildSettings } from '../../utils/settings.js';
import { logger } from '../../logger.js';

export class LoggingModule {
  static async getLogChannel(guild: Guild, channelId: string | null | undefined): Promise<TextChannel | null> {
    if (!channelId) return null;
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return null;
    return channel as TextChannel;
  }

  static async log(guild: Guild, type: LogType, embed: EmbedBuilder, data: Record<string, unknown> = {}): Promise<void> {
    try {
      const settings = await getGuildSettings(guild.id);
      if (!settings?.loggingEnabled) return;

      const logChannelId = type.startsWith('member_') || type === 'automod'
        ? (settings.modLogChannelId ?? settings.logChannelId)
        : settings.logChannelId;

      const channel = await this.getLogChannel(guild, logChannelId);
      if (channel) {
        await channel.send({ embeds: [embed] }).catch(() => null);
      }

      // Save to database
      await prisma.logEntry.create({
        data: {
          guildId: guild.id,
          type,
          data: data as object,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to log event');
    }
  }

  static async logModerationAction(guild: Guild, action: ModerationAction): Promise<void> {
    const typeEmojis: Record<string, string> = {
      ban: '🔨', tempban: '⏱️', kick: '👢', mute: '🔇',
      unmute: '🔊', unban: '✅', warn: '⚠️',
    };

    const typeColors: Record<string, number> = {
      ban: COLORS.ERROR, tempban: COLORS.ERROR, kick: COLORS.WARNING,
      mute: COLORS.WARNING, unmute: COLORS.SUCCESS, unban: COLORS.SUCCESS, warn: 0xffa500,
    };

    const embed = new EmbedBuilder()
      .setColor(typeColors[action.type] ?? COLORS.NEUTRAL)
      .setTitle(`${typeEmojis[action.type] ?? '📋'} ${action.type.toUpperCase()}`)
      .addFields(
        { name: 'User', value: `${action.userTag} (${action.userId})`, inline: true },
        { name: 'Moderator', value: `${action.moderatorTag}`, inline: true },
        { name: 'Reason', value: action.reason ?? 'No reason provided' },
      )
      .setTimestamp();

    const logType = `member_${action.type}` as LogType;
    await this.log(guild, logType, embed, {
      type: action.type,
      userId: action.userId,
      userTag: action.userTag,
      moderatorId: action.moderatorId,
      reason: action.reason,
    });
  }

  static async logMessageDelete(guild: Guild, message: Message): Promise<void> {
    if (message.author.bot) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle('🗑️ Message Deleted')
      .addFields(
        { name: 'Author', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
      )
      .setTimestamp();

    if (message.content) {
      embed.addFields({ name: 'Content', value: message.content.slice(0, 1024) });
    }

    await this.log(guild, LOG_TYPES.MESSAGE_DELETE, embed, {
      authorId: message.author.id,
      channelId: message.channelId,
      content: message.content,
    });
  }

  static async logMessageEdit(guild: Guild, oldMessage: Message, newMessage: Message): Promise<void> {
    if (newMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle('✏️ Message Edited')
      .setURL(newMessage.url)
      .addFields(
        { name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
        { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
        { name: 'Before', value: (oldMessage.content ?? '*No content*').slice(0, 512) },
        { name: 'After', value: (newMessage.content ?? '*No content*').slice(0, 512) },
      )
      .setTimestamp();

    await this.log(guild, LOG_TYPES.MESSAGE_EDIT, embed, {
      authorId: newMessage.author.id,
      channelId: newMessage.channelId,
      before: oldMessage.content,
      after: newMessage.content,
    });
  }

  static async logMemberJoin(guild: Guild, member: GuildMember): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('📥 Member Joined')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Account Age', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
      )
      .setTimestamp();

    await this.log(guild, LOG_TYPES.MEMBER_JOIN, embed, {
      userId: member.id,
      userTag: member.user.tag,
      memberCount: guild.memberCount,
    });
  }

  static async logMemberLeave(guild: Guild, member: GuildMember): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle('📤 Member Left')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
      )
      .setTimestamp();

    await this.log(guild, LOG_TYPES.MEMBER_LEAVE, embed, {
      userId: member.id,
      userTag: member.user.tag,
      memberCount: guild.memberCount,
    });
  }
}
