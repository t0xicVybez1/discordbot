import { redis } from '../redis.js';
import { prisma } from '../database.js';
import { REDIS_KEYS } from '@discordbot/shared';
import type { GuildSettings } from '@discordbot/shared';

const SETTINGS_TTL = 300; // 5 minutes cache

export async function getGuildSettings(guildId: string): Promise<GuildSettings | null> {
  const cacheKey = REDIS_KEYS.GUILD_SETTINGS(guildId);

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as GuildSettings;
  }

  // Fetch from DB
  const settings = await prisma.guildSettings.findUnique({
    where: { guildId },
  });

  if (!settings) return null;

  const parsed = settings as unknown as GuildSettings;

  // Cache result
  await redis.setex(cacheKey, SETTINGS_TTL, JSON.stringify(parsed));

  return parsed;
}

export async function invalidateSettingsCache(guildId: string): Promise<void> {
  await redis.del(REDIS_KEYS.GUILD_SETTINGS(guildId));
}

export async function ensureGuildExists(
  guildId: string,
  name: string,
  ownerId: string,
  iconUrl?: string
): Promise<void> {
  await prisma.guild.upsert({
    where: { id: guildId },
    update: { name, ownerId, iconUrl, isActive: true, leftAt: null },
    create: {
      id: guildId,
      name,
      ownerId,
      iconUrl,
      settings: {
        create: {},
      },
    },
  });
}

export async function getNextCaseNumber(guildId: string): Promise<number> {
  const lastCase = await prisma.moderationCase.findFirst({
    where: { guildId },
    orderBy: { caseNumber: 'desc' },
  });
  return (lastCase?.caseNumber ?? 0) + 1;
}
