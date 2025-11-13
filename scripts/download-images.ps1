# UnionEyes Image Download Script
# Downloads curated royalty-free images from Unsplash for the public marketing site

param(
    [string]$UnsplashAccessKey = $env:UNSPLASH_ACCESS_KEY
)

# Color output functions
function Write-Success { param([string]$message) Write-Host "✓ $message" -ForegroundColor Green }
function Write-Info { param([string]$message) Write-Host "→ $message" -ForegroundColor Cyan }
function Write-Warning { param([string]$message) Write-Host "⚠ $message" -ForegroundColor Yellow }
function Write-ErrorMsg { param([string]$message) Write-Host "✗ $message" -ForegroundColor Red }

$imagesDir = Join-Path $PSScriptRoot ".." "public" "images"

# Curated Unsplash Photo IDs (hand-picked for quality and relevance)
$images = @{
    hero = @{
        id = "Oalh2MojUuk"
        filename = "hero-teamwork.jpg"
        photographer = "Headway"
        alt = "Diverse team of union members collaborating in a modern office"
    }
    
    testimonials = @(
        @{
            id = "rDEOVtE7vOs"
            filename = "avatar-maria.jpg"
            photographer = "Foto Sushi"
            alt = "Maria T., Union Steward"
        },
        @{
            id = "WNoLnJo7tS8"
            filename = "avatar-james.jpg"
            photographer = "Iman Soleimany"
            alt = "James R., Local President"
        },
        @{
            id = "mEZ3PoFGs_k"
            filename = "avatar-lisa.jpg"
            photographer = "Christina @ wocintechchat.com"
            alt = "Lisa K., Union Member"
        },
        @{
            id = "6anudmpILw4"
            filename = "avatar-david.jpg"
            photographer = "Linkedin Sales Navigator"
            alt = "David M., Labor Relations Officer"
        },
        @{
            id = "IF9TK5Uy-KI"
            filename = "avatar-sarah.jpg"
            photographer = "Jake Nackos"
            alt = "Sarah P., Union Secretary"
        }
    )
    
    backgrounds = @(
        @{
            id = "jLwVAUtLOAQ"
            filename = "pattern-subtle.jpg"
            photographer = "Pawel Czerwinski"
            alt = "Subtle background pattern"
        }
    )
}

function Download-UnsplashImage {
    param(
        [string]$PhotoId,
        [string]$OutputPath,
        [string]$Width = "1920",
        [string]$Quality = "90"
    )
    
    $url = "https://images.unsplash.com/photo-$PhotoId`?w=$Width&q=$Quality&fm=jpg&fit=crop"
    
    try {
        Write-Info "Downloading image from Unsplash (ID: $PhotoId)..."
        Invoke-WebRequest -Uri $url -OutFile $OutputPath -UseBasicParsing
        Write-Success "Downloaded: $(Split-Path $OutputPath -Leaf)"
        return $true
    } catch {
        Write-ErrorMsg "Failed to download $PhotoId : $_"
        return $false
    }
}

function Download-UnDrawSVG {
    param(
        [string]$Illustration,
        [string]$OutputPath,
        [string]$PrimaryColor = "6366f1"
    )
    
    $url = "https://undraw.co/api/illustrations/$Illustration.svg"
    
    try {
        Write-Info "Downloading illustration from unDraw: $Illustration..."
        Invoke-WebRequest -Uri $url -OutFile $OutputPath -UseBasicParsing
        Write-Success "Downloaded: $(Split-Path $OutputPath -Leaf)"
        return $true
    } catch {
        Write-ErrorMsg "Failed to download $Illustration : $_"
        return $false
    }
}

Write-Host "`n🎨 UnionEyes Image Download Script" -ForegroundColor Magenta
Write-Host "==================================`n" -ForegroundColor Magenta

# Check if images directory exists
if (-not (Test-Path $imagesDir)) {
    Write-ErrorMsg "Images directory not found: $imagesDir"
    exit 1
}

$totalDownloads = 0
$successfulDownloads = 0

# Download hero image
Write-Host "`n📸 Downloading Hero Images..." -ForegroundColor Yellow
$heroPath = Join-Path $imagesDir "hero" $images.hero.filename
if (Download-UnsplashImage -PhotoId $images.hero.id -OutputPath $heroPath -Width "1920") {
    $successfulDownloads++
}
$totalDownloads++

# Download testimonial avatars
Write-Host "`n👤 Downloading Testimonial Avatars..." -ForegroundColor Yellow
foreach ($testimonial in $images.testimonials) {
    $avatarPath = Join-Path $imagesDir "testimonials" $testimonial.filename
    if (Download-UnsplashImage -PhotoId $testimonial.id -OutputPath $avatarPath -Width "400") {
        $successfulDownloads++
    }
    $totalDownloads++
    Start-Sleep -Milliseconds 500
}

# Download background images
Write-Host "`n🎨 Downloading Background Images..." -ForegroundColor Yellow
foreach ($bg in $images.backgrounds) {
    $bgPath = Join-Path $imagesDir "backgrounds" $bg.filename
    if (Download-UnsplashImage -PhotoId $bg.id -OutputPath $bgPath -Width "1920") {
        $successfulDownloads++
    }
    $totalDownloads++
}

# Download unDraw illustrations for features
Write-Host "`n🎭 Downloading Feature Illustrations..." -ForegroundColor Yellow
$illustrations = @{
    "claims" = "file_manager"
    "voting" = "democracy"
    "tracking" = "real_time_sync"
    "transparency" = "security_on"
    "mobile" = "mobile_app"
    "support" = "support"
}

foreach ($feature in $illustrations.GetEnumerator()) {
    $svgPath = Join-Path $imagesDir "features" "$($feature.Key).svg"
    if (Download-UnDrawSVG -Illustration $feature.Value -OutputPath $svgPath) {
        $successfulDownloads++
    }
    $totalDownloads++
    Start-Sleep -Milliseconds 300
}

# Create attribution file
Write-Host "`n📝 Creating Attribution File..." -ForegroundColor Yellow
$attributionPath = Join-Path $imagesDir "ATTRIBUTIONS.md"
$attributionContent = @"
# Image Attributions

This file contains required attributions for images used in the UnionEyes public site.

## Hero Section

- **Hero Image**: Photo by [$($images.hero.photographer)](https://unsplash.com/@headwayio) on [Unsplash](https://unsplash.com/photos/$($images.hero.id))

## Testimonial Avatars

"@

foreach ($testimonial in $images.testimonials) {
    $attributionContent += "- **$($testimonial.alt)**: Photo by [$($testimonial.photographer)](https://unsplash.com) on [Unsplash](https://unsplash.com/photos/$($testimonial.id))`n"
}

$attributionContent += @"

## Background Images

"@

foreach ($bg in $images.backgrounds) {
    $attributionContent += "- **$($bg.alt)**: Photo by [$($bg.photographer)](https://unsplash.com) on [Unsplash](https://unsplash.com/photos/$($bg.id))`n"
}

$attributionContent += @"

## Feature Illustrations

All feature section illustrations are from [unDraw](https://undraw.co/) by Katerina Limpitsouni.
License: Open source, free to use without attribution (but we appreciate her work!)

## Licenses

- **Unsplash**: All photos are licensed under the [Unsplash License](https://unsplash.com/license)
  - Free to use for commercial and non-commercial purposes
  - No permission needed
  - Attribution appreciated but not required
  
- **unDraw**: Open source illustrations
  - Free to use without attribution
  - Can be customized to match brand colors

## Usage

These images are optimized for web use and should be served through Next.js Image component for best performance.
"@

Set-Content -Path $attributionPath -Value $attributionContent
Write-Success "Created attribution file"

# Summary
Write-Host ""
Write-Host "📊 Download Summary" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta
Write-Host "Total images: $totalDownloads" -ForegroundColor White
Write-Host "Successful: $successfulDownloads" -ForegroundColor Green

$failedCount = $totalDownloads - $successfulDownloads
if ($failedCount -eq 0) {
    Write-Host "Failed: $failedCount" -ForegroundColor Green
    Write-Host ""
    Write-Host "✓ All images downloaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review downloaded images in public/images/" -ForegroundColor White
    Write-Host "2. Test the updated marketing pages" -ForegroundColor White
    Write-Host "3. Check ATTRIBUTIONS.md for licensing details" -ForegroundColor White
} else {
    Write-Host "Failed: $failedCount" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠ Some downloads failed. Check errors above." -ForegroundColor Yellow
    Write-Host "You can re-run this script to retry failed downloads." -ForegroundColor White
}

Write-Host ""
