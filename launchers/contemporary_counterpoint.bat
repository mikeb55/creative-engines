@echo off
cd /d "C:\Users\mike\Documents\Cursor AI Projects\creative-engines"
if errorlevel 1 (
  echo ERROR: Failed to change to repo root.
  pause
  exit /b 1
)
npx ts-node scripts/run_engine_desktop.ts contemporary_counterpoint
if errorlevel 1 (
  echo ERROR: Contemporary Counterpoint failed.
  pause
  exit /b 1
)
echo.
echo SUCCESS. Press any key to close.
pause
