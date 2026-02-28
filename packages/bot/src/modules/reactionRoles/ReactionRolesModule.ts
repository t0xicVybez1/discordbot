import { type Guild, type MessageReaction, type User } from 'discord.js';
import { prisma } from '../../database.js';
import { logger } from '../../logger.js';

export class ReactionRolesModule {
  static async handleReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
    if (user.bot) return;
    if (!reaction.message.guild) return;

    const guild = reaction.message.guild;
    const emoji = reaction.emoji.id ?? reaction.emoji.name;
    if (!emoji) return;

    const reactionRole = await prisma.reactionRole.findUnique({
      where: { messageId_emoji: { messageId: reaction.message.id, emoji } },
    });

    if (!reactionRole) return;
    if (reactionRole.type === 'remove') return; // This is an add event

    try {
      const member = await guild.members.fetch(user.id);
      const role = guild.roles.cache.get(reactionRole.roleId);
      if (!role || !role.editable) return;

      if (reactionRole.type === 'toggle') {
        if (member.roles.cache.has(reactionRole.roleId)) {
          await member.roles.remove(role, 'Reaction role toggle off');
        } else {
          await member.roles.add(role, 'Reaction role toggle on');
        }
      } else {
        await member.roles.add(role, 'Reaction role add');
      }
    } catch (err) {
      logger.error({ err }, 'ReactionRoles: Failed to add role');
    }
  }

  static async handleReactionRemove(reaction: MessageReaction, user: User): Promise<void> {
    if (user.bot) return;
    if (!reaction.message.guild) return;

    const guild = reaction.message.guild;
    const emoji = reaction.emoji.id ?? reaction.emoji.name;
    if (!emoji) return;

    const reactionRole = await prisma.reactionRole.findUnique({
      where: { messageId_emoji: { messageId: reaction.message.id, emoji } },
    });

    if (!reactionRole) return;
    if (reactionRole.type !== 'toggle' && reactionRole.type !== 'remove') return;

    try {
      const member = await guild.members.fetch(user.id);
      const role = guild.roles.cache.get(reactionRole.roleId);
      if (!role || !role.editable) return;

      await member.roles.remove(role, 'Reaction role remove');
    } catch (err) {
      logger.error({ err }, 'ReactionRoles: Failed to remove role');
    }
  }
}
