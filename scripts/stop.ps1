# scripts/stop.ps1 - Stop Flavoriz backend server
$ErrorActionPreference = 'SilentlyContinue'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Stopping Flavoriz Backend        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$connections = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue

if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
        Write-Host "[...] Stopping process PID $p on port 5000..." -ForegroundColor Yellow
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] Flavoriz backend server stopped successfully." -ForegroundColor Green
} else {
    Write-Host "[INFO] No server is currently running on port 5000." -ForegroundColor Gray
}

Write-Host ""
Start-Sleep -Seconds 2
