@echo off
setlocal enabledelayedexpansion
set "REPO=C:\Users\mike\Documents\Cursor AI Projects\creative-engines"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "LOGDIR=%REPO%\launchers\logs"
set "LAST_EXPORT=%REPO%\outputs\architecture\last_export.txt"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "TS=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TS=%TS: =0%"
set "LOG=%LOGDIR%\bigband_%TS%.log"

echo [%date% %time%] Big Band Architecture launcher start >> "%LOG%"
if not exist "%NODE_EXE%" (echo ERROR: node.exe not found >> "%LOG%" & goto :fail)

cd /d "%REPO%"
if errorlevel 1 (echo ERROR: Failed to change to repo root. >> "%LOG%" & goto :fail)

"%NODE_EXE%" "%REPO%\node_modules\ts-node\dist\bin.js" --project "%REPO%\tsconfig.json" "%REPO%\scripts\run_engine_desktop.ts" big_band_architecture >> "%LOG%" 2>&1
set "EXIT=%ERRORLEVEL%"
echo EXIT_CODE: %EXIT% >> "%LOG%"

if %EXIT% neq 0 (
  echo ERROR: Big Band Architecture failed. See log: %LOG%
  type "%LOG%"
  pause
  exit /b 1
)

if not exist "%LAST_EXPORT%" (
  echo ERROR: last_export.txt not found >> "%LOG%"
  explorer "%REPO%\outputs\architecture"
  exit /b 0
)

for /f "usebackq delims=" %%a in ("%LAST_EXPORT%") do set "OPEN_PATH=%%a"

if not exist "!OPEN_PATH!" (
  echo ERROR: Export file not found: !OPEN_PATH! >> "%LOG%"
  explorer "%REPO%\outputs\architecture"
  exit /b 0
)

echo OPEN_PATH: !OPEN_PATH! >> "%LOG%"
echo FILE_EXISTS: 1 >> "%LOG%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO%\launchers\open_in_default_app.ps1" "!OPEN_PATH!"
echo OPEN_EXIT: !ERRORLEVEL! >> "%LOG%"
exit /b 0

:fail
echo ERROR: Launcher failed. See log: %LOG%
type "%LOG%"
pause
exit /b 1
