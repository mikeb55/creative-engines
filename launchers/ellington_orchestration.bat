@echo off
setlocal
set "REPO=C:\Users\mike\Documents\Cursor AI Projects\creative-engines"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "LOGDIR=%REPO%\launchers\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "TS=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TS=%TS: =0%"
set "LOG=%LOGDIR%\ellington_%TS%.log"

echo [%date% %time%] Ellington Orchestration launcher start >> "%LOG%"
echo CD_INITIAL: %CD% >> "%LOG%"
echo PATH: %PATH% >> "%LOG%"
echo NODE_EXE: %NODE_EXE% >> "%LOG%"
if not exist "%NODE_EXE%" (echo ERROR: node.exe not found at %NODE_EXE% >> "%LOG%" & goto :fail)

cd /d "%REPO%"
if errorlevel 1 (echo ERROR: Failed to change to repo root. >> "%LOG%" & goto :fail)
echo CD_AFTER: %CD% >> "%LOG%"
echo CMD: "%NODE_EXE%" "%REPO%\node_modules\ts-node\dist\bin.js" --project "%REPO%\tsconfig.json" "%REPO%\scripts\run_engine_desktop.ts" ellington_orchestration >> "%LOG%"

"%NODE_EXE%" "%REPO%\node_modules\ts-node\dist\bin.js" --project "%REPO%\tsconfig.json" "%REPO%\scripts\run_engine_desktop.ts" ellington_orchestration >> "%LOG%" 2>&1
set "EXIT=%ERRORLEVEL%"
echo EXIT_CODE: %EXIT% >> "%LOG%"

if %EXIT% neq 0 (
  echo ERROR: Ellington Orchestration failed. See log: %LOG%
  type "%LOG%"
  pause
  exit /b 1
)
echo SUCCESS >> "%LOG%"
type "%LOG%"
echo.
echo SUCCESS. Press any key to close.
pause
exit /b 0

:fail
echo ERROR: Launcher failed. See log: %LOG%
type "%LOG%"
pause
exit /b 1
