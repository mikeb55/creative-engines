@echo off
setlocal EnableDelayedExpansion
REM Repo root = two levels up from scripts\
cd /d "%~dp0..\..\.."

set "OUT=C:\Users\mike\Documents\Mike Composer Files\Guitar-Bass Duos"
set "PROG_A=Dm9|Bbmaj7#11|Fmaj7/A|Ebmaj9|Gm11|C13sus|Fmaj9|A7alt"
set "PROG_B=Cmaj7/B|Bbmaj9|E7sus4|Am9|Dbsus|Gbmaj7#11|Abmaj9|Ebmaj7"

set PASS=0
set FAIL=0

REM 9 runs: seeds x progressions x modes per TASK spec (runs 7-9 repeat 1-3 with prog A)
call npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/sweep.ts --seeds 312853305 --progression "!PROG_A!" --mode stable --out "!OUT!"
if errorlevel 1 (set /a FAIL+=1) else (set /a PASS+=1)
call npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/sweep.ts --seeds 312856655 --progression "!PROG_A!" --mode balanced --out "!OUT!"
if errorlevel 1 (set /a FAIL+=1) else (set /a PASS+=1)
call npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/sweep.ts --seeds 283331063 --progression "!PROG_A!" --mode surprise --out "!OUT!"
if errorlevel 1 (set /a FAIL+=1) else (set /a PASS+=1)
call npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/sweep.ts --seeds 312853305 --progression "!PROG_B!" --mode stable --out "!OUT!"
if errorlevel 1 (set /a FAIL+=1) else (set /a PASS+=1)
call npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/sweep.ts --seeds 312856655 --progression "!PROG_B!" --mode balanced --out "!OUT!"
if errorlevel 1 (set /a FAIL+=1) else (set /a PASS+=1)
call npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/sweep.ts --seeds 283331063 --progression "!PROG_B!" --mode surprise --out "!OUT!"
if errorlevel 1 (set /a FAIL+=1) else (set /a PASS+=1)
call npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/sweep.ts --seeds 312853305 --progression "!PROG_A!" --mode stable --out "!OUT!"
if errorlevel 1 (set /a FAIL+=1) else (set /a PASS+=1)
call npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/sweep.ts --seeds 312856655 --progression "!PROG_A!" --mode balanced --out "!OUT!"
if errorlevel 1 (set /a FAIL+=1) else (set /a PASS+=1)
call npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/sweep.ts --seeds 283331063 --progression "!PROG_A!" --mode surprise --out "!OUT!"
if errorlevel 1 (set /a FAIL+=1) else (set /a PASS+=1)

echo.
echo %PASS% / 9 passed
if %FAIL% gtr 0 exit /b 1
exit /b 0
