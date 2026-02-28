import {
  type Interaction,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  Collection,
} from 'discord.js';
import type { BotClient } from '../client.js';
import { errorEmbed } from '../utils/embed.js';
import { logger } from '../logger.js';

export class InteractionHandler {
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
  }

  async handle(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      await this.handleChatCommand(interaction);
    } else if (interaction.isAutocomplete()) {
      await this.handleAutocomplete(interaction);
    } else if (interaction.isButton()) {
      await this.handleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await this.handleSelectMenu(interaction);
    } else if (interaction.isModalSubmit()) {
      await this.handleModal(interaction);
    } else if (interaction.isContextMenuCommand()) {
      await this.handleChatCommand(interaction as unknown as ChatInputCommandInteraction);
    }
  }

  private async handleChatCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.client.commands.get(interaction.commandName);

    if (!command) {
      await interaction.reply({
        embeds: [errorEmbed('Unknown Command', 'This command does not exist.')],
        ephemeral: true,
      });
      return;
    }

    // Check cooldowns
    const inCooldown = this.checkCooldown(interaction, command.data.name, command.cooldown ?? 3);
    if (inCooldown > 0) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            'Cooldown',
            `Please wait **${inCooldown.toFixed(1)}s** before using \`/${command.data.name}\` again.`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    // Check user permissions
    if (command.userPermissions && interaction.guild) {
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      if (member) {
        const missing = command.userPermissions.filter(
          (p) => !member.permissions.has(p)
        );
        if (missing.length > 0) {
          await interaction.reply({
            embeds: [
              errorEmbed(
                'Missing Permissions',
                `You need the following permissions: ${missing.join(', ')}`
              ),
            ],
            ephemeral: true,
          });
          return;
        }
      }
    }

    try {
      await command.execute(interaction, this.client);
    } catch (err) {
      logger.error({ err, command: command.data.name }, 'Command execution error');
      const embed = errorEmbed('Error', 'An error occurred while executing this command.');

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [embed] }).catch(() => null);
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => null);
      }
    }
  }

  private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const command = this.client.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
      await command.autocomplete(interaction, this.client);
    } catch (err) {
      logger.error({ err }, 'Autocomplete error');
    }
  }

  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    const [commandName] = interaction.customId.split(':');
    const command = this.client.commands.get(commandName);

    if (command?.handleButton) {
      try {
        await command.handleButton(interaction, this.client);
      } catch (err) {
        logger.error({ err }, 'Button handler error');
      }
    }
  }

  private async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const [commandName] = interaction.customId.split(':');
    const command = this.client.commands.get(commandName);

    if (command?.handleSelect) {
      try {
        await command.handleSelect(interaction, this.client);
      } catch (err) {
        logger.error({ err }, 'Select menu handler error');
      }
    }
  }

  private async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    const [commandName] = interaction.customId.split(':');
    const command = this.client.commands.get(commandName);

    if (command?.handleModal) {
      try {
        await command.handleModal(interaction, this.client);
      } catch (err) {
        logger.error({ err }, 'Modal handler error');
      }
    }
  }

  private checkCooldown(interaction: ChatInputCommandInteraction, commandName: string, seconds: number): number {
    if (!this.client.cooldowns.has(commandName)) {
      this.client.cooldowns.set(commandName, new Collection());
    }

    const timestamps = this.client.cooldowns.get(commandName)!;
    const now = Date.now();
    const cooldownAmount = seconds * 1000;
    const userId = interaction.user.id;

    if (timestamps.has(userId)) {
      const expirationTime = timestamps.get(userId)! + cooldownAmount;
      if (now < expirationTime) {
        return (expirationTime - now) / 1000;
      }
    }

    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownAmount);
    return 0;
  }
}
