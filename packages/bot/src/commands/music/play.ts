import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type VoiceBasedChannel,
} from 'discord.js';
import type { BotCommand } from '../../types.js';
import type { BotClient } from '../../client.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embed.js';
import { MusicManager } from '../../modules/music/MusicManager.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or add it to the queue')
    .addStringOption((opt) =>
      opt.setName('query').setDescription('Song name or YouTube/Spotify URL').setRequired(true)
    ),
  category: 'music',
  botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    await interaction.deferReply();

    if (!interaction.guild) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'This command must be used in a server.')] });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice.channel as VoiceBasedChannel | null;

    if (!voiceChannel) {
      await interaction.editReply({
        embeds: [errorEmbed('Join a Voice Channel', 'You must be in a voice channel to play music.')],
      });
      return;
    }

    const botMember = await interaction.guild.members.fetchMe();
    if (botMember.voice.channel && botMember.voice.channel.id !== voiceChannel.id) {
      await interaction.editReply({
        embeds: [errorEmbed('Wrong Channel', `I'm already playing in <#${botMember.voice.channel.id}>`)],
      });
      return;
    }

    const query = interaction.options.getString('query', true);

    try {
      const result = await MusicManager.play(interaction.guild, voiceChannel, query, interaction.user);

      if (result.type === 'added') {
        await interaction.editReply({
          embeds: [
            successEmbed('Added to Queue', `**${result.title}** has been added to the queue.\nPosition: #${result.position}`),
          ],
        });
      } else if (result.type === 'playing') {
        await interaction.editReply({
          embeds: [
            infoEmbed('Now Playing', `🎵 **${result.title}**`)
              .addFields(
                { name: 'Requested by', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Duration', value: result.duration ?? 'Unknown', inline: true },
              )
              .setThumbnail(result.thumbnail ?? null),
          ],
        });
      }
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Could not play that track: ${(err as Error).message}`)],
      });
    }
  },
};

export default command;
