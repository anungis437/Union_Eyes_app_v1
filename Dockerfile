# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files for all workspaces
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/

# Install dependencies (will install for all workspaces)
RUN pnpm install --frozen-lockfile

# Copy workspace package source code
COPY packages ./packages

# Reinstall to ensure workspace package node_modules are populated
# (previous install only had package.json, now we have full source)
RUN pnpm install --frozen-lockfile

# Build workspace packages
RUN pnpm --filter @unioneyes/ai build

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies and built packages from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

# Copy application source code
COPY . .

# Set build-time environment variables (public values only - no secrets)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Stub environment variables for build-time only (prevent module initialization errors)
# SECURITY: These are placeholder values only. Real secrets MUST be passed at runtime
# via docker-compose environment or deployment configuration.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder_service_role_key
ENV RESEND_API_KEY=re_placeholder_key
ENV STRIPE_SECRET_KEY=sk_test_placeholder
ENV AZURE_SPEECH_KEY=placeholder_speech_key
ENV AZURE_SPEECH_REGION=canadacentral
ENV WEBHOOK_KEY=placeholder_webhook_key
ENV WHOP_WEBHOOK_KEY=placeholder_whop_webhook_key

# Build the application (workspace packages already built in deps stage)
# Exclude financial-service (standalone service with missing dependencies)
# Build workspace packages
RUN pnpm build --filter='!financial-service'

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install pnpm and curl for health checks
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

# Copy public folder if it exists (optional)
RUN mkdir -p /app/public

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check - verify the app is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["pnpm", "start"]
