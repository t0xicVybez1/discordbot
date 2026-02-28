import type { FastifyInstance } from 'fastify';
import { requireStaff, requireBotOwner } from '../middleware/auth.js';
import { prisma } from '../database.js';
import { register } from 'prom-client';

export async function adminRoutes(server: FastifyInstance): Promise<void> {
  // GET /admin/guilds - All guilds using the bot
  server.get('/admin/guilds', { preHandler: [requireStaff] }, async (request, reply) => {
    const query = request.query as { page?: string; search?: string; active?: string };
    const page = Math.max(0, parseInt(query.page ?? '1') - 1);
    const pageSize = 20;

    const where = {
      ...(query.active !== undefined ? { isActive: query.active === 'true' } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };

    const [guilds, total] = await Promise.all([
      prisma.guild.findMany({
        where,
        orderBy: { joinedAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        include: { settings: { select: { moderationEnabled: true, levelingEnabled: true } } },
      }),
      prisma.guild.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: { items: guilds, total, page: page + 1, pageSize, hasMore: (page + 1) * pageSize < total },
    });
  });

  // GET /admin/stats - System-wide statistics
  server.get('/admin/stats', { preHandler: [requireStaff] }, async (_request, reply) => {
    const [
      totalGuilds,
      activeGuilds,
      totalUsers,
      totalCases,
      totalAddons,
      totalWarnings,
    ] = await Promise.all([
      prisma.guild.count(),
      prisma.guild.count({ where: { isActive: true } }),
      prisma.userLevel.count(),
      prisma.moderationCase.count(),
      prisma.addon.count({ where: { enabled: true } }),
      prisma.warning.count({ where: { active: true } }),
    ]);

    const memUsage = process.memoryUsage();

    return reply.send({
      success: true,
      data: {
        totalGuilds,
        activeGuilds,
        totalUsers,
        totalCases,
        totalAddons,
        totalWarnings,
        uptime: Math.floor(process.uptime()),
        memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024),
        version: '1.0.0',
      },
    });
  });

  // GET /admin/users - Manage portal users
  server.get('/admin/users', { preHandler: [requireStaff] }, async (request, reply) => {
    const query = request.query as { search?: string };

    const users = await prisma.portalUser.findMany({
      where: query.search
        ? { username: { contains: query.search, mode: 'insensitive' } }
        : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        username: true,
        discriminator: true,
        avatar: true,
        isStaff: true,
        isBotOwner: true,
        createdAt: true,
      },
    });

    return reply.send({ success: true, data: users });
  });

  // PATCH /admin/users/:id - Update user permissions
  server.patch('/admin/users/:id', { preHandler: [requireBotOwner] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isStaff } = request.body as { isStaff: boolean };

    const user = await prisma.portalUser.update({
      where: { id },
      data: { isStaff },
    });

    return reply.send({ success: true, data: { id: user.id, username: user.username, isStaff: user.isStaff } });
  });

  // GET /admin/metrics - Prometheus metrics endpoint
  server.get('/admin/metrics', { preHandler: [requireStaff] }, async (_request, reply) => {
    const metrics = await register.metrics();
    return reply.header('Content-Type', register.contentType).send(metrics);
  });

  // GET /admin/logs - Recent system logs
  server.get('/admin/logs', { preHandler: [requireStaff] }, async (request, reply) => {
    const query = request.query as { guildId?: string; type?: string; page?: string };
    const page = Math.max(0, parseInt(query.page ?? '1') - 1);
    const pageSize = 100;

    const where = {
      ...(query.guildId ? { guildId: query.guildId } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.logEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.logEntry.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: { items: entries, total, page: page + 1, pageSize, hasMore: (page + 1) * pageSize < total },
    });
  });
}
