# Streams `npm run dev` for apps/composer-os-app. When Vite prints a Local URL, prints a framed
# "OPEN THIS IN YOUR BROWSER" block plus numbered Next steps — does NOT launch the browser.
# Invoked from launch-composer-os.bat — do not hard-code a Vite port.

param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot
)

Set-Location -LiteralPath $RepoRoot
$ErrorActionPreference = 'Continue'

$script:urlAnnounced = $false
$script:fallbackPrinted = $false
$script:lineCount = 0
$maxLinesBeforeFallback = 200

Write-Host ''
Write-Host 'Composer OS — local dev'
Write-Host "Repository: $RepoRoot"
Write-Host 'Command:    npm run dev --prefix apps/composer-os-app'
Write-Host 'Browser:    not opened automatically — when Vite prints its Local URL, this script will show OPEN THIS IN YOUR BROWSER below.'
Write-Host 'API:        http://localhost:3001 (Composer OS app API; unchanged).'
Write-Host ''
Write-Host 'Leave this window open while the dev servers run. Press Ctrl+C to stop.'
Write-Host ''

# Match e.g. "Local:   http://localhost:5174/" or "[0]   ➜  Local:   http://localhost:5173/"
$localUrlRegex = '(https?://localhost:\d+/)'

function Print-OpenThisBanner {
  param([string]$Url)
  Write-Host ''
  Write-Host '========================================'
  Write-Host '  OPEN THIS IN YOUR BROWSER:'
  Write-Host ''
  Write-Host "  $Url"
  Write-Host ''
  Write-Host '  Next steps:'
  Write-Host '    1) Copy the URL'
  Write-Host '    2) Paste it into your browser'
  Write-Host '    3) Leave this window open; press Ctrl+C to stop'
  Write-Host '========================================'
  Write-Host ''
}

function Print-FallbackHint {
  Write-Host ''
  Write-Host "Look for a 'Local:  http://localhost:xxxx/' line above and open that in your browser."
  Write-Host ''
}

try {
  & npm.cmd run dev --prefix apps/composer-os-app *>&1 | ForEach-Object {
    $script:lineCount++
    $line = if ($null -eq $_) { '' } elseif ($_ -is [string]) { $_ } else { $_.ToString() }
    Write-Host $line

    if (-not $script:urlAnnounced -and $line -match $localUrlRegex) {
      $script:urlAnnounced = $true
      Print-OpenThisBanner -Url $Matches[1]
    }
    elseif (-not $script:urlAnnounced -and -not $script:fallbackPrinted -and $script:lineCount -ge $maxLinesBeforeFallback) {
      $script:fallbackPrinted = $true
      Print-FallbackHint
    }
  }
}
finally {
  if (-not $script:urlAnnounced -and -not $script:fallbackPrinted -and $script:lineCount -gt 0) {
    Print-FallbackHint
  }
}

exit $LASTEXITCODE
