# Safe Incremental Schema Fixes with Auto-Rollback
# Processes one file at a time, validates, and auto-reverts if errors increase

param(
    [switch]$DryRun,
    [int]$MaxErrorIncrease = 5  # Allow small increases (sometimes fixing one error reveals another)
)

$ErrorActionPreference = "Stop"

function Get-ErrorCount {
    Write-Host "Counting TypeScript errors..." -ForegroundColor Cyan
    $errors = pnpm exec tsc --noEmit 2>&1 | Select-String "error TS"
    return $errors.Count
}

function Test-FileChanges {
    param([string]$FilePath)
    
    $beforeErrors = Get-ErrorCount
    Write-Host "`n  Baseline errors: $beforeErrors" -ForegroundColor Gray
    
    # Make changes would have been made already by caller
    
    $afterErrors = Get-ErrorCount
    Write-Host "  After change: $afterErrors" -ForegroundColor Gray
    
    $delta = $afterErrors - $beforeErrors
    
    if ($delta -gt $MaxErrorIncrease) {
        Write-Host "  ❌ REGRESSION: +$delta errors (threshold: $MaxErrorIncrease)" -ForegroundColor Red
        return $false
    } elseif ($delta -lt 0) {
        Write-Host "  ✅ IMPROVED: $delta errors" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ⚠️  NEUTRAL: $delta errors (within threshold)" -ForegroundColor Yellow
        return $true
    }
}

# Define file-specific fix patterns with context
$fileFixPatterns = @(
    # HIGH PRIORITY: Import path fixes (19 errors total)
    @{
        File = "components\admin\user-role-select.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = 'from "@/hooks/use-toast"'
                Replace = 'from "@/lib/hooks/use-toast"'
            }
        )
    },
    @{
        File = "components\signatures\signature-request-form.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = 'from "@/hooks/use-toast"'
                Replace = 'from "@/lib/hooks/use-toast"'
            }
        )
    },
    @{
        File = "components\financial\APAgingReport.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = "from '@/hooks/use-toast'"
                Replace = "from '@/lib/hooks/use-toast'"
            }
        )
    },
    @{
        File = "components\financial\BudgetLineItemEditor.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = "from '@/hooks/use-toast'"
                Replace = "from '@/lib/hooks/use-toast'"
            }
        )
    },
    @{
        File = "components\financial\BudgetManager.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = "from '@/hooks/use-toast'"
                Replace = "from '@/lib/hooks/use-toast'"
            }
        )
    },
    @{
        File = "components\financial\ExpenseRequestForm.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = "from '@/hooks/use-toast'"
                Replace = "from '@/lib/hooks/use-toast'"
            }
        )
    },
    @{
        File = "components\financial\ExpenseApprovalQueue.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = "from '@/hooks/use-toast'"
                Replace = "from '@/lib/hooks/use-toast'"
            }
        )
    },
    @{
        File = "components\financial\VendorList.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = "from '@/hooks/use-toast'"
                Replace = "from '@/lib/hooks/use-toast'"
            }
        )
    },
    @{
        File = "components\financial\VendorForm.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = "from '@/hooks/use-toast'"
                Replace = "from '@/lib/hooks/use-toast'"
            }
        )
    },
    @{
        File = "components\ai\ai-chatbot.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = 'from "@/hooks/use-toast"'
                Replace = 'from "@/lib/hooks/use-toast"'
            }
        )
    },
    @{
        File = "components\address\international-address-input.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = 'from "@/hooks/use-toast"'
                Replace = 'from "@/lib/hooks/use-toast"'
            }
        )
    },
    @{
        File = "components\accessibility\accessibility-dashboard.tsx"
        Description = "Fix use-toast import path"
        Patterns = @(
            @{
                Find = 'from "@/hooks/use-toast"'
                Replace = 'from "@/lib/hooks/use-toast"'
            }
        )
    },
    @{
        File = "db\queries\dues-queries.ts"
        Description = "Fix rls-middleware import path"
        Patterns = @(
            @{
                Find = 'from "@/lib/rls-middleware"'
                Replace = 'from "@/lib/db/with-rls-context"'
            }
        )
    },
    @{
        File = "db\queries\claims-queries.ts"
        Description = "Fix rls-middleware import path"
        Patterns = @(
            @{
                Find = 'from "@/lib/rls-middleware"'
                Replace = 'from "@/lib/db/with-rls-context"'
            }
        )
    },
    @{
        File = "db\queries\pending-profiles-queries.ts"
        Description = "Fix rls-middleware import path"
        Patterns = @(
            @{
                Find = 'from "@/lib/rls-middleware"'
                Replace = 'from "@/lib/db/with-rls-context"'
            }
        )
    },
    @{
        File = "db\queries\users-queries.ts"
        Description = "Fix rls-middleware import path"
        Patterns = @(
            @{
                Find = 'from "@/lib/rls-middleware"'
                Replace = 'from "@/lib/db/with-rls-context"'
            }
        )
    },
    @{
        File = "db\queries\profiles-queries.ts"
        Description = "Fix rls-middleware import path"
        Patterns = @(
            @{
                Find = 'from "@/lib/rls-middleware"'
                Replace = 'from "@/lib/db/with-rls-context"'
            }
        )
    },
    @{
        File = "db\queries\organization-queries.ts"
        Description = "Fix rls-middleware import path"
        Patterns = @(
            @{
                Find = 'from "@/lib/rls-middleware"'
                Replace = 'from "@/lib/db/with-rls-context"'
            }
        )
    }
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   Safe Incremental Schema Fixes - Per-File Validation         " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Get baseline
$initialErrors = Get-ErrorCount
Write-Host "`nInitial error count: $initialErrors" -ForegroundColor Cyan
Write-Host "Max error increase threshold per file: $MaxErrorIncrease" -ForegroundColor Gray

if ($DryRun) {
    Write-Host "`n[DRY RUN MODE] - No changes will be made" -ForegroundColor Yellow
}

$stats = @{
    FilesProcessed = 0
    FilesSkipped = 0
    FilesImproved = 0
    FilesReverted = 0
    TotalErrorsFixed = 0
}

foreach ($filePattern in $fileFixPatterns) {
    # Handle special characters in file paths
    $filePath = Join-Path $PSScriptRoot "..\..\$($filePattern.File)"
    $filePath = $filePath -replace '\[', '`[' -replace '\]', '`]'
    
    if (-not (Test-Path -LiteralPath $filePath)) {
        Write-Host "`n[WARNING] File not found: $($filePattern.File)" -ForegroundColor Yellow
        $stats.FilesSkipped++
        continue
    }
    
    if ($filePattern.Skip) {
        Write-Host "`n[SKIP] Skipping: $($filePattern.File)" -ForegroundColor Gray
        Write-Host "   Reason: $($filePattern.Description)" -ForegroundColor Gray
        $stats.FilesSkipped++
        continue
    }
    
    Write-Host "`n[FILE] Processing: $($filePattern.File)" -ForegroundColor White
    Write-Host "   $($filePattern.Description)" -ForegroundColor Gray
    
    # Create backup
    $backupPath = "$filePath.backup"
    Copy-Item -LiteralPath $filePath -Destination $backupPath -Force
    
    $content = Get-Content -LiteralPath $filePath -Raw
    $originalContent = $content
    $changesMade = 0
    
    foreach ($pattern in $filePattern.Patterns) {
        $findPattern = $pattern.Find
        $replacePattern = $pattern.Replace
        
        # Check if pattern exists
        if ($content -match [regex]::Escape($findPattern)) {
            if ($DryRun) {
                $matches = ([regex]::Matches($content, [regex]::Escape($findPattern))).Count
                Write-Host "   Would replace: '$findPattern' → '$replacePattern' ($matches occurrence(s))" -ForegroundColor Yellow
                $changesMade += $matches
            } else {
                $beforeCount = ([regex]::Matches($content, [regex]::Escape($findPattern))).Count
                $content = $content -replace [regex]::Escape($findPattern), $replacePattern
                Write-Host "   Replaced: '$findPattern' → '$replacePattern' ($beforeCount occurrence(s))" -ForegroundColor Green
                $changesMade += $beforeCount
            }
        }
    }
    
    if ($changesMade -eq 0) {
        Write-Host "   No matching patterns found" -ForegroundColor Gray
        Remove-Item $backupPath -Force
        $stats.FilesSkipped++
        continue
    }
    
    if ($DryRun) {
        Write-Host "   [DRY RUN] Would make $changesMade change(s)" -ForegroundColor Yellow
        Remove-Item $backupPath -Force
        $stats.FilesProcessed++
        continue
    }
    
    # Apply changes
    Set-Content -LiteralPath $filePath $content -NoNewline
    Write-Host "   Applied $changesMade change(s)" -ForegroundColor Green
    
    # Validate
    Write-Host "   Validating..." -ForegroundColor Cyan
    $beforeChangeErrors = $initialErrors
    $afterChangeErrors = Get-ErrorCount
    $delta = $afterChangeErrors - $beforeChangeErrors
    
    if ($delta -gt $MaxErrorIncrease) {
        # Revert
        Write-Host "   [REVERT] Error count increased by $delta (threshold: $MaxErrorIncrease)" -ForegroundColor Red
        Copy-Item -LiteralPath $backupPath -Destination $filePath -Force
        Remove-Item -LiteralPath $backupPath -Force
        $stats.FilesReverted++
        
        Write-Host "   Reverted to original state" -ForegroundColor Yellow
    } else {
        # Keep changes
        Remove-Item -LiteralPath $backupPath -Force
        
        if ($delta -lt 0) {
            Write-Host "   [SUCCESS] Fixed $([Math]::Abs($delta)) error(s)" -ForegroundColor Green
            $stats.FilesImproved++
            $stats.TotalErrorsFixed += [Math]::Abs($delta)
            $initialErrors = $afterChangeErrors  # Update baseline
        } elseif ($delta -eq 0) {
            Write-Host "   [NEUTRAL] No error count change" -ForegroundColor Gray
        } else {
            Write-Host "   [ACCEPTED] +$delta errors (within threshold)" -ForegroundColor Yellow
            $initialErrors = $afterChangeErrors  # Update baseline
        }
        
        $stats.FilesProcessed++
    }
}

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "   Summary                                                      " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "`nStarting errors:  $initialErrors" -ForegroundColor Gray
$finalErrors = if ($DryRun) { $initialErrors } else { Get-ErrorCount }
Write-Host "Final errors:     $finalErrors" -ForegroundColor $(if ($finalErrors -lt $initialErrors) { "Green" } else { "Yellow" })
Write-Host "Net change:       $(if ($finalErrors -lt $initialErrors) { '-' } else { '+' })$([Math]::Abs($finalErrors - $initialErrors))" -ForegroundColor $(if ($finalErrors -lt $initialErrors) { "Green" } else { "Yellow" })

Write-Host "`nFiles processed:  $($stats.FilesProcessed)" -ForegroundColor Green
Write-Host "Files improved:   $($stats.FilesImproved)" -ForegroundColor Green
Write-Host "Files reverted:   $($stats.FilesReverted)" -ForegroundColor $(if ($stats.FilesReverted -gt 0) { "Red" } else { "Gray" })
Write-Host "Files skipped:    $($stats.FilesSkipped)" -ForegroundColor Gray

if ($DryRun) {
    Write-Host "`nRun without -DryRun to apply changes" -ForegroundColor Yellow
}
