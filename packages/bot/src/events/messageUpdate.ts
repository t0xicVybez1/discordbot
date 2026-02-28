import type { Message, PartialMessage } from 'discord.js';
import type { BotEvent } from '../types.js';
import { LoggingModule } from '../modules/logging/LoggingModule.js';

const event: BotEvent = {
  name: 'messageUpdate',
  async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    if (!newMessage.guild) return;

    // Always fetch newMessage to get the actual latest content (cache can be stale)
    const fresh = newMessage.partial
      ? await newMessage.fetch().catch(() => null)
      : await newMessage.fetch().catch(() => newMessage as Message);
    if (!fresh) return;

    // oldMessage may be partial (not in cache) — that's fine, Before will show as "No content"
    await LoggingModule.logMessageEdit(newMessage.guild, oldMessage as Message, fresh);
  },
};

export default event;
