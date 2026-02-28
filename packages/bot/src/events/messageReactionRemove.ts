import type { MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import type { BotEvent } from '../types.js';
import { ReactionRolesModule } from '../modules/reactionRoles/ReactionRolesModule.js';

const event: BotEvent = {
  name: 'messageReactionRemove',
  async execute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }
    if (user.partial) {
      try {
        await user.fetch();
      } catch {
        return;
      }
    }

    await ReactionRolesModule.handleReactionRemove(
      reaction as MessageReaction,
      user as User
    );
  },
};

export default event;
