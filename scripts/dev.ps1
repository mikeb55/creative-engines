# Kill anything on ports 3001, 5173, 5174, 5175, 5176
$ports = @(3001, 5173, 5174, 5175, 5176)
foreach ($port in $ports) {
  $portPid = (netstat -ano | findstr ":$port " | Select-String "LISTENING" |
    ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
  if ($portPid) {
    taskkill /PID $portPid /F 2>$null
    Write-Host "Killed PID $portPid on port $port"
  }
}

# Launch dev
cd C:\Dev\composer-os\apps\composer-os-app
npm run dev
