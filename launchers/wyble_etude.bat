@echo off
setlocal
set "REPO=C:\Users\mike\Documents\Cursor AI Projects\creative-engines"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "LOGDIR=%REPO%\launchers\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
echo [BOOT] %date% %time% wyble_etude.bat started >> "%LOGDIR%\bootstrap.log"
set "TS=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TS=%TS: =0%"
set "LOG=%LOGDIR%\wyble_%TS%.log"

echo [%date% %time%] Wyble Etude launcher start >> "%LOG%"
echo CD_INITIAL: %CD% >> "%LOG%"
if not exist "%NODE_EXE%" (echo ERROR: node.exe not found >> "%LOG%" & goto :fail)

cd /d "%REPO%"
if errorlevel 1 (echo ERROR: Failed to change to repo root. >> "%LOG%" & goto :fail)
echo CD_AFTER: %CD% >> "%LOG%"

"%NODE_EXE%" "%REPO%\node_modules\ts-node\dist\bin.js" --project "%REPO%\tsconfig.json" "%REPO%\scripts\run_engine_desktop.ts" jimmy_wyble >> "%LOG%" 2>&1
set "EXIT=%ERRORLEVEL%"
echo EXIT_CODE: %EXIT% >> "%LOG%"

if %EXIT% neq 0 (
  echo ERROR: Wyble Etude Generator failed. See log: %LOG%
  type "%LOG%"
  pause
  exit /b 1
)

REM Open most recent MusicXML in default app (matches Andrew Hill / Wayne Shorter behavior)
for /f "delims=" %%i in ('dir /b /s /o-d "%REPO%\outputs\wyble\*.musicxml" 2^>nul') do (
  start "" "%%i"
  goto :opened
)
REM Fallback: open output folder
start "" "%REPO%\outputs\wyble"
:opened
exit /b 0

:fail
echo ERROR: Launcher failed. See log: %LOG%
type "%LOG%"
pause
exit /b 1
