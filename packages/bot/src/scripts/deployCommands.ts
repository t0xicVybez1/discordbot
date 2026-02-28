import 'dotenv/config';
import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config } from '../config.js';
import type { BotCommand } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function deployCommands() {
  const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
  const commandsPath = join(__dirname, '..', 'commands');

  const categories = readdirSync(commandsPath).filter((dir) =>
    statSync(join(commandsPath, dir)).isDirectory()
  );

  for (const category of categories) {
    const categoryPath = join(commandsPath, category);
    const commandFiles = readdirSync(categoryPath).filter((f) => f.endsWith('.js') || f.endsWith('.ts'));

    for (const file of commandFiles) {
      const filePath = join(categoryPath, file);
      const fileUrl = pathToFileURL(filePath).href;
      const module = await import(fileUrl);
      const command: BotCommand = module.default ?? module.command;
      if (command?.data) {
        commands.push(command.data.toJSON());
        console.log(`Found command: ${command.data.name}`);
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  if (config.discord.guildId) {
    // Deploy to specific guild (faster, for development)
    console.log(`Deploying ${commands.length} commands to guild ${config.discord.guildId}...`);
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commands }
    );
    console.log('Guild commands deployed!');
  } else {
    // Deploy globally (can take up to 1 hour)
    console.log(`Deploying ${commands.length} commands globally...`);
    await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
    console.log('Global commands deployed!');
  }
}

deployCommands().catch(console.error);
