import type { Message } from 'discord.js';
import type { BotEvent } from '../types.js';
import { AutoModModule } from '../modules/automod/AutoModModule.js';
import { LevelingModule } from '../modules/leveling/LevelingModule.js';
import { getGuildSettings } from '../utils/settings.js';

const event: BotEvent = {
  name: 'messageCreate',
  async execute(message: Message) {
    if (!message.guild || message.author.bot) return;

    const settings = await getGuildSettings(message.guild.id);

    await Promise.allSettled([
      settings?.autoModEnabled ? AutoModModule.analyze(message) : Promise.resolve(),
      LevelingModule.processMessage(message.guild, message.author),
    ]);
  },
};

export default event;
