# Runs canonical composer-os-v2 npm scripts and prints PASS/FAIL summary.
# Default: "must stay green" commands only (fast). Use -IncludeRunAll for full `npm test` (slow; may fail — test debt).
#
# Usage (repo root):
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-baseline-composer-os-v2.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-baseline-composer-os-v2.ps1 -IncludeRunAll

param(
  [switch]$IncludeRunAll
)

$ErrorActionPreference = 'Continue'

$repoRoot = Split-Path -Parent $PSScriptRoot
$engineDir = Join-Path $repoRoot 'engines\composer-os-v2'

if (-not (Test-Path -LiteralPath (Join-Path $engineDir 'package.json'))) {
  Write-Error "Not found: engines\composer-os-v2\package.json (expected repo root parent of scripts\)."
  exit 1
}

$mustGreen = @(
  @{ Name = 'test:jest:counterpoint'; Args = @('run', 'test:jest:counterpoint') },
  @{ Name = 'test:duo'; Args = @('run', 'test:duo') },
  @{ Name = 'test:bass'; Args = @('run', 'test:bass') },
  @{ Name = 'test:vocal'; Args = @('run', 'test:vocal') },
  @{ Name = 'test:composer-os-regression'; Args = @('run', 'test:composer-os-regression') }
)

function Invoke-NpmInEngine {
  param([string[]]$NpmArgs)
  $p = Start-Process -FilePath 'npm.cmd' -ArgumentList $NpmArgs -WorkingDirectory $engineDir -Wait -PassThru -NoNewWindow
  return $p.ExitCode
}

Write-Host ''
Write-Host '=== Composer OS V2 — baseline (must stay green) ==='
Write-Host "Directory: $engineDir"
Write-Host ''

$failures = @()
foreach ($item in $mustGreen) {
  Write-Host "Running: npm $($item.Args -join ' ') ..."
  $code = Invoke-NpmInEngine -NpmArgs $item.Args
  $status = if ($code -eq 0) { 'PASS' } else { 'FAIL' }
  Write-Host "  -> $status (exit $code)"
  if ($code -ne 0) { $failures += $item.Name }
  Write-Host ''
}

Write-Host '=== Summary: must-stay-green ==='
if ($failures.Count -eq 0) {
  Write-Host 'All listed commands: PASS — treat new failures on your branch as regressions.'
}
else {
  Write-Host 'FAILED:' ($failures -join ', ')
  Write-Host 'Fix regressions before relying on this baseline.'
}

Write-Host ''
Write-Host 'Full suite (npm test / runAllTests.ts): NOT run by default — known test debt; see docs/TEST_DEBT_COMPOSER_OS_V2.md'

if ($IncludeRunAll) {
  Write-Host ''
  Write-Host '=== npm test (runAllTests) — may take many minutes; exit may be non-zero ==='
  $full = Invoke-NpmInEngine -NpmArgs @('test')
  Write-Host "npm test exit code: $full"
}

Write-Host ''
if ($failures.Count -gt 0) { exit 1 }
exit 0
