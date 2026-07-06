# Build stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile --filter @aerospec/web... --filter @aerospec/types...

RUN pnpm --filter @aerospec/types build
RUN pnpm --filter @aerospec/web build

# Production stage - serve with nginx
FROM nginx:1.25-alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
