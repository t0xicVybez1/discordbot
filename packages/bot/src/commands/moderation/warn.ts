import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { BotCommand } from '../../types.js';
import type { BotClient } from '../../client.js';
import { moderationEmbed, errorEmbed, infoEmbed } from '../../utils/embed.js';
import { canModerate } from '../../utils/permissions.js';
import { prisma } from '../../database.js';
import { getNextCaseNumber } from '../../utils/settings.js';
import { LoggingModule } from '../../modules/logging/LoggingModule.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to warn').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the warning').setRequired(true)
    ),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    if (!interaction.guild) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'This command must be used in a server.')] });
      return;
    }

    if (targetUser.id === interaction.user.id) {
      await interaction.editReply({ embeds: [errorEmbed('Invalid Target', 'You cannot warn yourself.')] });
      return;
    }

    const moderator = await interaction.guild.members.fetch(interaction.user.id);
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.editReply({ embeds: [errorEmbed('Not Found', 'That user is not in this server.')] });
      return;
    }

    if (!canModerate(moderator, targetMember)) {
      await interaction.editReply({
        embeds: [errorEmbed('Hierarchy Error', 'You cannot warn a member with a higher or equal role.')],
      });
      return;
    }

    // Create warning
    await prisma.warning.create({
      data: {
        guildId: interaction.guild.id,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        reason,
      },
    });

    const caseNumber = await getNextCaseNumber(interaction.guild.id);
    await prisma.moderationCase.create({
      data: {
        caseNumber,
        guildId: interaction.guild.id,
        type: 'warn',
        userId: targetUser.id,
        userTag: targetUser.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
        active: false,
      },
    });

    // Count active warnings
    const warningCount = await prisma.warning.count({
      where: { guildId: interaction.guild.id, userId: targetUser.id, active: true },
    });

    // Notify user via DM
    await targetUser
      .send({
        embeds: [
          moderationEmbed({
            action: `Warning in ${interaction.guild.name}`,
            user: targetUser.tag,
            moderator: interaction.user.tag,
            reason,
          }),
        ],
      })
      .catch(() => null);

    await interaction.editReply({
      embeds: [
        moderationEmbed({
          action: 'Warning',
          user: `${targetUser.tag} (${targetUser.id})`,
          moderator: interaction.user.tag,
          reason,
          caseNumber,
        }).addFields({ name: 'Total Warnings', value: `${warningCount}`, inline: true }),
      ],
    });

    await LoggingModule.logModerationAction(interaction.guild, {
      type: 'warn',
      userId: targetUser.id,
      userTag: targetUser.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      guildId: interaction.guild.id,
    });
  },
};

export default command;
