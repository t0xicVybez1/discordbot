import 'dotenv/config';
import { config } from './config.js';
import { BotClient } from './client.js';
import { CommandHandler } from './handlers/CommandHandler.js';
import { EventHandler } from './handlers/EventHandler.js';
import { AddonHandler } from './handlers/AddonHandler.js';
import { connectDatabase } from './database.js';
import { connectRedis } from './redis.js';
import { logger } from './logger.js';

async function main() {
  logger.info('Starting Discord bot...');

  // Connect to services
  await connectDatabase();
  await connectRedis();

  // Create client
  const client = new BotClient();

  // Initialize handlers
  const commandHandler = new CommandHandler(client);
  const eventHandler = new EventHandler(client);
  const addonHandler = new AddonHandler(client);

  // Load all commands and events
  await commandHandler.loadCommands();
  await eventHandler.loadEvents();
  await addonHandler.loadAddons();

  // Login
  await client.login(config.discord.token);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    client.destroy();

    const { disconnectDatabase } = await import('./database.js');
    const { disconnectRedis } = await import('./redis.js');

    await disconnectDatabase();
    await disconnectRedis();

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
