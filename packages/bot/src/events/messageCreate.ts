import type { Message } from 'discord.js';
import type { BotEvent } from '../types.js';
import { AutoModModule } from '../modules/automod/AutoModModule.js';
import { LevelingModule } from '../modules/leveling/LevelingModule.js';

const event: BotEvent = {
  name: 'messageCreate',
  async execute(message: Message) {
    if (!message.guild || message.author.bot) return;

    // Run automod check (in parallel with leveling for performance)
    await Promise.allSettled([
      AutoModModule.analyze(message),
      LevelingModule.processMessage(message.guild, message.author),
    ]);
  },
};

export default event;
