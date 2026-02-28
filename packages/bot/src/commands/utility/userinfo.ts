import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { BotCommand } from '../../types.js';
import type { BotClient } from '../../client.js';
import { COLORS } from '@discordbot/shared';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display information about a user')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The user to look up (defaults to yourself)').setRequired(false)
    ),
  category: 'utility',

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    const targetUser = interaction.options.getUser('user') ?? interaction.user;

    if (!interaction.guild) {
      await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(member?.displayColor ?? COLORS.INFO)
      .setTitle(targetUser.tag)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🆔 ID', value: targetUser.id, inline: true },
        { name: '🤖 Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true },
        {
          name: '📅 Account Created',
          value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:D>`,
          inline: true,
        },
      );

    if (member) {
      const roles = member.roles.cache
        .filter((r) => r.id !== interaction.guild!.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => r.toString())
        .slice(0, 10);

      embed.addFields(
        { name: '🏷️ Nickname', value: member.nickname ?? 'None', inline: true },
        {
          name: '📥 Joined Server',
          value: member.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`
            : 'Unknown',
          inline: true,
        },
        {
          name: `🎭 Roles (${member.roles.cache.size - 1})`,
          value: roles.length > 0 ? roles.join(', ') : 'None',
        },
      );

      if (member.premiumSince) {
        embed.addFields({
          name: '💎 Boosting Since',
          value: `<t:${Math.floor(member.premiumSinceTimestamp! / 1000)}:D>`,
          inline: true,
        });
      }
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
