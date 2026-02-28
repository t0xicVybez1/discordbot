FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY tsconfig.base.json ./

COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm db:generate

COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

RUN pnpm --filter @discordbot/shared build
RUN pnpm --filter @discordbot/api build

EXPOSE 4000

CMD ["sh", "-c", "pnpm db:migrate && node packages/api/dist/index.js"]
