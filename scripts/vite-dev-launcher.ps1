# Streams `npm run dev` for apps/composer-os-app, opens the browser once when Vite prints a Local URL.
# Invoked from launch-composer-os.bat — do not hard-code a Vite port.

param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot
)

Set-Location -LiteralPath $RepoRoot
$ErrorActionPreference = 'Continue'

$opened = $false
$hintPrinted = $false
$lineCount = 0

Write-Host ''
Write-Host 'Composer OS — local dev'
Write-Host "Repository: $RepoRoot"
Write-Host 'Command:    npm run dev --prefix apps/composer-os-app'
Write-Host 'Browser:    opens automatically when Vite prints its Local: URL (any port).'
Write-Host 'API:        http://localhost:3001 (Composer OS app API; unchanged).'
Write-Host ''
Write-Host 'Leave this window open while the dev servers run. Press Ctrl+C to stop.'
Write-Host ''

# Match e.g. "Local:   http://localhost:5174/" or "[0]   ➜  Local:   http://localhost:5173/"
$localUrlRegex = '(https?://localhost:\d+/)'

try {
  & npm.cmd run dev --prefix apps/composer-os-app *>&1 | ForEach-Object {
    $lineCount++
    $line = if ($null -eq $_) { '' } elseif ($_ -is [string]) { $_ } else { $_.ToString() }
    Write-Host $line

    if (-not $opened -and $line -match $localUrlRegex) {
      $opened = $true
      $url = $Matches[1]
      try {
        Start-Process -FilePath $url
      }
      catch {
        Write-Host "Could not open browser automatically: $($_.Exception.Message)"
        Write-Host "Open this URL manually: $url"
      }
    }
    elseif (-not $opened -and -not $hintPrinted -and $lineCount -ge 200) {
      $hintPrinted = $true
      Write-Host ''
      Write-Host 'If your browser did not open, find the line that contains Local: and http://localhost — use that URL.'
      Write-Host ''
    }
  }
}
finally {
  if (-not $opened -and $lineCount -gt 0) {
    Write-Host ''
    Write-Host 'No Vite Local URL was detected in this output. If the servers are running, open the http://localhost URL from the log above.'
    Write-Host ''
  }
}

exit $LASTEXITCODE
