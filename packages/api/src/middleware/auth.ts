import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database.js';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      isStaff: boolean;
      isBotOwner: boolean;
    };
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as { sub: string };

    const user = await prisma.portalUser.findUnique({ where: { id: payload.sub } });
    if (!user) {
      reply.code(401).send({ success: false, error: 'User not found' });
      return;
    }

    request.user = {
      id: user.id,
      username: user.username,
      isStaff: user.isStaff,
      isBotOwner: user.isBotOwner,
    };
  } catch {
    reply.code(401).send({ success: false, error: 'Unauthorized' });
  }
}

export async function requireStaff(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (reply.sent) return;

  if (!request.user?.isStaff && !request.user?.isBotOwner) {
    reply.code(403).send({ success: false, error: 'Forbidden: Staff access required' });
  }
}

export async function requireBotOwner(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (reply.sent) return;

  if (!request.user?.isBotOwner) {
    reply.code(403).send({ success: false, error: 'Forbidden: Bot owner access required' });
  }
}

export async function requireGuildAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (reply.sent) return;

  const { guildId } = request.params as { guildId?: string };
  if (!guildId) {
    reply.code(400).send({ success: false, error: 'Guild ID required' });
    return;
  }

  // Staff and bot owners always have access
  if (request.user?.isStaff || request.user?.isBotOwner) return;

  // Check if user is admin in the guild via Discord API
  const user = await prisma.portalUser.findUnique({ where: { id: request.user!.id } });
  if (!user?.accessToken) {
    reply.code(403).send({ success: false, error: 'No Discord access token' });
    return;
  }

  try {
    const { default: axios } = await import('axios');
    const guildsRes = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    const guild = guildsRes.data.find((g: { id: string; permissions: string }) => g.id === guildId);
    if (!guild) {
      reply.code(403).send({ success: false, error: 'You are not a member of this guild' });
      return;
    }

    const ADMINISTRATOR = BigInt(0x8);
    const hasAdmin = (BigInt(guild.permissions) & ADMINISTRATOR) === ADMINISTRATOR;

    if (!hasAdmin && guild.owner !== true) {
      reply.code(403).send({ success: false, error: 'Administrator permission required' });
    }
  } catch {
    reply.code(500).send({ success: false, error: 'Failed to verify guild permissions' });
  }
}
