# scripts/start.ps1 - Start Flavoriz backend and open in browser
$ErrorActionPreference = 'SilentlyContinue'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot "Recipe-Portal\backend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         Flavoriz Recipe Portal         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if port 5000 is already listening
$conn = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    Write-Host "[OK] Backend server is already running on port 5000." -ForegroundColor Green
} else {
    Write-Host "[...] Starting Flavoriz backend in background..." -ForegroundColor Yellow
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $backendDir -WindowStyle Hidden

    # Wait for server to be ready
    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 600
        $check = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
        if ($check) {
            $ready = $true
            break
        }
    }

    if ($ready) {
        Write-Host "[OK] Backend started successfully on port 5000!" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Server is starting up. Launching browser..." -ForegroundColor Yellow
    }
}

Write-Host "[...] Opening Flavoriz in your browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5000"

Write-Host ""
Write-Host "All set! You can close this window at any time." -ForegroundColor DarkGray
Start-Sleep -Seconds 2
