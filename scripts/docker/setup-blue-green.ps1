#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup blue-green deployment automation

.DESCRIPTION
    Creates enhanced blue-green docker-compose config and deployment scripts
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message, [string]$Status = "Info")
    $colors = @{ Success = "Green"; Warning = "Yellow"; Error = "Red"; Info = "Cyan" }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $colors[$Status]
}

# Enhanced blue-green compose with health checks
$blueGreenCompose = @'
version: '3.8'

services:
  # Blue environment
  app-blue:
    build:
      context: .
      dockerfile: Dockerfile.optimized
    container_name: unioneyes-app-blue
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - COLOR=blue
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4g
        reservations:
          cpus: '2'
          memory: 2g
    networks:
      - app
    depends_on:
      postgres:
        condition: service_healthy

  # Green environment
  app-green:
    build:
      context: .
      dockerfile: Dockerfile.optimized
    container_name: unioneyes-app-green
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - COLOR=green
    ports:
      - "3001:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4g
        reservations:
          cpus: '2'
          memory: 2g
    networks:
      - app
    depends_on:
      postgres:
        condition: service_healthy

  # Load balancer (nginx)
  loadbalancer:
    image: nginx:alpine
    container_name: unioneyes-loadbalancer
    ports:
      - "80:80"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/nginx/upstream.conf:/etc/nginx/conf.d/upstream.conf:ro
    restart: unless-stopped
    networks:
      - app
    depends_on:
      - app-blue
      - app-green

  postgres:
    image: pgvector/pgvector:pg16
    container_name: unioneyes-postgres
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app

networks:
  app:
    driver: bridge

volumes:
  postgres_data:

'@

# Nginx configuration for load balancing
$nginxConfig = @'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        include /etc/nginx/conf.d/upstream.conf;
    }

    server {
        listen 80;
        
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Health check support
            proxy_next_upstream error timeout http_500 http_502 http_503 http_504;
            proxy_connect_timeout 5s;
            proxy_send_timeout 10s;
            proxy_read_timeout 10s;
        }
        
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}

'@

# Default to blue environment
$upstreamBlue = @'
server app-blue:3000 max_fails=3 fail_timeout=30s;

'@

# Deployment script
$deployScript = @'
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Blue-green deployment automation

.DESCRIPTION
    Deploys new version with zero downtime
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("blue", "green")]
    [string]$TargetColor,
    
    [switch]$Rollback
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message, [string]$Status = "Info")
    $colors = @{ Success = "Green"; Warning = "Yellow"; Error = "Red"; Info = "Cyan" }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $colors[$Status]
}

function Get-CurrentColor {
    $upstream = Get-Content "config/nginx/upstream.conf" -Raw
    if ($upstream -match "app-blue") { return "blue" }
    if ($upstream -match "app-green") { return "green" }
    return $null
}

function Switch-Traffic {
    param([string]$Color)
    
    $upstream = "server app-${Color}:3000 max_fails=3 fail_timeout=30s;`n"
    $upstream | Out-File -FilePath "config/nginx/upstream.conf" -Encoding UTF8 -NoNewline
    
    # Reload nginx
    docker exec unioneyes-loadbalancer nginx -s reload
    Write-Step "Traffic switched to $Color" -Status "Success"
}

function Test-HealthCheck {
    param([string]$Color, [int]$Port)
    
    Write-Step "Running health checks on $Color environment..." -Status "Info"
    
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Step "Health check passed" -Status "Success"
                return $true
            }
        } catch {
            $attempt++
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Step "Health check failed after $maxAttempts attempts" -Status "Error"
    return $false
}

function Run-SmokeTests {
    param([int]$Port)
    
    Write-Step "Running smoke tests..." -Status "Info"
    
    $tests = @(
        @{ Url = "http://localhost:$Port/"; Name = "Homepage" }
        @{ Url = "http://localhost:$Port/api/health"; Name = "Health endpoint" }
    )
    
    foreach ($test in $tests) {
        try {
            $response = Invoke-WebRequest -Uri $test.Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Step "[OK] $($test.Name)" -Status "Success"
            } else {
                Write-Step "[FAIL] $($test.Name)" -Status "Error"
                return $false
            }
        } catch {
            Write-Step "[FAIL] $($test.Name): $_" -Status "Error"
            return $false
        }
    }
    
    return $true
}

try {
    Write-Host "`n=== BLUE-GREEN DEPLOYMENT ===" -ForegroundColor Cyan
    
    # Determine current and target colors
    $currentColor = Get-CurrentColor
    Write-Step "Current active: $currentColor" -Status "Info"
    
    if (-not $TargetColor) {
        $TargetColor = if ($currentColor -eq "blue") { "green" } else { "blue" }
    }
    
    Write-Step "Target environment: $TargetColor" -Status "Info"
    
    if ($Rollback) {
        Write-Step "Performing rollback..." -Status "Warning"
        Switch-Traffic $currentColor
        exit 0
    }
    
    $targetPort = if ($TargetColor -eq "blue") { 3000 } else { 3001 }
    $serviceName = "app-$TargetColor"
    
    # Step 1: Build and start target environment
    Write-Step "Building and starting $TargetColor environment..." -Status "Info"
    docker-compose -f docker-compose.blue-green.yml up -d $serviceName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Step "Failed to start $TargetColor environment" -Status "Error"
        exit 1
    }
    
    # Step 2: Wait for healthy status
    Write-Step "Waiting for container to be healthy..." -Status "Info"
    Start-Sleep -Seconds 10
    
    $healthy = Test-HealthCheck -Color $TargetColor -Port $targetPort
    if (-not $healthy) {
        Write-Step "Deployment aborted - health checks failed" -Status "Error"
        docker-compose -f docker-compose.blue-green.yml stop $serviceName
        exit 1
    }
    
    # Step 3: Run smoke tests
    $smokeTestsPassed = Run-SmokeTests -Port $targetPort
    if (-not $smokeTestsPassed) {
        Write-Step "Deployment aborted - smoke tests failed" -Status "Error"
        docker-compose -f docker-compose.blue-green.yml stop $serviceName
        exit 1
    }
    
    # Step 4: Switch traffic
    Write-Step "Switching traffic to $TargetColor..." -Status "Warning"
    Switch-Traffic $TargetColor
    
    # Step 5: Monitor for 30 seconds
    Write-Step "Monitoring for 30 seconds..." -Status "Info"
    Start-Sleep -Seconds 30
    
    $finalHealth = Test-HealthCheck -Color $TargetColor -Port $targetPort
    if (-not $finalHealth) {
        Write-Step "Post-deployment check failed, rolling back..." -Status "Error"
        Switch-Traffic $currentColor
        exit 1
    }
    
    # Step 6: Stop old environment
    Write-Step "Stopping $currentColor environment..." -Status "Info"
    docker-compose -f docker-compose.blue-green.yml stop "app-$currentColor"
    
    Write-Step "Deployment complete!" -Status "Success"
    Write-Step "Active environment: $TargetColor" -Status "Success"
    Write-Host "`nTo rollback, run: pwsh scripts/deploy-blue-green.ps1 -Rollback`n" -ForegroundColor Gray
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    Write-Step "Rolling back..." -Status "Warning"
    if ($currentColor) {
        Switch-Traffic $currentColor
    }
    exit 1
}

'@

try {
    # Create nginx config directory
    $nginxDir = "config/nginx"
    if (-not (Test-Path $nginxDir)) {
        New-Item -ItemType Directory -Path $nginxDir -Force | Out-Null
    }
    
    # Write blue-green compose
    $blueGreenCompose | Out-File -FilePath "docker-compose.blue-green.yml" -Encoding UTF8
    Write-Step "Created docker-compose.blue-green.yml" -Status "Success"
    
    # Write nginx config
    $nginxConfig | Out-File -FilePath (Join-Path $nginxDir "nginx.conf") -Encoding UTF8
    Write-Step "Created nginx config" -Status "Success"
    
    # Write default upstream (blue)
    $upstreamBlue | Out-File -FilePath (Join-Path $nginxDir "upstream.conf") -Encoding UTF8
    Write-Step "Created upstream config (default: blue)" -Status "Success"
    
    # Write deployment script
    $scriptDir = "scripts/deployment"
    if (-not (Test-Path $scriptDir)) {
        New-Item -ItemType Directory -Path $scriptDir -Force | Out-Null
    }
    $deployScript | Out-File -FilePath (Join-Path $scriptDir "deploy-blue-green.ps1") -Encoding UTF8
    Write-Step "Created deployment automation script" -Status "Success"
    
    Write-Step "Blue-green deployment setup complete" -Status "Success"
    Write-Step "To deploy, run: pwsh scripts/deployment/deploy-blue-green.ps1" -Status "Info"
    Write-Step "To rollback, run: pwsh scripts/deployment/deploy-blue-green.ps1 -Rollback" -Status "Info"
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    exit 1
}
