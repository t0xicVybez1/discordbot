import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { BotCommand } from '../../types.js';
import type { BotClient } from '../../client.js';
import { COLORS, xpForLevel } from '@discordbot/shared';
import { prisma } from '../../database.js';
import { errorEmbed } from '../../utils/embed.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your or someone else\'s rank')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The user to check (defaults to yourself)').setRequired(false)
    ),
  category: 'leveling',

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    await interaction.deferReply();

    if (!interaction.guild) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'This command must be used in a server.')] });
      return;
    }

    const targetUser = interaction.options.getUser('user') ?? interaction.user;

    const userLevel = await prisma.userLevel.findUnique({
      where: { guildId_userId: { guildId: interaction.guild.id, userId: targetUser.id } },
    });

    if (!userLevel) {
      await interaction.editReply({
        embeds: [errorEmbed('No Data', `${targetUser.tag} has not earned any XP yet.`)],
      });
      return;
    }

    // Get rank position
    const rank = await prisma.userLevel.count({
      where: {
        guildId: interaction.guild.id,
        xp: { gt: userLevel.xp },
      },
    });

    const currentLevel = userLevel.level;
    const currentXp = userLevel.xp;
    const xpNeeded = xpForLevel(currentLevel + 1);

    // Calculate XP within current level
    let xpInLevel = currentXp;
    for (let i = 0; i <= currentLevel; i++) {
      xpInLevel -= xpForLevel(i);
    }
    if (xpInLevel < 0) xpInLevel = 0;

    const progressBarLength = 20;
    const filled = Math.round((xpInLevel / xpNeeded) * progressBarLength);
    const progressBar =
      '█'.repeat(filled) + '░'.repeat(progressBarLength - filled);

    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`📊 ${targetUser.tag}'s Rank`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '🏆 Rank', value: `#${rank + 1}`, inline: true },
        { name: '📈 Level', value: `${currentLevel}`, inline: true },
        { name: '✨ Total XP', value: `${currentXp.toLocaleString()}`, inline: true },
        { name: '💬 Messages', value: `${userLevel.totalMessages.toLocaleString()}`, inline: true },
        {
          name: `Progress to Level ${currentLevel + 1}`,
          value: `\`${progressBar}\`\n${xpInLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`,
        },
      )
      .setFooter({ text: interaction.guild.name });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
