# scripts/install-autostart.ps1 - Configure auto-start on Windows login
$projectRoot = Split-Path -Parent $PSScriptRoot
$vbsPath = Join-Path $projectRoot "tooling\start-server-hidden.vbs"
$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "Flavoriz-Backend.lnk"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Flavoriz Windows Auto-Start Setup   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    $ws = New-Object -ComObject WScript.Shell
    $shortcut = $ws.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "wscript.exe"
    $shortcut.Arguments = "`"$vbsPath`""
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.WindowStyle = 7
    $shortcut.Description = "Starts Flavoriz backend in background on Windows boot"
    $shortcut.Save()

    Write-Host "[OK] Added to Windows Startup folder: $shortcutPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "[...] Starting Flavoriz server now in background..." -ForegroundColor Yellow
    
    # Start it right now
    Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`"" -WorkingDirectory $projectRoot

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " SUCCESS! Flavoriz is now automated:" -ForegroundColor Green
    Write-Host " 1. The backend server is running in the background." -ForegroundColor White
    Write-Host " 2. It will start automatically every time your PC turns on." -ForegroundColor White
    Write-Host " 3. You never need to start the backend manually again!" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to set up auto-start: $_" -ForegroundColor Red
}

Write-Host ""
