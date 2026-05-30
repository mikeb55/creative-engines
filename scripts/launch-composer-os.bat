@echo off
REM Composer OS — local dev launcher (Electron desktop app).
REM Runs npm run desktop:dev from apps/composer-os-desktop (build + electron .).
setlocal
cd /d "%~dp0\.."
if not exist "apps\composer-os-desktop\package.json" (
  echo ERROR: apps\composer-os-desktop\package.json not found.
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
echo Composer OS — Electron desktop dev
echo Repository: %CD%
echo Command:    npm run desktop:dev --prefix apps/composer-os-desktop
echo.
echo Leave this window open while Electron runs. Press Ctrl+C to stop.
echo.

npm run desktop:dev --prefix apps/composer-os-desktop
set "ERR=%ERRORLEVEL%"
if not "%ERR%"=="0" (
  echo.
  echo Launcher exited with code %ERR%.
  pause
)
exit /b %ERR%
