import type { FastifyInstance } from 'fastify';
import { requireGuildAdmin } from '../middleware/auth.js';
import { SettingsService } from '../services/SettingsService.js';
import { prisma } from '../database.js';

export async function settingsRoutes(server: FastifyInstance): Promise<void> {
  // GET /guilds/:guildId/settings
  server.get('/guilds/:guildId/settings', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const settings = await SettingsService.getGuildSettings(guildId);
    if (!settings) {
      return reply.code(404).send({ success: false, error: 'Settings not found' });
    }
    return reply.send({ success: true, data: settings });
  });

  // PATCH /guilds/:guildId/settings
  server.patch('/guilds/:guildId/settings', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const data = request.body as Record<string, unknown>;

    const updated = await SettingsService.updateGuildSettings(guildId, data);
    return reply.send({ success: true, data: updated });
  });

  // GET /guilds/:guildId/settings/automod
  server.get('/guilds/:guildId/settings/automod', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const config = await SettingsService.getAutoModConfig(guildId);
    return reply.send({ success: true, data: config ?? {} });
  });

  // PATCH /guilds/:guildId/settings/automod
  server.patch('/guilds/:guildId/settings/automod', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const data = request.body as Record<string, unknown>;

    const updated = await SettingsService.updateAutoModConfig(guildId, data);
    return reply.send({ success: true, data: updated });
  });

  // GET /guilds/:guildId/settings/welcome
  server.get('/guilds/:guildId/settings/welcome', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const config = await SettingsService.getWelcomeConfig(guildId);
    return reply.send({ success: true, data: config ?? {} });
  });

  // PATCH /guilds/:guildId/settings/welcome
  server.patch('/guilds/:guildId/settings/welcome', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const data = request.body as Record<string, unknown>;

    const updated = await SettingsService.updateWelcomeConfig(guildId, data);
    return reply.send({ success: true, data: updated });
  });

  // GET /guilds/:guildId/reaction-roles
  server.get('/guilds/:guildId/reaction-roles', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const roles = await prisma.reactionRole.findMany({ where: { guildId } });
    return reply.send({ success: true, data: roles });
  });

  // POST /guilds/:guildId/reaction-roles
  server.post('/guilds/:guildId/reaction-roles', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const { channelId, messageId, emoji, roleId, type } = request.body as {
      channelId: string;
      messageId: string;
      emoji: string;
      roleId: string;
      type: 'toggle' | 'add' | 'remove';
    };

    const role = await prisma.reactionRole.create({
      data: { guildId, channelId, messageId, emoji, roleId, type: type ?? 'toggle' },
    });

    return reply.code(201).send({ success: true, data: role });
  });

  // DELETE /guilds/:guildId/reaction-roles/:id
  server.delete('/guilds/:guildId/reaction-roles/:id', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId, id } = request.params as { guildId: string; id: string };

    const existing = await prisma.reactionRole.findFirst({ where: { id, guildId } });
    if (!existing) return reply.code(404).send({ success: false, error: 'Reaction role not found' });

    await prisma.reactionRole.delete({ where: { id } });
    return reply.send({ success: true, message: 'Deleted' });
  });
}
