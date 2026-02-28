import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { sub, pub } from '../redis.js';
import { logger } from '../logger.js';
import type { WebSocketEvent } from '@discordbot/shared';

interface WSClient {
  ws: WebSocket;
  userId: string;
  guildIds: Set<string>;
  isStaff: boolean;
}

const clients = new Map<string, WSClient>();

export async function setupWebSocket(server: FastifyInstance): Promise<void> {
  // Subscribe to bot events
  await sub.subscribe('bot:events');
  await sub.subscribe('api:ws:broadcast');

  sub.on('message', (channel, message) => {
    try {
      const event = JSON.parse(message) as WebSocketEvent;
      broadcastEvent(event);
    } catch (err) {
      logger.error({ err }, 'Failed to parse Redis message');
    }
  });

  server.get('/ws', { websocket: true }, (socket, request) => {
    let client: WSClient | null = null;
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    logger.debug(`WebSocket client connected: ${clientId}`);

    socket.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          token?: string;
          guildIds?: string[];
        };

        if (msg.type === 'auth') {
          // Verify JWT
          try {
            const payload = server.jwt.verify<{ sub: string }>(msg.token ?? '');
            const { prisma } = await import('../database.js');
            const user = await prisma.portalUser.findUnique({ where: { id: payload.sub } });

            if (!user) {
              socket.send(JSON.stringify({ type: 'auth:error', error: 'User not found' }));
              socket.close();
              return;
            }

            client = {
              ws: socket as unknown as WebSocket,
              userId: user.id,
              guildIds: new Set(msg.guildIds ?? []),
              isStaff: user.isStaff || user.isBotOwner,
            };

            clients.set(clientId, client);
            socket.send(JSON.stringify({ type: 'auth:success', userId: user.id }));
            logger.debug(`WebSocket authenticated: ${user.username}`);
          } catch {
            socket.send(JSON.stringify({ type: 'auth:error', error: 'Invalid token' }));
            socket.close();
          }
        } else if (msg.type === 'subscribe:guilds' && client) {
          // Update guild subscriptions
          client.guildIds = new Set(msg.guildIds ?? []);
          socket.send(JSON.stringify({ type: 'subscribed', guildIds: [...client.guildIds] }));
        } else if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        logger.debug('Invalid WebSocket message');
      }
    });

    socket.on('close', () => {
      clients.delete(clientId);
      logger.debug(`WebSocket client disconnected: ${clientId}`);
    });

    socket.on('error', (err) => {
      logger.error({ err }, 'WebSocket error');
      clients.delete(clientId);
    });
  });
}

function broadcastEvent(event: WebSocketEvent): void {
  const message = JSON.stringify(event);

  for (const [, client] of clients) {
    try {
      if (client.ws.readyState !== 1) continue; // OPEN = 1

      // Filter by guild
      if (event.guildId) {
        if (client.isStaff || client.guildIds.has(event.guildId)) {
          client.ws.send(message);
        }
      } else {
        // Global event: send to all or staff
        if (client.isStaff) {
          client.ws.send(message);
        }
      }
    } catch {
      // Client may have closed
    }
  }
}

export async function broadcastToGuild(guildId: string, event: Omit<WebSocketEvent, 'guildId'>): Promise<void> {
  const fullEvent: WebSocketEvent = { ...event, guildId, timestamp: Date.now() };
  await pub.publish('api:ws:broadcast', JSON.stringify(fullEvent));
}

export function getConnectedClientCount(): number {
  return clients.size;
}
