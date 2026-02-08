#!/usr/bin/env pwsh
# Apply withApiAuth to remaining unprotected API routes

$ErrorActionPreference = "Stop"

Write-Host "🔒 Applying withApiAuth to remaining API routes..." -ForegroundColor Cyan
Write-Host ""

$filesModified = 0

# Helper function to add import if missing
function Add-WithApiAuthImport {
    param([string]$filePath)
    
    $content = Get-Content $filePath -Raw
    if ($content -notmatch "withApiAuth") {
        Write-Host "   Adding withApiAuth import to: $filePath" -ForegroundColor Yellow
        $content = $content -replace "(import.*from\s+['""]next/server['""];)", "`$1`nimport { withApiAuth } from '@/lib/api-auth-guard';"
        Set-Content $filePath -Value $content -NoNewline
        return $true
    }
    return $false
}

# Helper function to wrap export async function with withApiAuth
function Wrap-FunctionWithAuth {
    param([string]$filePath, [string]$method)
    
    $content = Get-Content $filePath -Raw
    
    # Pattern: export async function METHOD(
    $pattern = "export async function $method\("
    $replacement = "export const $method = withApiAuth(async ("
    
    if ($content -match [regex]::Escape($pattern)) {
        Write-Host "   Wrapping $method in: $filePath" -ForegroundColor Yellow
        $content = $content -replace [regex]::Escape($pattern), $replacement
        
        # Find and fix the closing brace - add ); after the last }
        # This is a simplified approach - may need manual verification
        $content = $content -replace "}\s*$", "});"
        
        Set-Content $filePath -Value $content -NoNewline
        return $true
    }
    return $false
}

# Files to process
$routes = @(
    @{ Path = "app\api\communications\polls\[pollId]\route.ts"; Methods = @("GET", "PUT", "DELETE") },
    @{ Path = "app\api\communications\polls\[pollId]\vote\route.ts"; Methods = @("POST") },
    @{ Path = "app\api\communications\surveys\route.ts"; Methods = @("GET", "POST") },
    @{ Path = "app\api\communications\surveys\[surveyId]\route.ts"; Methods = @("GET", "PUT", "DELETE") },
    @{ Path = "app\api\communications\surveys\[surveyId]\export\route.ts"; Methods = @("GET") },
    @{ Path = "app\api\communications\surveys\[surveyId]\responses\route.ts"; Methods = @("POST") },
    @{ Path = "app\api\communications\surveys\[surveyId]\results\route.ts"; Methods = @("GET") }
)

foreach ($route in $routes) {
    $filePath = Join-Path $PSScriptRoot ".." $route.Path
    
    if (Test-Path $filePath) {
        Write-Host "Processing: $($route.Path)" -ForegroundColor Cyan
        
        # Add import
        $importAdded = Add-WithApiAuthImport $filePath
        
        # Wrap each method
        foreach ($method in $route.Methods) {
            $wrapped = Wrap-FunctionWithAuth $filePath $method
            if ($wrapped) {
                $filesModified++
            }
        }
        
        Write-Host "   ✅ Complete" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  File not found: $filePath" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Handle GraphQL separately (special case)
Write-Host "Processing GraphQL route..." -ForegroundColor Cyan
$graphqlPath = Join-Path $PSScriptRoot ".." "app\api\graphql\route.ts"
if (Test-Path $graphqlPath) {
    $content = Get-Content $graphqlPath -Raw
    
    if ($content -notmatch "withApiAuth") {
        Write-Host "   GraphQL uses custom yoga handler - adding auth wrapper" -ForegroundColor Yellow
        
        # Add import
        $content = $content -replace '(import.*from\s+[''"]next/server[''"];)', "`$1`r`nimport { withApiAuth } from '@/lib/api-auth-guard';"
        
        # Wrap the yoga handlers with auth check
        $content = $content -replace 'export \{ yoga as GET, yoga as POST \};', 'export const GET = withApiAuth(async (req, context) => { return yoga.fetch(req, context); });' + "`r`nexport const POST = withApiAuth(async (req, context) => { return yoga.fetch(req, context); });"
        
        Set-Content $graphqlPath -Value $content -NoNewline
        $filesModified++
        Write-Host "   ✅ GraphQL wrapped" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  GraphQL already has auth" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "✅ Script complete!" -ForegroundColor Green
Write-Host "   Files modified: $filesModified" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run scanner: pnpm tsx scripts/scan-api-auth.ts" -ForegroundColor White
Write-Host "2. Review any TypeScript errors: pnpm tsc --noEmit" -ForegroundColor White
Write-Host "3. Test routes manually" -ForegroundColor White
Write-Host ""
