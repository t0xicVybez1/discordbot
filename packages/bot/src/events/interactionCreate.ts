import type { BotEvent } from '../types.js';
import type { BotClient } from '../client.js';
import { InteractionHandler } from '../handlers/InteractionHandler.js';

let handler: InteractionHandler | null = null;

const event: BotEvent = {
  name: 'interactionCreate',
  async execute(client: BotClient, interaction: import('discord.js').Interaction) {
    if (!handler) handler = new InteractionHandler(client);
    await handler.handle(interaction);
  },
};

export default event;
