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
    .setName('stop')
    .setDescription('Stop music and clear the queue'),
  category: 'music',

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'This command must be used in a server.')], ephemeral: true });
      return;
    }

    const queue = MusicManager.getQueue(interaction.guild.id);
    if (!queue) {
      await interaction.reply({ embeds: [errorEmbed('Nothing Playing', 'There is nothing playing.')], ephemeral: true });
      return;
    }

    queue.destroy();
    MusicManager.deleteQueue(interaction.guild.id);

    await interaction.reply({ embeds: [successEmbed('Stopped', 'Music stopped and queue cleared.')] });
  },
};

export default command;
