FROM node:22-bookworm-slim

# Prisma needs OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# The worker starts sandbox containers through the host's Docker socket
COPY --from=docker:28.3.3-cli /usr/local/bin/docker /usr/local/bin/docker

# pnpm version comes from "packageManager" in package.json
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000
# Migrations and seeding are idempotent, so they run on every start
# exec: Next.js replaces the shell, so it gets the stop signal and can save
# live drafts before the container stops
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm seed && exec ./node_modules/.bin/next start"]
