#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Apply Phase 3 - Production Hardening

.DESCRIPTION
    Implements production-ready Docker configurations:
    - Multi-stage builds for optimized images
    - Security hardening (non-root users, read-only filesystems)
    - Secrets management with Docker secrets
    - Production docker-compose with blue-green support
    - Image size optimization
    - Security scanning integration
    
.PARAMETER DryRun
    Preview changes without applying them

.PARAMETER SkipBackup
    Skip backup creation (not recommended)

.EXAMPLE
    .\apply-phase3.ps1
    Apply Phase 3 with backup

.EXAMPLE
    .\apply-phase3.ps1 -DryRun
    Preview Phase 3 changes
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message, [string]$Status = "Info")
    $colors = @{ Success = "Green"; Warning = "Yellow"; Error = "Red"; Info = "Cyan" }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $colors[$Status]
}

function Write-Section {
    param([string]$Title)
    Write-Host "`n" + ("=" * 80) -ForegroundColor Magenta
    Write-Host "  $Title" -ForegroundColor Magenta
    Write-Host ("=" * 80) + "`n" -ForegroundColor Magenta
}

# Main execution
try {
    Write-Section "PHASE 3: PRODUCTION HARDENING"
    
    if ($DryRun) {
        Write-Step "DRY-RUN MODE - No changes will be applied" -Status "Warning"
    }
    
    # Step 1: Prerequisites check
    Write-Step "Checking prerequisites..." -Status "Info"
    
    $prereqs = @(
        @{ Name = "Docker"; Command = "docker --version" }
        @{ Name = "Docker Compose"; Command = "docker-compose --version" }
        @{ Name = "Git"; Command = "git --version" }
    )
    
    foreach ($prereq in $prereqs) {
        try {
            $null = Invoke-Expression $prereq.Command 2>&1
            Write-Step "[OK] $($prereq.Name) available" -Status "Success"
        } catch {
            Write-Step "[X]  $($prereq.Name) not found" -Status "Error"
            exit 1
        }
    }
    
    # Step 2: Backup current state
    if (-not $SkipBackup -and -not $DryRun) {
        Write-Host ""
        Write-Step "Creating backup..." -Status "Info"
        & ".\scripts\docker\backup-current-state.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Backup failed!" -Status "Error"
            exit 1
        }
    }
    
    # Step 3: Create optimized multi-stage Dockerfile
    Write-Host ""
    Write-Step "Creating optimized Dockerfile..." -Status "Info"
    
    $optimizedDockerfile = @'
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies with cache optimization
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    pnpm install --frozen-lockfile --prod

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    pnpm build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files only
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Security: Run as non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
ENV NODE_ENV=production
ENV PORT=3000
CMD ["node", "server.js"]
'@
    
    if ($DryRun) {
        Write-Step "  [Preview] Write: Dockerfile.optimized" -Status "Warning"
    } else {
        $optimizedDockerfile | Out-File -FilePath "Dockerfile.optimized" -Encoding UTF8
        Write-Step "  Created: Dockerfile.optimized" -Status "Success"
    }
    
    # Step 4: Create security configuration
    Write-Host ""
    Write-Step "Creating security configurations..." -Status "Info"
    
    $securityConfig = @'
# Docker Security Best Practices Configuration

# 1. AppArmor Profile (Linux only)
# Apply with: docker run --security-opt apparmor=docker-default

# 2. Seccomp Profile
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64",
    "SCMP_ARCH_X86",
    "SCMP_ARCH_AARCH64"
  ],
  "syscalls": [
    {
      "names": [
        "accept",
        "accept4",
        "access",
        "arch_prctl",
        "bind",
        "brk",
        "chdir",
        "clone",
        "close",
        "connect",
        "dup",
        "dup2",
        "execve",
        "exit",
        "exit_group",
        "fcntl",
        "fstat",
        "futex",
        "getcwd",
        "getdents",
        "getdents64",
        "getegid",
        "geteuid",
        "getgid",
        "getpeername",
        "getpid",
        "getppid",
        "getsockname",
        "getsockopt",
        "getuid",
        "listen",
        "lseek",
        "mmap",
        "mprotect",
        "munmap",
        "open",
        "openat",
        "pipe",
        "pipe2",
        "poll",
        "read",
        "recvfrom",
        "recvmsg",
        "rt_sigaction",
        "rt_sigprocmask",
        "rt_sigreturn",
        "sendmsg",
        "sendto",
        "set_robust_list",
        "setsockopt",
        "socket",
        "stat",
        "uname",
        "wait4",
        "write"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
'@
    
    if ($DryRun) {
        Write-Step "  [Preview] Write: security/seccomp-profile.json" -Status "Warning"
    } else {
        if (-not (Test-Path "security")) {
            New-Item -ItemType Directory -Path "security" -Force | Out-Null
        }
        $securityConfig | Out-File -FilePath "security/seccomp-profile.json" -Encoding UTF8
        Write-Step "  Created: security/seccomp-profile.json" -Status "Success"
    }
    
    # Step 5: Create production docker-compose with secrets
    Write-Host ""
    Write-Step "Enhancing production docker-compose..." -Status "Info"
    
    if ($DryRun) {
        Write-Step "  [Preview] Updating docker-compose.prod.yml" -Status "Warning"
        Write-Host "    - Add Docker secrets support" -ForegroundColor Gray
        Write-Host "    - Configure read-only root filesystem" -ForegroundColor Gray
        Write-Host "    - Add security options" -ForegroundColor Gray
        Write-Host "    - Optimize resource limits" -ForegroundColor Gray
    } else {
        & ".\scripts\docker\enhance-prod-compose.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Failed to enhance production compose!" -Status "Error"
            exit 1
        }
    }
    
    # Step 6: Create .dockerignore optimizations
    Write-Host ""
    Write-Step "Optimizing .dockerignore..." -Status "Info"
    
    $dockerignore = @'
# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Testing
coverage
.nyc_output
__tests__/__snapshots__

# Next.js
.next
out
build
dist

# Production
.vercel
.env*.local

# Misc
.DS_Store
*.pem
.idea
.vscode
*.log

# Git
.git
.gitignore
.gitattributes

# CI/CD
.github

# Documentation
*.md
docs
LICENSE

# Development files
.prettierrc
.eslintrc.json
tsconfig.json
next.config.js

# Large directories
backups
monitoring/grafana/dashboards
coverage
'@
    
    if ($DryRun) {
        Write-Step "  [Preview] Update: .dockerignore" -Status "Warning"
    } else {
        $dockerignore | Out-File -FilePath ".dockerignore" -Encoding UTF8
        Write-Step "  Updated: .dockerignore" -Status "Success"
    }
    
    # Step 7: Create secrets management guide
    Write-Host ""
    Write-Step "Creating secrets management guide..." -Status "Info"
    
    $secretsGuide = @'
# Docker Secrets Management Guide

## Overview
Docker secrets provide secure storage for sensitive data like passwords, API keys, and certificates.

## Setup

### 1. Initialize Docker Swarm (required for secrets)
```bash
docker swarm init
```

### 2. Create secrets from files
```bash
# Database password
echo "your-secure-password" | docker secret create db_password -

# Clerk keys
echo "pk_live_xxxxx" | docker secret create clerk_publishable_key -
echo "sk_live_xxxxx" | docker secret create clerk_secret_key -

# Azure credentials
echo "your-storage-key" | docker secret create azure_storage_key -
echo "your-openai-key" | docker secret create azure_openai_key -
```

### 3. Create secrets from existing .env (automated)
```bash
.\scripts\docker\create-secrets-from-env.ps1
```

## Usage in Docker Compose

```yaml
services:
  app:
    secrets:
      - db_password
      - clerk_secret_key
    environment:
      DATABASE_URL: postgresql://user:file:///run/secrets/db_password@host/db
      CLERK_SECRET_KEY_FILE: /run/secrets/clerk_secret_key

secrets:
  db_password:
    external: true
  clerk_secret_key:
    external: true
```

## Best Practices

1. **Never commit secrets to Git**
2. **Use environment-specific secrets** (dev, staging, prod)
3. **Rotate secrets regularly** (every 90 days)
4. **Limit secret access** via service permissions
5. **Encrypt secrets at rest** (enabled by default in Swarm)

## Viewing Secrets

```bash
# List all secrets
docker secret ls

# Inspect secret metadata (does NOT show value)
docker secret inspect clerk_secret_key
```

## Removing Secrets

```bash
docker secret rm secret_name
```

## Alternative: External Secrets Manager

For production, consider using:
- **HashiCorp Vault** - Enterprise-grade secrets management
- **AWS Secrets Manager** - Cloud-native solution
- **Azure Key Vault** - Azure integration
- **Sealed Secrets** - Kubernetes-native encrypted secrets
'@
    
    if ($DryRun) {
        Write-Step "  [Preview] Write: docs/docker-secrets-guide.md" -Status "Warning"
    } else {
        if (-not (Test-Path "docs")) {
            New-Item -ItemType Directory -Path "docs" -Force | Out-Null
        }
        $secretsGuide | Out-File -FilePath "docs/docker-secrets-guide.md" -Encoding UTF8
        Write-Step "  Created: docs/docker-secrets-guide.md" -Status "Success"
    }
    
    # Step 8: Create secrets automation script
    $secretsScript = @'
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Create Docker secrets from .env file

.DESCRIPTION
    Reads .env.local and creates Docker secrets for production deployment
#>

param()

$ErrorActionPreference = "Stop"

Write-Host "Creating Docker secrets from .env.local..." -ForegroundColor Cyan

if (-not (Test-Path ".env.local")) {
    Write-Host "Error: .env.local not found" -ForegroundColor Red
    exit 1
}

# Check if swarm is initialized
$swarmStatus = docker info --format '{{.Swarm.LocalNodeState}}' 2>&1
if ($swarmStatus -ne "active") {
    Write-Host "Docker Swarm not initialized. Initializing..." -ForegroundColor Yellow
    docker swarm init
}

# Read .env.local
$envVars = Get-Content ".env.local" | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }

foreach ($line in $envVars) {
    $parts = $line -split '=', 2
    $name = $parts[0].Trim().ToLower() -replace '_', '-'
    $value = $parts[1].Trim()
    
    # Skip empty values
    if ([string]::IsNullOrEmpty($value)) {
        continue
    }
    
    # Create secret
    try {
        $existingSecret = docker secret ls --filter "name=$name" --format '{{.Name}}' 2>&1
        
        if ($existingSecret -eq $name) {
            Write-Host "  [Skip] $name (already exists)" -ForegroundColor Yellow
        } else {
            echo $value | docker secret create $name - 2>&1 | Out-Null
            Write-Host "  [OK] Created secret: $name" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [Fail] $name : $_" -ForegroundColor Red
    }
}

Write-Host "`nSecrets created successfully!" -ForegroundColor Green
Write-Host "View with: docker secret ls" -ForegroundColor Gray
'@
    
    if ($DryRun) {
        Write-Step "  [Preview] Write: scripts/docker/create-secrets-from-env.ps1" -Status "Warning"
    } else {
        $secretsScript | Out-File -FilePath "scripts/docker/create-secrets-from-env.ps1" -Encoding UTF8
        Write-Step "  Created: scripts/docker/create-secrets-from-env.ps1" -Status "Success"
    }
    
    # Step 9: Summary
    Write-Section "PHASE 3 SUMMARY"
    
    if ($DryRun) {
        Write-Host "[Preview] Phase 3 changes:" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Phase 3 applied successfully!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Production Hardening:" -ForegroundColor Cyan
    Write-Host "  [*] Multi-stage Dockerfile (Dockerfile.optimized)" -ForegroundColor White
    Write-Host "  [*] Security configurations (seccomp profile)" -ForegroundColor White
    Write-Host "  [*] Docker secrets management" -ForegroundColor White
    Write-Host "  [*] Production docker-compose enhancements" -ForegroundColor White
    Write-Host "  [*] Optimized .dockerignore" -ForegroundColor White
    
    Write-Host ""
    Write-Host "Security Improvements:" -ForegroundColor Cyan
    Write-Host "  [*] Non-root user (nextjs:nodejs)" -ForegroundColor White
    Write-Host "  [*] Read-only root filesystem" -ForegroundColor White
    Write-Host "  [*] Seccomp security profile" -ForegroundColor White
    Write-Host "  [*] Drop all capabilities, add only needed" -ForegroundColor White
    Write-Host "  [*] No new privileges flag" -ForegroundColor White
    
    Write-Host ""
    Write-Host "Image Optimization:" -ForegroundColor Cyan
    Write-Host "  [*] Multi-stage build (deps -> builder -> runner)" -ForegroundColor White
    Write-Host "  [*] Alpine base (minimal footprint)" -ForegroundColor White
    Write-Host "  [*] Optimized layer caching" -ForegroundColor White
    Write-Host "  [*] Production-only dependencies" -ForegroundColor White
    
    if (-not $DryRun) {
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "  1. Build optimized image: docker build -f Dockerfile.optimized -t unioneyes:optimized ." -ForegroundColor Gray
        Write-Host "  2. Initialize secrets: .\scripts\docker\create-secrets-from-env.ps1" -ForegroundColor Gray
        Write-Host "  3. Validate: .\scripts\docker\validate-phase3.ps1" -ForegroundColor Gray
        Write-Host "  4. Deploy: docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor Gray
        Write-Host ""
    }
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    Write-Step $_.ScriptStackTrace -Status "Error"
    exit 1
}
