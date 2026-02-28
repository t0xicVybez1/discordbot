import type { GuildMember } from 'discord.js';
import type { BotEvent } from '../types.js';
import { WelcomeModule } from '../modules/welcome/WelcomeModule.js';
import { LoggingModule } from '../modules/logging/LoggingModule.js';
import { ensureGuildExists } from '../utils/settings.js';

const event: BotEvent = {
  name: 'guildMemberAdd',
  async execute(member: GuildMember) {
    await ensureGuildExists(
      member.guild.id,
      member.guild.name,
      member.guild.ownerId,
      member.guild.iconURL() ?? undefined
    );

    await Promise.allSettled([
      WelcomeModule.handleJoin(member.guild, member),
      LoggingModule.logMemberJoin(member.guild, member),
    ]);
  },
};

export default event;
