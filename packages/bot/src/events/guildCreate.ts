import type { Guild } from 'discord.js';
import type { BotEvent } from '../types.js';
import { ensureGuildExists } from '../utils/settings.js';
import { logger } from '../logger.js';
import { pub } from '../redis.js';

const event: BotEvent = {
  name: 'guildCreate',
  async execute(guild: Guild) {
    logger.info(`Joined guild: ${guild.name} (${guild.id})`);

    await ensureGuildExists(
      guild.id,
      guild.name,
      guild.ownerId,
      guild.iconURL() ?? undefined
    );

    await pub.publish('bot:events', JSON.stringify({
      type: 'guild:joined',
      data: { guildId: guild.id, name: guild.name, memberCount: guild.memberCount },
    }));
  },
};

export default event;
