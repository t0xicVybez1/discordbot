import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { BotEvent } from '../types.js';
import { WelcomeModule } from '../modules/welcome/WelcomeModule.js';
import { LoggingModule } from '../modules/logging/LoggingModule.js';

const event: BotEvent = {
  name: 'guildMemberRemove',
  async execute(member: GuildMember | PartialGuildMember) {
    if (!member.guild) return;
    // Fetch full member if partial
    const fullMember = member.partial
      ? await member.guild.members.fetch(member.id).catch(() => null)
      : member;

    if (!fullMember) return;

    await Promise.allSettled([
      WelcomeModule.handleLeave(fullMember.guild, fullMember),
      LoggingModule.logMemberLeave(fullMember.guild, fullMember),
    ]);
  },
};

export default event;
