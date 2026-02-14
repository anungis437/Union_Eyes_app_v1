# Quick error count check
$count = (pnpm lint 2>&1 | Select-String -Pattern "no-explicit-any").Count
$fixed = 976 - $count

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan  
Write-Host "  CURRENT EXPLICIT-ANY ERROR COUNT" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Starting: 976" -ForegroundColor White
Write-Host "  Current:  $count" -ForegroundColor $(if ($count -lt 500) {"Green"} elseif ($count -lt 800) {"Yellow"} else {"Red"})
Write-Host "  Fixed:    $fixed" -ForegroundColor Green
Write-Host "  Progress: $([math]::Round(($fixed / 976) * 100, 1))%" -ForegroundColor Cyan
Write-Host "====================================="-ForegroundColor Cyan
Write-Host ""

if ($count -lt 500) {
    Write-Host "🎉 TARGET ACHIEVED! Below 500 errors!" -ForegroundColor Green
} else {
    $remaining = $count - 500
    Write-Host "Still need to fix: $remaining more errors to reach target" -ForegroundColor Yellow
}
