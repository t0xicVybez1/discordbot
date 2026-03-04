import type { GuildMember } from 'discord.js';
import type { BotEvent } from '../types.js';
import { WelcomeModule } from '../modules/welcome/WelcomeModule.js';
import { LoggingModule } from '../modules/logging/LoggingModule.js';
import { ensureGuildExists, getGuildSettings } from '../utils/settings.js';

const event: BotEvent = {
  name: 'guildMemberAdd',
  async execute(member: GuildMember) {
    await ensureGuildExists(
      member.guild.id,
      member.guild.name,
      member.guild.ownerId,
      member.guild.iconURL() ?? undefined
    );

    const settings = await getGuildSettings(member.guild.id);

    await Promise.allSettled([
      settings?.welcomeEnabled ? WelcomeModule.handleJoin(member.guild, member) : Promise.resolve(),
      LoggingModule.logMemberJoin(member.guild, member),
    ]);
  },
};

export default event;
