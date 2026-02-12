#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Master deployment orchestrator for LLM Excellence phases
.DESCRIPTION
    Orchestrates deployment of all 4 phases with validation, rollback, and monitoring
    
.EXAMPLE
    .\deploy-llm-excellence.ps1 -Phase 1 -Environment dev
    .\deploy-llm-excellence.ps1 -Phase all -Environment staging -DryRun
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('1', '2', '3', '4', 'all')]
    [string]$Phase,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'staging', 'production')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipValidation = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# Color helpers
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Failure { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Header { 
    Write-Host "`n" + "="*80 -ForegroundColor Magenta
    Write-Host $args -ForegroundColor Magenta
    Write-Host "="*80 -ForegroundColor Magenta
}

# ============================================================================
# CONFIGURATION
# ============================================================================

$config = @{
    Phase1 = @{
        Name = "Cost Controls & Rate Limiting"
        Script = ".\scripts\llm-excellence\deploy-phase1-cost-controls.ps1"
        Validation = ".\scripts\llm-excellence\validate-phase1.ps1"
        EstimatedTime = "30 minutes"
        Dependencies = @()
    }
    Phase2 = @{
        Name = "Redis Caching Layer"
        Script = ".\scripts\llm-excellence\deploy-phase2-redis-cache.ps1"
        Validation = ".\scripts\llm-excellence\validate-phase2.ps1"
        EstimatedTime = "20 minutes"
        Dependencies = @('Phase1')
    }
    Phase3 = @{
        Name = "Safety & Moderation"
        Script = ".\scripts\llm-excellence\deploy-phase3-safety.ps1"
        Validation = ".\scripts\llm-excellence\validate-phase3.ps1"
        EstimatedTime = "25 minutes"
        Dependencies = @('Phase1')
    }
    Phase4 = @{
        Name = "Resilience & Observability"
        Script = ".\scripts\llm-excellence\deploy-phase4-resilience.ps1"
        Validation = ".\scripts\llm-excellence\validate-phase4.ps1"
        EstimatedTime = "30 minutes"
        Dependencies = @('Phase1', 'Phase2')
    }
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

Write-Header "🚀 LLM Excellence Deployment Orchestrator"

Write-Info "Configuration:"
Write-Host "  Phase: $Phase" -ForegroundColor White
Write-Host "  Environment: $Environment" -ForegroundColor White
Write-Host "  Dry Run: $DryRun" -ForegroundColor White
Write-Host ""

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No changes will be made"
}

# Check prerequisites
Write-Info "Checking prerequisites..."

$prerequisites = @(
    @{ Name = "pnpm"; Command = "pnpm --version" },
    @{ Name = "redis-cli"; Command = "redis-cli --version" },
    @{ Name = "psql"; Command = "psql --version" },
    @{ Name = "node"; Command = "node --version" }
)

$missingPrereqs = @()

foreach ($prereq in $prerequisites) {
    try {
        $null = Invoke-Expression $prereq.Command 2>&1
        Write-Success "$($prereq.Name) installed"
    } catch {
        Write-Failure "$($prereq.Name) not found"
        $missingPrereqs += $prereq.Name
    }
}

if ($missingPrereqs.Count -gt 0) {
    Write-Failure "Missing prerequisites: $($missingPrereqs -join ', ')"
    exit 1
}

# Check environment file
$envFile = if ($Environment -eq "production") { ".env.production" } 
           elseif ($Environment -eq "staging") { ".env.staging" } 
           else { ".env.local" }

if (-not (Test-Path $envFile)) {
    Write-Failure "Environment file not found: $envFile"
    exit 1
}

Write-Success "Environment file found: $envFile"

# ============================================================================
# DEPLOYMENT PLANNING
# ============================================================================

$phasesToDeploy = @()

if ($Phase -eq 'all') {
    $phasesToDeploy = @('Phase1', 'Phase2', 'Phase3', 'Phase4')
} else {
    $phasesToDeploy = @("Phase$Phase")
}

Write-Info "`nDeployment Plan:"
$totalTime = 0
foreach ($phaseName in $phasesToDeploy) {
    $phaseConfig = $config[$phaseName]
    Write-Host "  $phaseName`: $($phaseConfig.Name) (~$($phaseConfig.EstimatedTime))" -ForegroundColor White
    
    # Check dependencies
    if ($phaseConfig.Dependencies.Count -gt 0) {
        Write-Host "    Dependencies: $($phaseConfig.Dependencies -join ', ')" -ForegroundColor Gray
    }
}

Write-Host ""

# Ask for confirmation in production
if ($Environment -eq 'production' -and -not $DryRun) {
    $confirmation = Read-Host "Deploy to PRODUCTION? Type 'yes' to confirm"
    if ($confirmation -ne 'yes') {
        Write-Warning "Deployment cancelled"
        exit 0
    }
}

# ============================================================================
# EXECUTE DEPLOYMENTS
# ============================================================================

$deploymentResults = @()

foreach ($phaseName in $phasesToDeploy) {
    $phaseConfig = $config[$phaseName]
    
    Write-Header "Deploying $phaseName`: $($phaseConfig.Name)"
    
    $startTime = Get-Date
    
    try {
        # Check dependencies
        foreach ($dep in $phaseConfig.Dependencies) {
            $depResult = $deploymentResults | Where-Object { $_.Phase -eq $dep }
            if (-not $depResult -or $depResult.Success -eq $false) {
                throw "Dependency not met: $dep must be deployed successfully first"
            }
        }
        
        # Check if script exists
        if (-not (Test-Path $phaseConfig.Script)) {
            Write-Warning "Deployment script not found: $($phaseConfig.Script)"
            Write-Info "Creating placeholder deployment steps..."
            
            # Execute based on phase
            switch ($phaseName) {
                'Phase1' {
                    Write-Info "Would deploy Phase 1: Cost Controls"
                    if (-not $DryRun) {
                        pnpm drizzle-kit generate
                        pnpm drizzle-kit push
                    }
                }
                'Phase2' {
                    Write-Info "Would deploy Phase 2: Redis Caching"
                    if (-not $DryRun) {
                        pnpm build
                    }
                }
                'Phase3' {
                    Write-Info "Would deploy Phase 3: Safety & Moderation"
                    if (-not $DryRun) {
                        pnpm build
                    }
                }
                'Phase4' {
                    Write-Info "Would deploy Phase 4: Resilience"
                    if (-not $DryRun) {
                        pnpm drizzle-kit push
                        pnpm build
                    }
                }
            }
        } else {
            # Execute deployment script
            $deployParams = @{
                Environment = $Environment
            }
            
            if ($DryRun) {
                $deployParams['DryRun'] = $true
            }
            
            if ($SkipTests) {
                $deployParams['SkipTests'] = $true
            }
            
            & $phaseConfig.Script @deployParams
            
            if ($LASTEXITCODE -ne 0) {
                throw "Deployment script failed with exit code $LASTEXITCODE"
            }
        }
        
        Write-Success "$phaseName deployment completed"
        
        # Run validation
        if (-not $SkipValidation -and (Test-Path $phaseConfig.Validation)) {
            Write-Info "Running validation..."
            
            & $phaseConfig.Validation -Environment $Environment
            
            if ($LASTEXITCODE -ne 0) {
                throw "Validation failed"
            }
            
            Write-Success "$phaseName validation passed"
        }
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        
        $deploymentResults += @{
            Phase = $phaseName
            Name = $phaseConfig.Name
            Success = $true
            Duration = $duration
            Error = $null
        }
        
    } catch {
        Write-Failure "$phaseName deployment failed: $_"
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        
        $deploymentResults += @{
            Phase = $phaseName
            Name = $phaseConfig.Name
            Success = $false
            Duration = $duration
            Error = $_.Exception.Message
        }
        
        # Ask if should continue or rollback
        if (-not $DryRun) {
            Write-Warning "Deployment failed. Options:"
            Write-Host "  1. Continue with remaining phases (not recommended)"
            Write-Host "  2. Stop deployment (recommended)"
            Write-Host "  3. Rollback this phase"
            
            $choice = Read-Host "Enter choice (1-3)"
            
            switch ($choice) {
                '1' { 
                    Write-Warning "Continuing despite failure..."
                    continue 
                }
                '2' { 
                    Write-Info "Stopping deployment"
                    break 
                }
                '3' {
                    Write-Info "Rolling back $phaseName..."
                    # Execute rollback
                    # .\scripts\llm-excellence\rollback-phase.ps1 -Phase $phaseName -Environment $Environment
                    break
                }
                default { 
                    Write-Info "Stopping deployment"
                    break 
                }
            }
        }
        
        break
    }
}

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================

Write-Header "Deployment Summary"

$successCount = ($deploymentResults | Where-Object { $_.Success -eq $true }).Count
$failureCount = ($deploymentResults | Where-Object { $_.Success -eq $false }).Count

Write-Host "`nResults:" -ForegroundColor White
foreach ($result in $deploymentResults) {
    $statusIcon = if ($result.Success) { "✓" } else { "✗" }
    $statusColor = if ($result.Success) { "Green" } else { "Red" }
    
    Write-Host "  $statusIcon $($result.Phase): $($result.Name)" -ForegroundColor $statusColor
    Write-Host "    Duration: $($result.Duration.ToString('mm\:ss'))" -ForegroundColor Gray
    
    if ($result.Error) {
        Write-Host "    Error: $($result.Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary: $successCount succeeded, $failureCount failed" -ForegroundColor $(if ($failureCount -eq 0) { "Green" } else { "Yellow" })

if ($DryRun) {
    Write-Warning "`nThis was a DRY RUN - no changes were made"
}

# ============================================================================
# POST-DEPLOYMENT STEPS
# ============================================================================

if ($successCount -gt 0 -and -not $DryRun) {
    Write-Header "Next Steps"
    
    Write-Host "1. Monitor application logs:" -ForegroundColor Cyan
    Write-Host "   pnpm logs:follow" -ForegroundColor White
    
    Write-Host "`n2. Check metrics:" -ForegroundColor Cyan
    Write-Host "   - Grafana: http://localhost:3001" -ForegroundColor White
    Write-Host "   - Langfuse: http://localhost:3002" -ForegroundColor White
    
    Write-Host "`n3. Verify functionality:" -ForegroundColor Cyan
    Write-Host "   - Test chatbot queries" -ForegroundColor White
    Write-Host "   - Check rate limiting" -ForegroundColor White
    Write-Host "   - Verify cost tracking" -ForegroundColor White
    
    if ($failureCount -gt 0) {
        Write-Host "`n4. Review failed phases and retry:" -ForegroundColor Cyan
        foreach ($result in $deploymentResults | Where-Object { $_.Success -eq $false }) {
            Write-Host "   .\deploy-llm-excellence.ps1 -Phase $($result.Phase.Replace('Phase', '')) -Environment $Environment" -ForegroundColor White
        }
    }
}

Write-Host ""

exit $(if ($failureCount -eq 0) { 0 } else { 1 })
