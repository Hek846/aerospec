# Build stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile --filter @aerospec/api... --filter @aerospec/types...

RUN pnpm --filter @aerospec/types build
RUN pnpm --filter @aerospec/api build

RUN pnpm --filter @aerospec/api --prod deploy /deploy

# Production stage
FROM node:20-bookworm-slim

WORKDIR /app

COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /deploy/package.json ./package.json
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/src/db/migrations ./dist/db/migrations

RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "dist/index.js"]
