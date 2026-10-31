# scripts/uninstall-autostart.ps1 - Disable auto-start on Windows login
$projectRoot = Split-Path -Parent $PSScriptRoot
$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "Flavoriz-Backend.lnk"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Disable Flavoriz Windows Auto-Start  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $shortcutPath) {
    Remove-Item -Path $shortcutPath -Force
    Write-Host "[OK] Startup shortcut removed successfully." -ForegroundColor Green
} else {
    Write-Host "[INFO] Startup shortcut was not found." -ForegroundColor Gray
}

# Also stop the running server
$stopScript = Join-Path $PSScriptRoot "stop.ps1"
if (Test-Path $stopScript) {
    & $stopScript
}

Write-Host ""
Write-Host "Windows auto-start is now disabled." -ForegroundColor Green
Write-Host ""
