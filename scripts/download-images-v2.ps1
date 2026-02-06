# UnionEyes Image Download Script
# Downloads curated images from Unsplash and unDraw

Write-Host ""
Write-Host "🎨 UnionEyes Image Download Script" -ForegroundColor Magenta
Write-Host "===================================" -ForegroundColor Magenta
Write-Host ""

$baseDir = $PSScriptRoot
$imagesDir = Join-Path $baseDir ".." "public" "images"

$totalDownloads = 0
$successfulDownloads = 0

# Check directory
if (-not (Test-Path $imagesDir)) {
    Write-Host "✗ Images directory not found: $imagesDir" -ForegroundColor Red
    exit 1
}

# Download function
function Get-WebImage {
    param([string]$Url, [string]$OutFile)
    
    $result = $false
    try {
        Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing -ErrorAction Stop
        Write-Host "✓ Downloaded: $(Split-Path $OutFile -Leaf)" -ForegroundColor Green
        $result = $true
    }
    catch {
        Write-Host "✗ Failed: $(Split-Path $OutFile -Leaf)" -ForegroundColor Red
    }
    
    return $result
}

# Hero image
Write-Host ""
Write-Host "📸 Downloading Hero Image..." -ForegroundColor Yellow
$totalDownloads = $totalDownloads + 1
$heroPath = Join-Path $imagesDir "hero" "hero-teamwork.jpg"
if (Get-WebImage -Url "https://images.unsplash.com/photo-Oalh2MojUuk?w=1920&q=90&fm=jpg&fit=crop" -OutFile $heroPath) {
    $successfulDownloads = $successfulDownloads + 1
}

# Testimonial avatars
Write-Host ""
Write-Host "👤 Downloading Testimonial Avatars..." -ForegroundColor Yellow

$avatars = @(
    @{id="rDEOVtE7vOs"; name="avatar-maria.jpg"},
    @{id="WNoLnJo7tS8"; name="avatar-james.jpg"},
    @{id="mEZ3PoFGs_k"; name="avatar-lisa.jpg"},
    @{id="6anudmpILw4"; name="avatar-david.jpg"},
    @{id="IF9TK5Uy-KI"; name="avatar-sarah.jpg"}
)

foreach ($avatar in $avatars) {
    $totalDownloads = $totalDownloads + 1
    $path = Join-Path $imagesDir "testimonials" $avatar.name
    $url = "https://images.unsplash.com/photo-$($avatar.id)?w=400&q=90&fm=jpg&fit=crop"
    if (Get-WebImage -Url $url -OutFile $path) {
        $successfulDownloads = $successfulDownloads + 1
    }
    Start-Sleep -Milliseconds 500
}

# Background
Write-Host ""
Write-Host "🎨 Downloading Background Image..." -ForegroundColor Yellow
$totalDownloads = $totalDownloads + 1
$bgPath = Join-Path $imagesDir "backgrounds" "pattern-subtle.jpg"
if (Get-WebImage -Url "https://images.unsplash.com/photo-jLwVAUtLOAQ?w=1920&q=90&fm=jpg&fit=crop" -OutFile $bgPath) {
    $successfulDownloads = $successfulDownloads + 1
}

# Feature illustrations from unDraw
Write-Host ""
Write-Host "🎭 Downloading Feature Illustrations..." -ForegroundColor Yellow

$illustrations = @(
    @{name="claims"; id="file_manager"},
    @{name="voting"; id="democracy"},
    @{name="tracking"; id="real_time_sync"},
    @{name="transparency"; id="security_on"},
    @{name="mobile"; id="mobile_app"},
    @{name="support"; id="support"}
)

foreach ($illust in $illustrations) {
    $totalDownloads = $totalDownloads + 1
    $path = Join-Path $imagesDir "features" "$($illust.name).svg"
    $url = "https://undraw.co/api/illustrations/$($illust.id).svg"
    if (Get-WebImage -Url $url -OutFile $path) {
        $successfulDownloads = $successfulDownloads + 1
    }
    Start-Sleep -Milliseconds 300
}

# Create ATTRIBUTIONS file
$attributionsPath = Join-Path $imagesDir "ATTRIBUTIONS.md"
$attributionsContent = @"
# Image Attributions

## Hero Section
- Photo by Headway on Unsplash (https://unsplash.com/@headwayio)

## Testimonial Avatars
- Professional photos from various Unsplash photographers

## Feature Illustrations
- From unDraw by Katerina Limpitsouni (https://undraw.co)
- Open source, free to use

## Licenses
All images use permissive licenses suitable for commercial use.
"@

Set-Content -Path $attributionsPath -Value $attributionsContent

# Summary
Write-Host ""
Write-Host "📊 Download Summary" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta
Write-Host "Total images: $totalDownloads" -ForegroundColor White
Write-Host "Successful: $successfulDownloads" -ForegroundColor Green
Write-Host "Failed: $($totalDownloads - $successfulDownloads)" -ForegroundColor Yellow
Write-Host ""

if ($successfulDownloads -eq $totalDownloads) {
    Write-Host "✓ All images downloaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Test the marketing pages at http://localhost:3001" -ForegroundColor White
    Write-Host "2. Review images in public/images/" -ForegroundColor White
}

if ($successfulDownloads -lt $totalDownloads) {
    Write-Host "⚠ Some downloads failed. Re-run to retry." -ForegroundColor Yellow
}

Write-Host ""
