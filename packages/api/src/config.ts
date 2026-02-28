import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string, defaultValue = ''): string {
  return process.env[name] ?? defaultValue;
}

export const config = {
  port: parseInt(optional('API_PORT', '4000')),
  host: optional('API_HOST', '0.0.0.0'),
  secret: required('API_SECRET'),

  discord: {
    clientId: required('DISCORD_CLIENT_ID'),
    clientSecret: required('DISCORD_CLIENT_SECRET'),
    redirectUri: optional('DISCORD_REDIRECT_URI', 'http://localhost:3000/auth/callback'),
    botToken: optional('DISCORD_TOKEN', ''),
  },

  database: {
    url: required('DATABASE_URL'),
  },

  redis: {
    url: optional('REDIS_URL', 'redis://localhost:6379'),
    password: optional('REDIS_PASSWORD'),
  },

  owners: optional('BOT_OWNER_IDS', '').split(',').filter(Boolean),
  env: optional('NODE_ENV', 'development'),
  logLevel: optional('LOG_LEVEL', 'info'),

  cors: {
    origin: optional('CORS_ORIGIN', 'http://localhost:3000'),
  },

  jwt: {
    accessExpiry: '15m',
    refreshExpiry: '7d',
  },
};
