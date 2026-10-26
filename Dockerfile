# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:20-bookworm-slim

# ---- deps: 依存インストール（postinstall の prisma generate には schema が必要）----
FROM ${NODE_IMAGE} AS deps
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: next build（standalone 出力）----
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ---- migrate: prisma migrate deploy 専用（Cloud Run Job 用）----
FROM ${NODE_IMAGE} AS migrate
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package-lock.json /tmp/package-lock.json
# prisma CLI のみ（lock と同一バージョン）を /opt/prisma-cli に導入する。
# /app に package.json を置くと全依存が入ってしまうため別ディレクトリにする
RUN PRISMA_VERSION=$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version") \
    && npm install --prefix /opt/prisma-cli --no-save --no-package-lock --no-audit --no-fund prisma@${PRISMA_VERSION} \
    && npm cache clean --force && rm /tmp/package-lock.json
ENV PATH=/opt/prisma-cli/node_modules/.bin:$PATH
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations
RUN chown -R node:node /app
USER node
CMD ["prisma", "migrate", "deploy"]

# ---- runner: アプリ本体（既定ターゲット）----
FROM ${NODE_IMAGE} AS runner
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 8080
CMD ["node", "server.js"]
