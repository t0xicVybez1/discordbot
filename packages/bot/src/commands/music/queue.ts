import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { BotCommand } from '../../types.js';
import type { BotClient } from '../../client.js';
import { errorEmbed } from '../../utils/embed.js';
import { MusicManager } from '../../modules/music/MusicManager.js';
import { COLORS } from '@discordbot/shared';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the music queue'),
  category: 'music',

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'This command must be used in a server.')], ephemeral: true });
      return;
    }

    const queue = MusicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      await interaction.reply({ embeds: [errorEmbed('Nothing Playing', 'No music is currently playing.')], ephemeral: true });
      return;
    }

    const tracks = queue.tracks.slice(0, 10);
    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('🎵 Music Queue')
      .setDescription(
        `**Now Playing:** ${queue.currentTrack.title}\n\n` +
        (tracks.length > 0
          ? tracks.map((t, i) => `${i + 1}. **${t.title}** — <@${t.requestedBy.id}>`).join('\n')
          : '_Queue is empty_')
      )
      .setFooter({
        text: `${queue.tracks.length} song(s) in queue • Loop: ${queue.loop}`,
      });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
