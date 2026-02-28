FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY tsconfig.base.json ./

# Copy package manifests
COPY packages/shared/package.json ./packages/shared/
COPY packages/addon-sdk/package.json ./packages/addon-sdk/
COPY packages/bot/package.json ./packages/bot/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN pnpm db:generate

# Copy source
COPY packages/shared ./packages/shared
COPY packages/addon-sdk ./packages/addon-sdk
COPY packages/bot ./packages/bot
COPY addons ./addons

# Build
RUN pnpm --filter @discordbot/shared build
RUN pnpm --filter @discordbot/addon-sdk build
RUN pnpm --filter @discordbot/bot build
RUN cd addons && for d in */; do cd "$d" && pnpm build 2>/dev/null || true && cd ..; done

CMD ["node", "packages/bot/dist/index.js"]
