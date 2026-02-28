import { ActivityType } from 'discord.js';
import type { BotEvent } from '../types.js';
import { logger } from '../logger.js';
import { pub } from '../redis.js';

const event: BotEvent = {
  name: 'ready',
  once: true,
  async execute(client: import('../client.js').BotClient) {
    logger.info(`Logged in as ${client.user?.tag}`);

    // Set presence
    client.user?.setPresence({
      activities: [{ name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching }],
      status: 'online',
    });

    // Publish bot ready event to API
    await pub.publish('bot:events', JSON.stringify({
      type: 'bot:ready',
      data: {
        username: client.user?.tag,
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
      },
    }));

    // Sync all current guilds to DB on startup
    // (handles case where bot was already in guilds before DB tables were created)
    const { ensureGuildExists, invalidateSettingsCache } = await import('../utils/settings.js');
    for (const guild of client.guilds.cache.values()) {
      try {
        await ensureGuildExists(guild.id, guild.name, guild.ownerId, guild.iconURL() ?? undefined);
      } catch (e) {
        logger.error(`Failed to sync guild ${guild.id}: ${e}`);
      }
    }
    logger.info(`Synced ${client.guilds.cache.size} guilds to database`);

    // Subscribe to settings reload events from API
    const { sub } = await import('../redis.js');

    sub.on('message', (_channel, message) => {
      try {
        const event = JSON.parse(message);
        if (event.type === 'settings:reload') {
          invalidateSettingsCache(event.data.guildId);
          logger.debug(`Settings cache invalidated for guild ${event.data.guildId}`);
        }
      } catch {
        logger.error('Failed to process API event');
      }
    });

    await sub.subscribe('api:events');

    logger.info(`Bot ready! Serving ${client.guilds.cache.size} guilds`);
  },
};

export default event;
