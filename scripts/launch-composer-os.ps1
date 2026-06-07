param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [int[]]$Ports = @(5173, 3001),
  [string]$DevCommand = "npm run dev --prefix apps/composer-os-app",
  [int]$WaitSeconds = 10
)

$ErrorActionPreference = "Stop"

function Get-PortPids {
  param([int]$Port)
  $pids = @()
  try {
    $tcp = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
    if ($tcp) { $pids += $tcp }
  } catch {}
  $pids | Where-Object { $_ -and $_ -ne 0 } | Select-Object -Unique
}

function Stop-Pids {
  param([int[]]$Pids)
  foreach ($p in ($Pids | Select-Object -Unique)) {
    try {
      $proc = Get-Process -Id $p -ErrorAction Stop
      Write-Host "Stopping PID $p ($($proc.ProcessName))" -ForegroundColor Yellow
      Stop-Process -Id $p -Force -ErrorAction Stop
    } catch {}
  }
}

function Stop-PortOccupants {
  param([int[]]$Ports)
  $allPids = @()
  foreach ($port in $Ports) {
    $pids = Get-PortPids -Port $port
    if ($pids.Count -gt 0) {
      Write-Host "Port $port occupied by PID(s): $($pids -join ', ')" -ForegroundColor Cyan
      $allPids += $pids
    } else {
      Write-Host "Port $port is free" -ForegroundColor Green
    }
  }
  if ($allPids.Count -gt 0) { Stop-Pids -Pids ($allPids | Select-Object -Unique) }
}

function Stop-LikelyLaunchers {
  param([string]$RepoRoot)
  $norm = $RepoRoot.ToLower()
  $candidates = Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -match '^(node|cmd|powershell|pwsh|npm|npx)\.exe$' -and
      $_.CommandLine -ne $null -and
      ($_.CommandLine.ToLower().Contains($norm) -or
       $_.CommandLine -like "*vite*" -or
       $_.CommandLine -like "*3001*" -or
       $_.CommandLine -like "*5173*" -or
       $_.CommandLine -like "*composer-os*")
    }
  foreach ($proc in $candidates) {
    try {
      if ($proc.ProcessId -ne $PID) {
        Write-Host "Stopping launcher PID $($proc.ProcessId) [$($proc.Name)]" -ForegroundColor DarkYellow
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      }
    } catch {}
  }
}

function Wait-ForPortsFree {
  param([int[]]$Ports, [int]$TimeoutSeconds = 10)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $busy = @()
    foreach ($port in $Ports) {
      $pids = Get-PortPids -Port $port
      if ($pids.Count -gt 0) { $busy += $port }
    }
    if ($busy.Count -eq 0) { return $true }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)
  Write-Host "Ports still busy: $($busy -join ', ')" -ForegroundColor Red
  return $false
}

Write-Host "== Composer OS dev launcher ==" -ForegroundColor Magenta
Write-Host ""

Write-Host "[1/4] Killing processes on ports $($Ports -join ', ')..." -ForegroundColor White
Stop-PortOccupants -Ports $Ports

Write-Host "[2/4] Killing likely respawners..." -ForegroundColor White
Stop-LikelyLaunchers -RepoRoot $RepoRoot

Write-Host "[3/4] Waiting for ports to clear..." -ForegroundColor White
if (-not (Wait-ForPortsFree -Ports $Ports -TimeoutSeconds $WaitSeconds)) {
  throw "Ports did not clear. A supervisor is still respawning processes."
}

Write-Host "[4/4] Launching dev servers..." -ForegroundColor White
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", $DevCommand
) -WorkingDirectory $RepoRoot

Write-Host ""
Write-Host "Dev servers launching. Open http://localhost:5173 in your browser." -ForegroundColor Green
