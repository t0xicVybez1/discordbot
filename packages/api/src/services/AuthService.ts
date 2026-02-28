import axios from 'axios';
import { prisma } from '../database.js';
import { config } from '../config.js';
import type { FastifyInstance } from 'fastify';
import type { LoginResponse, PortalUser } from '@discordbot/shared';

const DISCORD_API = 'https://discord.com/api/v10';

interface DiscordTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

export class AuthService {
  static getOAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.discord.clientId,
      redirect_uri: config.discord.redirectUri,
      response_type: 'code',
      scope: 'identify email guilds',
      state,
    });
    return `https://discord.com/api/oauth2/authorize?${params}`;
  }

  static async exchangeCode(code: string): Promise<DiscordTokenResponse> {
    const params = new URLSearchParams({
      client_id: config.discord.clientId,
      client_secret: config.discord.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.discord.redirectUri,
    });

    const response = await axios.post<DiscordTokenResponse>(
      `${DISCORD_API}/oauth2/token`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return response.data;
  }

  static async getDiscordUser(accessToken: string): Promise<DiscordUser> {
    const response = await axios.get<DiscordUser>(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  static async upsertUser(discordUser: DiscordUser, tokens: DiscordTokenResponse): Promise<PortalUser> {
    const tokenExpires = new Date(Date.now() + tokens.expires_in * 1000);
    const isBotOwner = config.owners.includes(discordUser.id);

    const user = await prisma.portalUser.upsert({
      where: { id: discordUser.id },
      update: {
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        email: discordUser.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpires,
        isBotOwner,
      },
      create: {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        email: discordUser.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpires,
        isBotOwner,
      },
    });

    return {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar ?? undefined,
      email: user.email ?? undefined,
      isStaff: user.isStaff,
      isBotOwner: user.isBotOwner,
    };
  }

  static async generateTokens(
    server: FastifyInstance,
    userId: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = server.jwt.sign({ sub: userId }, { expiresIn: '15m' });
    const refreshToken = server.jwt.sign({ sub: userId, type: 'refresh' }, { expiresIn: '7d' });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await prisma.userSession.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  static async refreshTokens(
    server: FastifyInstance,
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const session = await prisma.userSession.findUnique({ where: { token: refreshToken } });
    if (!session || session.expiresAt < new Date()) return null;

    try {
      const payload = server.jwt.verify<{ sub: string; type: string }>(refreshToken);
      if (payload.type !== 'refresh') return null;

      // Delete old session
      await prisma.userSession.delete({ where: { id: session.id } });

      // Generate new tokens
      return this.generateTokens(server, session.userId);
    } catch {
      return null;
    }
  }

  static async logout(refreshToken: string): Promise<void> {
    await prisma.userSession.deleteMany({ where: { token: refreshToken } });
  }
}
