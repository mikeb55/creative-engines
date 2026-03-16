@echo off
cd /d "C:\Users\mike\Documents\Cursor AI Projects\creative-engines"
if errorlevel 1 (
  echo ERROR: Failed to change to repo root.
  pause
  exit /b 1
)
npx ts-node scripts/run_engine_desktop.ts ellington_orchestration
if errorlevel 1 (
  echo ERROR: Ellington Orchestration failed.
  pause
  exit /b 1
)
echo.
echo SUCCESS. Press any key to close.
pause
