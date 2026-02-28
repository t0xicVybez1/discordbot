import type { FastifyInstance } from 'fastify';
import { requireGuildAdmin, requireStaff } from '../middleware/auth.js';
import { prisma } from '../database.js';
import { pub } from '../redis.js';

export async function addonRoutes(server: FastifyInstance): Promise<void> {
  // GET /addons - List all available addons
  server.get('/addons', async (_request, reply) => {
    const addons = await prisma.addon.findMany({
      where: { enabled: true },
      orderBy: { displayName: 'asc' },
    });
    return reply.send({ success: true, data: addons });
  });

  // GET /guilds/:guildId/addons - List addons installed in a guild
  server.get('/guilds/:guildId/addons', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId } = request.params as { guildId: string };

    const guildAddons = await prisma.guildAddon.findMany({
      where: { guildId },
      include: { addon: true },
    });

    return reply.send({ success: true, data: guildAddons });
  });

  // POST /guilds/:guildId/addons/:addonId - Install addon
  server.post('/guilds/:guildId/addons/:addonId', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId, addonId } = request.params as { guildId: string; addonId: string };

    const addon = await prisma.addon.findUnique({ where: { id: addonId } });
    if (!addon) return reply.code(404).send({ success: false, error: 'Addon not found' });
    if (!addon.enabled) return reply.code(400).send({ success: false, error: 'Addon is disabled' });

    const existing = await prisma.guildAddon.findUnique({
      where: { guildId_addonId: { guildId, addonId } },
    });
    if (existing) return reply.code(409).send({ success: false, error: 'Addon already installed' });

    const guildAddon = await prisma.guildAddon.create({
      data: { guildId, addonId, enabled: true, settings: {} },
      include: { addon: true },
    });

    // Notify bot
    await pub.publish('api:events', JSON.stringify({
      type: 'addon:install',
      data: { guildId, addonName: addon.name },
    }));

    return reply.code(201).send({ success: true, data: guildAddon });
  });

  // DELETE /guilds/:guildId/addons/:addonId - Uninstall addon
  server.delete('/guilds/:guildId/addons/:addonId', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId, addonId } = request.params as { guildId: string; addonId: string };

    const existing = await prisma.guildAddon.findUnique({
      where: { guildId_addonId: { guildId, addonId } },
      include: { addon: true },
    });
    if (!existing) return reply.code(404).send({ success: false, error: 'Addon not installed' });

    await prisma.guildAddon.delete({ where: { guildId_addonId: { guildId, addonId } } });

    await pub.publish('api:events', JSON.stringify({
      type: 'addon:uninstall',
      data: { guildId, addonName: existing.addon.name },
    }));

    return reply.send({ success: true, message: 'Addon uninstalled' });
  });

  // GET /guilds/:guildId/addons/:addonId/settings
  server.get('/guilds/:guildId/addons/:addonId/settings', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId, addonId } = request.params as { guildId: string; addonId: string };

    const guildAddon = await prisma.guildAddon.findUnique({
      where: { guildId_addonId: { guildId, addonId } },
      include: { addon: true },
    });
    if (!guildAddon) return reply.code(404).send({ success: false, error: 'Addon not installed' });

    return reply.send({ success: true, data: guildAddon.settings });
  });

  // PATCH /guilds/:guildId/addons/:addonId/settings
  server.patch('/guilds/:guildId/addons/:addonId/settings', { preHandler: [requireGuildAdmin] }, async (request, reply) => {
    const { guildId, addonId } = request.params as { guildId: string; addonId: string };
    const settings = request.body as Record<string, unknown>;

    const guildAddon = await prisma.guildAddon.update({
      where: { guildId_addonId: { guildId, addonId } },
      data: { settings },
      include: { addon: true },
    });

    // Notify bot of settings update
    await pub.publish('api:events', JSON.stringify({
      type: 'addon:settings-update',
      data: { guildId, addonName: guildAddon.addon.name, settings },
    }));

    return reply.send({ success: true, data: guildAddon.settings });
  });

  // ─── Staff-only routes ───────────────────────────────────

  // POST /admin/addons - Register a new addon
  server.post('/admin/addons', { preHandler: [requireStaff] }, async (request, reply) => {
    const data = request.body as {
      name: string;
      displayName: string;
      version: string;
      description: string;
      author: string;
      homepage?: string;
      manifest: object;
    };

    const existing = await prisma.addon.findUnique({ where: { name: data.name } });
    if (existing) return reply.code(409).send({ success: false, error: 'Addon already exists' });

    const addon = await prisma.addon.create({ data });
    return reply.code(201).send({ success: true, data: addon });
  });

  // PATCH /admin/addons/:id - Update addon
  server.patch('/admin/addons/:id', { preHandler: [requireStaff] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as Record<string, unknown>;

    const addon = await prisma.addon.update({ where: { id }, data });
    return reply.send({ success: true, data: addon });
  });
}
