@echo off
REM Composer OS — local dev launcher (Vite UI + API). Repo root = parent of this scripts\ folder.
setlocal
cd /d "%~dp0\.."
if not exist "apps\composer-os-app\package.json" (
  echo ERROR: apps\composer-os-app\package.json not found.
  echo Working directory: %CD%
  echo Move this repo or fix the shortcut target path.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Install Node.js and ensure npm is on your PATH.
  pause
  exit /b 1
)

echo.
echo Composer OS — local dev
echo Repository: %CD%
echo Command:    npm run dev --prefix apps/composer-os-app
echo UI:         http://localhost:5173
echo API:        http://localhost:3001
echo.
echo Leave this window open while the dev servers run. Press Ctrl+C to stop.
echo.

REM Open default browser after a short delay so Vite can bind first.
start "Composer OS — open browser" /min cmd /c "timeout /t 5 /nobreak >nul && start \"\" \"http://localhost:5173/\""

call npm run dev --prefix apps/composer-os-app
set "ERR=%ERRORLEVEL%"
if not "%ERR%"=="0" (
  echo.
  echo npm exited with code %ERR%.
  pause
)
exit /b %ERR%
