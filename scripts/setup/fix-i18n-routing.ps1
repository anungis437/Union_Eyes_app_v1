# PowerShell script to restructure app directory for next-intl routing
# This fixes the French homepage 404 issue

Write-Host "Starting i18n routing restructure..." -ForegroundColor Cyan

# Stop any running dev servers
Write-Host "Stopping any running Node processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null
Start-Sleep -Seconds 2

# Navigate to app directory
$appDir = "d:\APPS\union-claims-standalone\UnionEyes\app"
Set-Location $appDir

Write-Host "Current directory: $appDir" -ForegroundColor Green

# Check if [locale] directory already exists and has content
if (Test-Path "[locale]") {
    Write-Host "[locale] directory exists, cleaning up..." -ForegroundColor Yellow
    
    # Move everything back out first
    Get-ChildItem "[locale]" -Directory | ForEach-Object {
        Write-Host "  Moving $($_.Name) back to app root..." -ForegroundColor Gray
        Move-Item -Path $_.FullName -Destination ".\$($_.Name)" -Force -ErrorAction SilentlyContinue
    }
    
    # Move layout files back
    if (Test-Path "[locale]\layout.tsx") {
        Write-Host "  Moving layout.tsx back to app root..." -ForegroundColor Gray
        Move-Item -Path "[locale]\layout.tsx" -Destination ".\layout-temp.tsx" -Force -ErrorAction SilentlyContinue
    }
    
    if (Test-Path "[locale]\globals.css") {
        Write-Host "  Moving globals.css back to app root..." -ForegroundColor Gray
        Move-Item -Path "[locale]\globals.css" -Destination ".\globals.css" -Force -ErrorAction SilentlyContinue
    }
    
    # Remove [locale] directory
    Remove-Item "[locale]" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[locale] directory cleaned up" -ForegroundColor Green
}

# Delete corrupted layout.tsx if it exists
if (Test-Path "layout.tsx") {
    Write-Host "Removing corrupted layout.tsx..." -ForegroundColor Yellow
    Remove-Item "layout.tsx" -Force
}

# Create fresh [locale] directory
Write-Host "`nCreating [locale] directory structure..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "[locale]" -Force | Out-Null

# Move all route directories into [locale] (except api)
Write-Host "Moving route directories into [locale]..." -ForegroundColor Cyan
Get-ChildItem -Directory | Where-Object { 
    $_.Name -notin @('[locale]', 'api') 
} | ForEach-Object {
    Write-Host "  Moving $($_.Name)..." -ForegroundColor Gray
    Move-Item -Path $_.FullName -Destination "[locale]\$($_.Name)" -Force
}

# Move or create layout.tsx in [locale]
if (Test-Path "layout-temp.tsx") {
    Write-Host "Moving layout-temp.tsx to [locale]\layout.tsx..." -ForegroundColor Cyan
    Move-Item -Path "layout-temp.tsx" -Destination "[locale]\layout.tsx" -Force
} else {
    Write-Host "Layout file not found, it should already be in [locale]" -ForegroundColor Yellow
}

# Move globals.css to [locale] if it exists
if (Test-Path "globals.css") {
    Write-Host "Moving globals.css to [locale]..." -ForegroundColor Cyan
    Move-Item -Path "globals.css" -Destination "[locale]\globals.css" -Force
}

# Create minimal root layout.tsx
Write-Host "`nCreating minimal root layout.tsx..." -ForegroundColor Cyan
$rootLayoutContent = @"
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
"@

Set-Content -Path "layout.tsx" -Value $rootLayoutContent -Encoding UTF8

Write-Host "`n✅ Directory restructure complete!" -ForegroundColor Green
Write-Host "`nNew structure:" -ForegroundColor Cyan
Write-Host "  app/" -ForegroundColor White
Write-Host "    layout.tsx (minimal wrapper)" -ForegroundColor Gray
Write-Host "    api/ (unchanged)" -ForegroundColor Gray
Write-Host "    [locale]/" -ForegroundColor White
Write-Host "      layout.tsx (main layout with i18n)" -ForegroundColor Gray
Write-Host "      (auth)/" -ForegroundColor Gray
Write-Host "      (marketing)/" -ForegroundColor Gray
Write-Host "      claims/" -ForegroundColor Gray
Write-Host "      dashboard/" -ForegroundColor Gray
Write-Host "      ... (all other routes)" -ForegroundColor Gray

Write-Host "`n🚀 Starting dev server on port 3001..." -ForegroundColor Cyan
Set-Location "d:\APPS\union-claims-standalone\UnionEyes"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\APPS\union-claims-standalone\UnionEyes; pnpm run dev --port 3001"

Write-Host "`n✅ Done! Dev server starting in new window." -ForegroundColor Green
Write-Host "Test the following URLs:" -ForegroundColor Cyan
Write-Host "  http://localhost:3001 (English)" -ForegroundColor White
Write-Host "  http://localhost:3001/fr (French)" -ForegroundColor White
