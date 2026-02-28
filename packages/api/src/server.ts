import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyWebSocket from '@fastify/websocket';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { config } from './config.js';
import { logger } from './logger.js';
import { connectRedis, redis } from './redis.js';
import { authRoutes } from './routes/auth.js';
import { guildRoutes } from './routes/guilds.js';
import { settingsRoutes } from './routes/settings.js';
import { moderationRoutes } from './routes/moderation.js';
import { addonRoutes } from './routes/addons.js';
import { adminRoutes } from './routes/admin.js';
import { setupWebSocket } from './websocket/gateway.js';
import { collectDefaultMetrics } from 'prom-client';

export async function createServer() {
  // Start collecting Prometheus metrics
  collectDefaultMetrics();

  const server = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.env !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ─── Plugins ──────────────────────────────────────────────────────
  await server.register(fastifyCors, {
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await server.register(fastifyHelmet, {
    contentSecurityPolicy: config.env === 'production',
  });

  await server.register(fastifyRateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (request) =>
      (request.user as { id: string } | undefined)?.id ?? request.ip,
  });

  await server.register(fastifyJwt, {
    secret: config.secret,
    sign: { expiresIn: '15m' },
  });

  await server.register(fastifyCookie, {
    secret: config.secret,
  });

  await server.register(fastifyWebSocket);

  // ─── Routes ───────────────────────────────────────────────────────
  await server.register(authRoutes);
  await server.register(guildRoutes);
  await server.register(settingsRoutes);
  await server.register(moderationRoutes);
  await server.register(addonRoutes);
  await server.register(adminRoutes);

  // ─── WebSocket Gateway ────────────────────────────────────────────
  await setupWebSocket(server);

  // ─── Health Check ─────────────────────────────────────────────────
  server.get('/health', async () => ({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  }));

  // ─── Error Handler ────────────────────────────────────────────────
  server.setErrorHandler((error, request, reply) => {
    logger.error({ err: error, url: request.url }, 'Request error');

    if (error.validation) {
      return reply.code(400).send({ success: false, error: 'Validation error', details: error.validation });
    }

    if (error.statusCode) {
      return reply.code(error.statusCode).send({ success: false, error: error.message });
    }

    return reply.code(500).send({ success: false, error: 'Internal server error' });
  });

  return server;
}
