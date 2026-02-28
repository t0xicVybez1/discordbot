import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { BotCommand } from '../../types.js';
import type { BotClient } from '../../client.js';
import { COLORS } from '@discordbot/shared';
import { prisma } from '../../database.js';
import { errorEmbed } from '../../utils/embed.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the XP leaderboard')
    .addIntegerOption((opt) =>
      opt.setName('page').setDescription('Page number').setMinValue(1).setRequired(false)
    ),
  category: 'leveling',
  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    await interaction.deferReply();

    if (!interaction.guild) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'This command must be used in a server.')] });
      return;
    }

    const page = (interaction.options.getInteger('page') ?? 1) - 1;
    const pageSize = 10;

    const users = await prisma.userLevel.findMany({
      where: { guildId: interaction.guild.id },
      orderBy: { xp: 'desc' },
      skip: page * pageSize,
      take: pageSize,
    });

    const total = await prisma.userLevel.count({
      where: { guildId: interaction.guild.id },
    });

    if (users.length === 0) {
      await interaction.editReply({
        embeds: [errorEmbed('Empty', 'No one has earned XP in this server yet.')],
      });
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const offset = page * pageSize;

    const description = users
      .map((u, i) => {
        const rank = offset + i + 1;
        const medal = rank <= 3 ? medals[rank - 1] : `**#${rank}**`;
        return `${medal} <@${u.userId}> — Level **${u.level}** | **${u.xp.toLocaleString()}** XP`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
      .setDescription(description)
      .setFooter({
        text: `Page ${page + 1} of ${Math.ceil(total / pageSize)} • ${total} total users`,
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
