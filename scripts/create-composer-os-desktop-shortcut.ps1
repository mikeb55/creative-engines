# Creates a Desktop shortcut "Composer OS.lnk" that runs scripts\launch-composer-os.bat
# from this repository. Run once per machine (or after moving the repo).
# Usage (from repo root, PowerShell):
#   powershell -ExecutionPolicy Bypass -File .\scripts\create-composer-os-desktop-shortcut.ps1

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptDir
$launcher = Join-Path $scriptDir 'launch-composer-os.bat'

if (-not (Test-Path -LiteralPath $launcher)) {
  Write-Error "Launcher not found: $launcher"
}

$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop 'Composer OS.lnk'

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($lnkPath)
$shortcut.TargetPath = $launcher
$shortcut.WorkingDirectory = $repoRoot
$shortcut.Description = 'Composer OS local dev: npm run dev --prefix apps/composer-os-app (Vite + API). See scripts/launch-composer-os.bat.'
$shortcut.Save()

Write-Host "Created desktop shortcut:"
Write-Host "  $lnkPath"
Write-Host "Target:"
Write-Host "  $launcher"
Write-Host "Working directory:"
Write-Host "  $repoRoot"
