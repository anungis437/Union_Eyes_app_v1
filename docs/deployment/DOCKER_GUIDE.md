# Docker Configuration Guide

## Overview

UnionEyes provides multiple Docker configurations for different deployment scenarios:

```
Union_Eyes_app_v1/
├── Dockerfile                  # Production multi-stage build (with workspaces)
├── Dockerfile.simple           # Simple production (pre-built .next)
├── Dockerfile.staging          # Staging environment optimized build
├── docker-compose.yml          # Development environment
├── docker-compose.staging.yml  # Staging environment
└── docker-compose.prod.yml     # Production environment
```

---

## Dockerfiles Comparison

### 1. **Dockerfile** (Full Production Build)

**Purpose:** Production deployment with workspace packages  
**Build Time:** ~10-15 minutes  
**Image Size:** Larger (~500MB+)

**Features:**
- Multi-stage build with separate deps/builder stages
- Builds workspace packages (`@unioneyes/ai`, etc.)
- Full monorepo support with pnpm workspaces
- Security hardening (non-root user)

**When to Use:**
- Production deployments with custom workspace packages
- When workspace packages need to be built from source
- Full CI/CD pipeline deployments

**Build Command:**
```bash
docker build -f Dockerfile -t unioneyes:prod .
```

**Pros:**
- ✅ Complete build from source
- ✅ Workspace packages included
- ✅ Reproducible builds

**Cons:**
- ⏱️ Longer build time
- 💾 Larger image size

---

### 2. **Dockerfile.simple** (Lightweight Production)

**Purpose:** Fast deployment with pre-built artifacts  
**Build Time:** ~2-3 minutes  
**Image Size:** Smaller (~200MB)

**Features:**
- Uses pre-built `.next` directory
- Production dependencies only (`--prod`)
- Minimal runtime footprint
- Non-root user security

**When to Use:**
- Cloud platforms with separate build/deploy steps (Vercel, Railway)
- CI/CD where Next.js is built separately
- Fastest deployment times needed

**Build Command:**
```bash
# Build Next.js first
pnpm build

# Build Docker image
docker build -f Dockerfile.simple -t unioneyes:simple .
```

**Pros:**
- ⚡ Very fast build
- 💾 Smaller image size
- 🎯 Minimal runtime

**Cons:**
- ⚠️ Requires pre-built .next directory
- ⚠️ Build step must happen separately

---

### 3. **Dockerfile.staging** (Staging Optimized)

**Purpose:** Staging environment with faster iteration  
**Build Time:** ~5-8 minutes  
**Image Size:** Medium (~350MB)

**Features:**
- Optimized for staging environment
- Skips workspace package builds
- Supports build-time environment variables
- Staging-specific optimizations

**When to Use:**
- Staging/QA environments
- Testing before production
- Demo environments

**Build Command:**
```bash
docker build -f Dockerfile.staging \
  --build-arg NEXT_PUBLIC_APP_URL=https://staging.unioneyes.com \
  -t unioneyes:staging .
```

**Pros:**
- ⚖️ Balanced build time and features
- 🔧 Environment-specific configs
- 🧪 Good for testing

**Cons:**
- ⚠️ Not recommended for production
- ⚠️ Less optimization than full build

---

## Docker Compose Configurations

### 1. **docker-compose.yml** (Development)

**Purpose:** Local development environment

**Services:**
- Next.js app with hot reload
- PostgreSQL database
- Redis (if needed)
- Volume mounts for live code changes

**Usage:**
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Environment:**
- Hot reload enabled
- Debug logging
- Development database
- No SSL/TLS

---

### 2. **docker-compose.staging.yml** (Staging)

**Purpose:** Staging environment deployment

**Services:**
- Next.js app (built from Dockerfile.staging)
- PostgreSQL or external database connection
- Optional Redis cache

**Usage:**
```bash
# Deploy staging
docker-compose -f docker-compose.staging.yml up -d

# View logs
docker-compose -f docker-compose.staging.yml logs -f

# Restart service
docker-compose -f docker-compose.staging.yml restart app
```

**Environment:**
- Production build mode
- Staging database
- Logging to files
- Basic monitoring

---

### 3. **docker-compose.prod.yml** (Production)

**Purpose:** Production deployment (if using Docker Compose)

**Services:**
- Next.js app (optimized production build)
- External database connection
- Redis cache
- Health checks
- Resource limits

**Usage:**
```bash
# Deploy production (not recommended for actual prod)
docker-compose -f docker-compose.prod.yml up -d

# Health check
docker-compose -f docker-compose.prod.yml ps

# Scale service
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

**Note:** For real production, consider Kubernetes, ECS, or managed platforms instead of Docker Compose.

---

## Build Strategies

### Strategy 1: Local Build + Docker Deploy

**Best for:** Simple deployments, single-server

```bash
# 1. Build Next.js locally
pnpm build

# 2. Build Docker image
docker build -f Dockerfile.simple -t unioneyes:latest .

# 3. Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=$DATABASE_URL \
  -e CLERK_SECRET_KEY=$CLERK_SECRET_KEY \
  unioneyes:latest
```

---

### Strategy 2: Full Docker Build

**Best for:** Reproducible builds, CI/CD

```bash
# Build everything in Docker
docker build -f Dockerfile -t unioneyes:prod .

# Run with env file
docker run -p 3000:3000 --env-file .env.production unioneyes:prod
```

---

### Strategy 3: Multi-Stage with Cache

**Best for:** Fast iterations, CI/CD optimization

```bash
# Use BuildKit for better caching
DOCKER_BUILDKIT=1 docker build \
  --cache-from unioneyes:cache \
  -f Dockerfile \
  -t unioneyes:latest \
  --target production .
```

---

## Environment Variables in Docker

### Method 1: .env File

```bash
# Create .env.production
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_...
STRIPE_SECRET_KEY=sk_...

# Use with docker run
docker run --env-file .env.production unioneyes:prod

# Use with docker-compose
docker-compose --env-file .env.production up
```

### Method 2: Build Arguments

```dockerfile
# In Dockerfile
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
```

```bash
# Pass at build time
docker build --build-arg NEXT_PUBLIC_APP_URL=https://app.com -t app .
```

### Method 3: Runtime Environment

```bash
# Pass directly to docker run
docker run \
  -e DATABASE_URL="postgresql://..." \
  -e CLERK_SECRET_KEY="sk_..." \
  unioneyes:prod
```

---

## Recommended Production Setup

### ⚠️ Docker Compose Not Recommended for Production

**Use instead:**

#### Option A: Vercel (Recommended)
```bash
# Deploy to Vercel
vercel --prod
```

#### Option B: Kubernetes
```yaml
# Deploy with Kubernetes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unioneyes
spec:
  replicas: 3
  selector:
    matchLabels:
      app: unioneyes
  template:
    spec:
      containers:
      - name: app
        image: unioneyes:prod
        ports:
        - containerPort: 3000
```

#### Option C: AWS ECS/Fargate
```bash
# Deploy to ECS
aws ecs create-service \
  --cluster production \
  --service-name unioneyes \
  --task-definition unioneyes:1 \
  --desired-count 2
```

---

## Optimization Tips

### 1. Multi-Stage Builds

Always use multi-stage builds to reduce image size:

```dockerfile
FROM node:20-alpine AS deps
# Install deps

FROM node:20-alpine AS builder
COPY --from=deps /app/node_modules ./node_modules
# Build app

FROM node:20-alpine AS production
COPY --from=builder /app/.next ./.next
# Runtime only
```

### 2. Layer Caching

Order Dockerfile commands from least to most changing:

```dockerfile
# ✅ Good order
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm build

# ❌ Bad order (invalidates cache)
COPY . .
RUN pnpm install
RUN pnpm build
```

### 3. .dockerignore

Create `.dockerignore` to exclude unnecessary files:

```
node_modules
.next
.git
.env.local
*.log
.vscode
__tests__
coverage
```

### 4. Security

```dockerfile
# Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Use specific node version
FROM node:20.11-alpine  # Not 'latest'

# Scan for vulnerabilities
docker scan unioneyes:prod
```

---

## Troubleshooting

### Build Fails: "Cannot find module"

**Solution:** Check workspace dependencies are installed

```bash
pnpm install --frozen-lockfile
pnpm --filter @unioneyes/ai build
```

### Container Starts But Crashes

**Check logs:**
```bash
docker logs <container-id>
docker logs -f <container-id>  # Follow logs
```

**Common issues:**
- Missing environment variables
- Database connection failure
- Port already in use

### Slow Build Times

**Use BuildKit:**
```bash
export DOCKER_BUILDKIT=1
docker build -t app .
```

**Check layer caching:**
```bash
docker build --no-cache -t app .  # Force rebuild
```

### Image Size Too Large

**Check what's taking space:**
```bash
docker history unioneyes:prod
```

**Solutions:**
- Use alpine base images
- Multi-stage builds
- Remove dev dependencies
- Use .dockerignore

---

## Health Checks

Add health checks to Docker Compose:

```yaml
services:
  app:
    image: unioneyes:prod
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## Resource Limits

Set resource limits in Docker Compose:

```yaml
services:
  app:
    image: unioneyes:prod
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Quick Reference

| Dockerfile | Purpose | Build Time | Use Case |
|------------|---------|------------|----------|
| `Dockerfile` | Full production | ~10-15 min | Production with workspaces |
| `Dockerfile.simple` | Lightweight | ~2-3 min | Pre-built deployments |
| `Dockerfile.staging` | Staging optimized | ~5-8 min | Staging/QA environments |

| Compose File | Environment | Services | Use Case |
|--------------|-------------|----------|----------|
| `docker-compose.yml` | Development | App + DB | Local development |
| `docker-compose.staging.yml` | Staging | App | Staging deployment |
| `docker-compose.prod.yml` | Production | App + Cache | Production (not recommended) |

---

**For Production:** Use Vercel, Kubernetes, or AWS ECS instead of Docker Compose.  
**Last Updated:** February 6, 2026
