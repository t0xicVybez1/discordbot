import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { BotCommand } from '../../types.js';
import type { BotClient } from '../../client.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';
import { MusicManager } from '../../modules/music/MusicManager.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the music volume')
    .addIntegerOption((opt) =>
      opt.setName('level').setDescription('Volume level (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
    ),
  category: 'music',

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'This command must be used in a server.')], ephemeral: true });
      return;
    }

    const queue = MusicManager.getQueue(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      await interaction.reply({ embeds: [errorEmbed('Nothing Playing', 'No music is playing.')], ephemeral: true });
      return;
    }

    const level = interaction.options.getInteger('level', true);
    queue.setVolume(level);

    await interaction.reply({ embeds: [successEmbed('Volume', `Volume set to **${level}%**`)] });
  },
};

export default command;
