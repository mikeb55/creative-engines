#requires -Version 5.1
<#!
  safe-rebuild-portable.ps1
  Safe portable packaging: fail if Composer-OS.exe is running; verify release/Composer-OS.exe
  actually changes on disk after `npm run desktop:package-no-bump`.

  Exit: 0 = build OK and replacement verified; 1 = process running, build failed, missing exe, or mtime unchanged.
#>
param(
  [string] $NpmBuildScript = 'desktop:package-no-bump',
  [switch] $NoProcessCheck
)

$ErrorActionPreference = 'Stop'

$DesktopRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ReleaseDir = Join-Path $DesktopRoot "release"
$PkgPath = Join-Path $DesktopRoot "package.json"
$ExeName = "Composer-OS.exe"
$ExePath = Join-Path $ReleaseDir $ExeName

function Write-Packaging { param([string] $Message) Write-Host ('[Packaging] ' + $Message) }

function Get-PackageVersion {
  if (-not (Test-Path -LiteralPath $PkgPath)) { return "n/a" }
  try {
    $j = Get-Content -LiteralPath $PkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($null -ne $j.version) { return [string]$j.version }
  } catch { }
  return "n/a"
}

function Get-PortExeProcesses {
  $list = @()
  try {
    $raw = Get-CimInstance -ClassName Win32_Process -Filter "Name = '$ExeName'" -ErrorAction SilentlyContinue
  } catch {
    $raw = $null
  }
  if ($null -ne $raw) { if ($raw -is [Array]) { $list = $raw } else { $list = @($raw) } }
  return $list
}

function Get-ExeMetadata {
  param([string] $Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $item = Get-Item -LiteralPath $Path
  $ver = "unknown"
  try {
    $vi = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($Path)
    if ($null -ne $vi.FileVersion -and $vi.FileVersion.Trim() -ne "") { $ver = $vi.FileVersion }
    elseif ($null -ne $vi.ProductVersion -and $vi.ProductVersion.Trim() -ne "") { $ver = $vi.ProductVersion }
  } catch { }
  return [PSCustomObject]@{
    FullName = $item.FullName
    Length   = $item.Length
    Modified = $item.LastWriteTime
    Version  = $ver
  }
}

$pkgVBefore = Get-PackageVersion

# --- 1) Running process? ---
if (-not $NoProcessCheck) {
  $running = Get-PortExeProcesses
  if ($running.Count -gt 0) {
    Write-Packaging "Composer-OS.exe is currently running. Close it first."
    foreach ($p in $running) {
      $id = $p.ProcessId
      $ph = if ($p.ExecutablePath) { $p.ExecutablePath } else { "(path unavailable; close PID $id)" }
      Write-Host ('  [Packaging] Process ID: ' + $id)
      Write-Host ('  [Packaging] Path: ' + $ph)
    }
    exit 1
  }
}

# --- 2) Old .exe + package.json version (expected in-app until next version bump) ---
$old = Get-ExeMetadata -Path $ExePath
if ($null -ne $old) {
  Write-Packaging "Old .exe: $($old.Length) bytes, $($old.Modified.ToString('o')), file version: $($old.Version) | package.json: $pkgVBefore"
} else {
  Write-Packaging ('Old .exe: (none) — not found at ' + $ExePath + ' | package.json: ' + $pkgVBefore)
}

# --- 3) Build ---
Set-Location -LiteralPath $DesktopRoot
Write-Packaging "Running: npm run $NpmBuildScript  (from $DesktopRoot) ..."
# Use cmd /c so "npm" is not split incorrectly by PowerShell in some environments (Unknown command "pm").
cmd /c "npm run $NpmBuildScript"
$code = $LASTEXITCODE
if ($null -eq $code) { $code = 0 }
if ($code -ne 0) {
  Write-Host ""
  Write-Packaging "Build failed (exit code $code). Not verifying release/$ExeName."
  Write-Packaging "Status: FAIL"
  exit 1
}

# --- 4) Post-build ---
if (-not (Test-Path -LiteralPath $ExePath)) {
  Write-Host ""
  Write-Packaging "Build reported success but release/$ExeName does not exist."
  Write-Packaging "Status: FAIL"
  exit 1
}

$new = Get-ExeMetadata -Path $ExePath
$pkgVAfter = Get-PackageVersion
$status = "SUCCESS"
$wa = @()

if ($null -ne $old) {
  if ($new.Modified -eq $old.Modified) {
    Write-Host ""
    Write-Packaging "Build exit 0, but the portable .exe last-write time is unchanged."
    Write-Host "  old mtime: $($old.Modified.ToString('o'))  new: $($new.Modified.ToString('o'))"
    Write-Packaging "Build succeeded but .exe was not replaced (locked?)"
    Write-Packaging "Status: FAIL"
    exit 1
  }
  if ($new.Length -eq $old.Length -and $new.Version -eq $old.Version) {
    $status = "WARN"
    $wa += "Same size and file version as pre-build; mtime advanced. Confirm a meaningful build."
  }
} else {
  $wa += "no prior $ExeName; first write to release/."
}

$sizeDelta = if ($null -ne $old) { $new.Length - $old.Length } else { 0 }
$ago = (Get-Date) - $new.Modified
$agoS = if ($ago.TotalSeconds -lt 2) { "just now" } elseif ($ago.TotalMinutes -lt 2) { [string]([math]::Round($ago.TotalSeconds)) + "s ago" } else { [string]([math]::Floor($ago.TotalMinutes)) + "m ago" }

Write-Host ""
Write-Packaging "New .exe: $($new.Length) bytes, $($new.Modified.ToString('o')), file version: $($new.Version) | package.json: $pkgVAfter"
if ($null -ne $old) {
  Write-Packaging "Delta: size change = $sizeDelta bytes vs old file; last write was $agoS (relative to this check)"
} else {
  Write-Packaging "Delta: n/a (no old file). mtime: $($new.Modified.ToString('o')) ($agoS)"
}
foreach ($w in $wa) { Write-Host ('[Packaging] Note: ' + $w) }
Write-Packaging "Status: $status"
if ($status -eq "FAIL") { exit 1 }
if ($status -eq "WARN") { exit 0 }

# --- 5) Manual steps ---
Write-Host ""
Write-Packaging "To verify manually:"
Write-Host '  1) Check Properties on release/Composer-OS.exe — date modified and version.'
Write-Host '  2) Open the new exe; use in-app Help or About for the version you expect.'
Write-Host '  3) Validate the code or UX change you just packaged.'
Write-Host '  4) Always close a running portable before the next build so the file is not locked.'
exit 0
