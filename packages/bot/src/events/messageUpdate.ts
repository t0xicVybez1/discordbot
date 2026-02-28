import type { Message, PartialMessage } from 'discord.js';
import type { BotEvent } from '../types.js';
import { LoggingModule } from '../modules/logging/LoggingModule.js';

const event: BotEvent = {
  name: 'messageUpdate',
  async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    if (!newMessage.guild || oldMessage.partial || newMessage.partial) return;
    await LoggingModule.logMessageEdit(newMessage.guild, oldMessage as Message, newMessage as Message);
  },
};

export default event;
