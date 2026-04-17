@echo off
REM Composer OS — local dev launcher (Vite UI + API). Repo root = parent of this scripts\ folder.
REM Browser opens via scripts\vite-dev-launcher.ps1 when Vite prints its Local: URL (any port).
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

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0vite-dev-launcher.ps1" -RepoRoot "%CD%"
set "ERR=%ERRORLEVEL%"
if not "%ERR%"=="0" (
  echo.
  echo Launcher exited with code %ERR%.
  pause
)
exit /b %ERR%
