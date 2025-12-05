# Stop Windows Redis Service
# Run this script as Administrator

Write-Host "Stopping Windows Redis service..." -ForegroundColor Yellow

# Try stopping the service
try {
    Stop-Service -Name "Redis" -Force -ErrorAction Stop
    Write-Host "✓ Redis service stopped successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to stop service: $_" -ForegroundColor Red
}

# Try stopping the process directly
try {
    $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    if ($redisProcess) {
        Stop-Process -Id $redisProcess.Id -Force
        Write-Host "✓ Redis process (PID: $($redisProcess.Id)) stopped successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to stop process: $_" -ForegroundColor Red
}

Write-Host "`nChecking port 6379..." -ForegroundColor Yellow
$port6379 = netstat -ano | Select-String ":6379"
if ($port6379) {
    Write-Host $port6379
} else {
    Write-Host "✓ Port 6379 is now free" -ForegroundColor Green
}
