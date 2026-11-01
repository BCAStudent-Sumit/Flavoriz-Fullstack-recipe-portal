# scripts/create-desktop-shortcut.ps1 - Create Desktop icon for 1-click launch
$projectRoot = Split-Path -Parent $PSScriptRoot
$batPath = Join-Path $projectRoot "tooling\Start-Flavoriz.bat"
$desktopDir = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopDir "Flavoriz Recipe Portal.lnk"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Create Flavoriz Desktop Shortcut    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    $ws = New-Object -ComObject WScript.Shell
    $shortcut = $ws.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $batPath
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.Description = "Launch Flavoriz Recipe Portal"
    $shortcut.Save()

    Write-Host "[OK] Desktop shortcut created:" -ForegroundColor Green
    Write-Host "     $shortcutPath" -ForegroundColor White
    Write-Host ""
    Write-Host "You can now double-click 'Flavoriz Recipe Portal' directly on your Desktop!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to create shortcut: $_" -ForegroundColor Red
}

Write-Host ""
