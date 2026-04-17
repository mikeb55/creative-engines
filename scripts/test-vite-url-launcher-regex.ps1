# Minimal check: URL regex matches Vite Local lines (any port) and does not treat "\\" as a URL opener.
$ErrorActionPreference = 'Stop'
$localUrlRegex = '(https?://localhost:\d+/)'

$samples = @(
  '  ➜  Local:   http://localhost:5174/',
  '[0]   ➜  Local:   http://localhost:5173/',
  '  Local:  http://localhost:3000/foo'
)

foreach ($s in $samples) {
  if ($s -notmatch $localUrlRegex) {
    Write-Error "Expected match: $s"
    exit 1
  }
  if ($Matches[1] -notmatch '^https?://localhost:\d+/$') {
    Write-Error "Bad capture: $($Matches[1])"
    exit 1
  }
}

$bad = 'Windows cannot find ''\\''. Check the spelling'
if ($bad -match $localUrlRegex) {
  Write-Error 'Regex should not match error popup text.'
  exit 1
}

Write-Host 'OK: vite URL regex samples and anti-backslash check passed.'
exit 0
