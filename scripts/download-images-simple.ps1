# UnionEyes Image Download Script - Simple Version
# Downloads curated images from Unsplash and unDraw

Write-Host "`n🎨 UnionEyes Image Download Script" -ForegroundColor Magenta
Write-Host "==================================`n" -ForegroundColor Magenta

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
function Get-Image {
    param([string]$Url, [string]$OutFile)
    try {
        Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
        Write-Host "✓ Downloaded: $(Split-Path $OutFile -Leaf)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ Failed: $(Split-Path $OutFile -Leaf) - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Hero image
Write-Host "`n📸 Downloading Hero Image..." -ForegroundColor Yellow
$totalDownloads++
$heroPath = Join-Path $imagesDir "hero\hero-teamwork.jpg"
if (Get-Image -Url "https://images.unsplash.com/photo-Oalh2MojUuk?w=1920&q=90&fm=jpg&fit=crop" -OutFile $heroPath) {
    $successfulDownloads++
}

# Testimonial avatars
Write-Host "`n👤 Downloading Testimonial Avatars..." -ForegroundColor Yellow

$avatars = @(
    @{id="rDEOVtE7vOs"; name="avatar-maria.jpg"},
    @{id="WNoLnJo7tS8"; name="avatar-james.jpg"},
    @{id="mEZ3PoFGs_k"; name="avatar-lisa.jpg"},
    @{id="6anudmpILw4"; name="avatar-david.jpg"},
    @{id="IF9TK5Uy-KI"; name="avatar-sarah.jpg"}
)

foreach ($avatar in $avatars) {
    $totalDownloads++
    $path = Join-Path $imagesDir "testimonials\$($avatar.name)"
    $url = "https://images.unsplash.com/photo-$($avatar.id)?w=400&q=90&fm=jpg&fit=crop"
    if (Get-Image -Url $url -OutFile $path) {
        $successfulDownloads++
    }
    Start-Sleep -Milliseconds 500
}

# Background
Write-Host "`n🎨 Downloading Background Image..." -ForegroundColor Yellow
$totalDownloads++
$bgPath = Join-Path $imagesDir "backgrounds\pattern-subtle.jpg"
if (Get-Image -Url "https://images.unsplash.com/photo-jLwVAUtLOAQ?w=1920&q=90&fm=jpg&fit=crop" -OutFile $bgPath) {
    $successfulDownloads++
}

# Feature illustrations from unDraw
Write-Host "`n🎭 Downloading Feature Illustrations..." -ForegroundColor Yellow

$illustrations = @(
    @{name="claims"; id="file_manager"},
    @{name="voting"; id="democracy"},
    @{name="tracking"; id="real_time_sync"},
    @{name="transparency"; id="security_on"},
    @{name="mobile"; id="mobile_app"},
    @{name="support"; id="support"}
)

foreach ($illust in $illustrations) {
    $totalDownloads++
    $path = Join-Path $imagesDir "features\$($illust.name).svg"
    $url = "https://undraw.co/api/illustrations/$($illust.id).svg"
    if (Get-Image -Url $url -OutFile $path) {
        $successfulDownloads++
    }
    Start-Sleep -Milliseconds 300
}

# Summary
Write-Host ""
Write-Host "📊 Download Summary" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta
Write-Host "Total images: $totalDownloads" -ForegroundColor White
Write-Host "Successful: $successfulDownloads" -ForegroundColor Green
Write-Host "Failed: $($totalDownloads - $successfulDownloads)" -ForegroundColor $(if ($successfulDownloads -eq $totalDownloads) {"Green"} else {"Red"})
Write-Host ""

if ($successfulDownloads -eq $totalDownloads) {
    Write-Host "✓ All images downloaded successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠ Some downloads failed. Re-run to retry." -ForegroundColor Yellow
}

Write-Host ""
