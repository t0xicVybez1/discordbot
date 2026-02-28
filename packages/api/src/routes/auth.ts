import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/AuthService.js';
import { redis } from '../redis.js';
import { requireAuth } from '../middleware/auth.js';
import { randomBytes } from 'crypto';

export async function authRoutes(server: FastifyInstance): Promise<void> {
  // GET /auth/url - Get Discord OAuth2 URL
  server.get('/auth/url', async (request, reply) => {
    const state = randomBytes(16).toString('hex');
    await redis.setex(`oauth:state:${state}`, 300, '1');
    const url = AuthService.getOAuthUrl(state);
    return reply.send({ success: true, data: { url, state } });
  });

  // POST /auth/callback - Exchange code for tokens
  server.post('/auth/callback', async (request, reply) => {
    const parsed = z.object({ code: z.string(), state: z.string() }).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid request body' });
    }
    const { code, state } = parsed.data;

    // Validate state
    const valid = await redis.del(`oauth:state:${state}`);
    if (!valid) {
      return reply.code(400).send({ success: false, error: 'Invalid state parameter' });
    }

    try {
      const tokens = await AuthService.exchangeCode(code);
      const discordUser = await AuthService.getDiscordUser(tokens.access_token);
      const user = await AuthService.upsertUser(discordUser, tokens);
      const jwtTokens = await AuthService.generateTokens(server, user.id);

      return reply.send({
        success: true,
        data: {
          user,
          accessToken: jwtTokens.accessToken,
          refreshToken: jwtTokens.refreshToken,
          expiresIn: 900,
        },
      });
    } catch (err) {
      server.log.error(err);
      return reply.code(500).send({ success: false, error: 'OAuth2 exchange failed' });
    }
  });

  // POST /auth/refresh - Refresh access token
  server.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) {
      return reply.code(400).send({ success: false, error: 'Refresh token required' });
    }

    const tokens = await AuthService.refreshTokens(server, refreshToken);
    if (!tokens) {
      return reply.code(401).send({ success: false, error: 'Invalid or expired refresh token' });
    }

    return reply.send({ success: true, data: { ...tokens, expiresIn: 900 } });
  });

  // POST /auth/logout
  server.post('/auth/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };
    if (refreshToken) await AuthService.logout(refreshToken);
    return reply.send({ success: true, message: 'Logged out' });
  });

  // GET /auth/me
  server.get('/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const { prisma } = await import('../database.js');
    const user = await prisma.portalUser.findUnique({ where: { id: request.user!.id } });
    if (!user) return reply.code(404).send({ success: false, error: 'User not found' });

    return reply.send({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        email: user.email,
        isStaff: user.isStaff,
        isBotOwner: user.isBotOwner,
      },
    });
  });
}
