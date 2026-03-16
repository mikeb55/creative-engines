# Open file in default application (Sibelius for .musicxml)
# Usage: powershell -ExecutionPolicy Bypass -File open_in_default_app.ps1 "path\to\file.musicxml"
param([string]$FilePath = $args[0])
if (-not $FilePath -or -not (Test-Path -LiteralPath $FilePath)) {
  Write-Error "File not found: $FilePath"
  exit 1
}
Invoke-Item -LiteralPath $FilePath
exit 0
