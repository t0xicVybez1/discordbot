import type { Guild } from 'discord.js';
import type { BotEvent } from '../types.js';
import { prisma } from '../database.js';
import { logger } from '../logger.js';
import { pub } from '../redis.js';

const event: BotEvent = {
  name: 'guildDelete',
  async execute(guild: Guild) {
    logger.info(`Left guild: ${guild.name} (${guild.id})`);

    await prisma.guild.update({
      where: { id: guild.id },
      data: { isActive: false, leftAt: new Date() },
    }).catch(() => null);

    await pub.publish('bot:events', JSON.stringify({
      type: 'guild:left',
      data: { guildId: guild.id },
    }));
  },
};

export default event;
